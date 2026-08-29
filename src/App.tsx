/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AppProvider, useAppContext } from './context';
import { TopNav } from './components/TopNav';
import { Login } from './components/Login';
import { TraineeDashboard } from './components/TraineeDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { SiteSupervisorDashboard } from './components/SiteSupervisorDashboard';
import { Sidebar } from './components/Sidebar';
import { ProfilePage } from './components/ProfilePage';
import { CoursesPage } from './components/CoursesPage';
import { SuggestionsPage } from './components/SuggestionsPage';
import { HandoutRevisionsPage } from './components/HandoutRevisionsPage';
import { ActivityLogsView } from './components/ActivityLogsView'; 
import { Loader2 } from 'lucide-react';
import { auth, db, messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { UpdateNotificationBanner } from './components/UpdateNotificationBanner';
import { QuotaExhaustedBanner } from './components/QuotaExhaustedBanner';
import { GlobalAttendanceAlertBanner } from './components/GlobalAttendanceAlertBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SystemErrorsPage } from './components/SystemErrorsPage';
import { AppIconUpdateModal } from './components/AppIconUpdateModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';

const AppContent: React.FC = () => {
  const { user, isLoading, t, currentView, language, setUser } = useAppContext();
  const [minSplashDone, setMinSplashDone] = useState(false);

  // Guarantee that the dynamic splash screen is visible for at least 3 seconds on app launch
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashDone(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const showAppLoading = isLoading || !minSplashDone;

  // ============================================
  // Notifications Permission
  // ============================================
  React.useEffect(() => {
    if (user && messaging) {
      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const vapidKey = import.meta.env?.VITE_FIREBASE_VAPID_KEY || 'BLkYiBtoSBZjrTlPYF2yP5WVndyWBCmOV5b1WPuLRhCn-8F9Rx6F3e7SQIznNQwgEl7m7DoKLoGl2F_lY55OxX4'; 
            let registration;
            if ('serviceWorker' in navigator) {
              registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            }
            const currentToken = await getToken(messaging, { 
              vapidKey, 
              serviceWorkerRegistration: registration 
            });
            if (currentToken && currentToken !== user.fcmToken) {
              // Store FCM token in protected userSecrets collection (not publicly readable users)
              const secretRef = doc(db, 'userSecrets', user.id);
              await setDoc(secretRef, { fcmToken: currentToken }, { merge: true });
              // Clear any legacy fcmToken from the public users document
              await setDoc(doc(db, 'users', user.id), { fcmToken: null }, { merge: true });
            }
          }
        } catch (error) {
          console.error('Notification permission error:', error);
        }
      };
      requestPermission();
    }
  }, [user]);

  // ============================================
  // Foreground Messages (Toast Notifications)
  // ============================================
  React.useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        if (payload.notification) {
          import('react-hot-toast').then(({ default: toast }) => {
            toast.custom((t) => (
              <div 
                className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium">
                        {payload.notification?.title}
                      </p>
                      <p className="text-sm opacity-80 mt-1">
                        {payload.notification?.body}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l" style={{ borderColor: 'var(--border-color)' }}>
                  <button
                    onClick={() => import('react-hot-toast').then(({ default: toast }) => toast.dismiss(t.id))}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium focus:outline-none"
                    style={{ color: 'var(--oc-gold)' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ));
          });
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // ============================================
  // ★★★ SMART SESSION TRACKER WITH LOCATION ★★★
  // ============================================
  React.useEffect(() => {
    if (!user) return;

    const IDLE_TIMEOUT = 5 * 60 * 1000; 
    let timeoutId: NodeJS.Timeout;
    let isIdle = false;

    // Safe session context without third-party IP leakage
    const fetchUserLocation = async () => {
      try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
        return `Secure Session (${timeZone})`;
      } catch {
        return "Secure Session";
      }
    };

    const logSessionActivity = async (actionType: string) => {
      try {
        const locationStr = await fetchUserLocation();

        await addDoc(collection(db, 'activity_logs'), {
          userId: user.id || 'anonymous',
          userName: user.name || 'User',
          hrCode: user.hrCode || user.id || 'N/A',
          role: user.role || 'trainee',
          action: actionType || 'activity',
          location: locationStr || 'Secure Session', 
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error logging activity:', error);
      }
    };

    const sessionKey = `initial_session_logged_${user.id}`;
    const hasLoggedInitialStart = sessionStorage.getItem(sessionKey);
    if (!hasLoggedInitialStart) {
      logSessionActivity('system_login');
      sessionStorage.setItem(sessionKey, 'true');
    }

    const handleBecomeIdle = () => {
      isIdle = true;
    };

    const handleUserActivity = () => {
      if (isIdle) {
        isIdle = false;
        logSessionActivity('session_resume');
        
        import('react-hot-toast').then(({ default: toast }) => {
          toast.success(
            language === 'ar' ? 'مرحباً بعودتك!' : 'Welcome back!',
            { position: 'bottom-center', duration: 2000, style: { background: 'var(--bg-card)', color: 'var(--text-primary)' } }
          );
        });
      }

      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleBecomeIdle, IDLE_TIMEOUT);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timeoutId);
        isIdle = true;
      } else {
        handleUserActivity();
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    let lastEventTime = 0;
    
    const throttledActivityHandler = () => {
      const now = Date.now();
      if (now - lastEventTime > 2000) { 
        handleUserActivity();
        lastEventTime = now;
      }
    };

    activityEvents.forEach(evt => window.addEventListener(evt, throttledActivityHandler, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    timeoutId = setTimeout(handleBecomeIdle, IDLE_TIMEOUT);

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(evt => window.removeEventListener(evt, throttledActivityHandler));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, language]);

  // ============================================
  // Render
  // ============================================
  const activeRole = user?.role;

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          },
        }}
      />
      <PWAInstallBanner />
      <TopNav />
      <div className="pt-16 flex flex-col">
        <GlobalAttendanceAlertBanner />
        <QuotaExhaustedBanner />
        <UpdateNotificationBanner />
      </div>
      {/* الكلاسات الأساسية للتطبيق */}
      <div className="flex min-h-[calc(100vh-4rem)] relative print:bg-white print:min-h-0 transition-colors duration-300">
        {user && <Sidebar />}
        <main className="flex-1 flex flex-col relative w-full min-w-0">
          <AnimatePresence>
            {showAppLoading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0]"
              >
                <motion.div 
                  initial={{ scale: 0.88, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center p-6 text-center max-w-sm"
                >
                  {/* Dynamic Logo with Rotating Glowing Aura */}
                  <div className="relative mb-6">
                    {/* Pulsing Backlight Ring */}
                    <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-[#FFC000]/40 via-blue-500/20 to-[#002D62]/30 blur-xl animate-pulse -z-10"></div>
                    
                    {/* Spinning Border Ring */}
                    <div className="absolute -inset-1.5 rounded-3xl border-2 border-dashed border-[#FFC000]/70 animate-[spin_8s_linear_infinite] pointer-events-none"></div>

                    {/* Logo Card */}
                    <motion.div 
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-xl border-2 border-white p-1 bg-white"
                    >
                      <img 
                        src="/app-icon.png?v=13.0" 
                        alt="OED-TTMS Logo" 
                        className="w-full h-full object-cover rounded-xl" 
                      />
                    </motion.div>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-[#002D62] tracking-wider mb-1">
                    OED-TTMS
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-600 tracking-wide mb-6">
                    Technical Training Management System
                  </p>

                  {/* Dynamic Loading Progress Bar */}
                  <div className="w-52 h-2 bg-slate-200/80 rounded-full overflow-hidden relative shadow-inner mb-3 border border-slate-300/60">
                    <motion.div 
                      className="h-full rounded-full bg-gradient-to-r from-[#002D62] via-[#FFC000] to-[#002D62]"
                      animate={{ x: [-150, 200] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      style={{ width: "60%" }}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 text-xs font-bold bg-white/80 px-4 py-1.5 rounded-full shadow-xs border border-slate-200">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#002D62]" />
                    <span>{language === 'ar' ? 'جاري تهيئة المنظومة...' : 'Loading System...'}</span>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          
          <motion.div 
            className={`flex-grow transition-opacity duration-300 ${showAppLoading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ErrorBoundary>
              {!user ? (
                <Login />
              ) : currentView === 'profile' ? (
                <ProfilePage />
              ) : currentView === 'suggestions' ? (
                <SuggestionsPage />
              ) : currentView === 'handoutRevisions' ? (
                <HandoutRevisionsPage />
              ) : user.role === 'admin' ? (
                currentView === 'coursesCatalog' ? (
                  <CoursesPage />
                ) : currentView === 'activityLogs' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
                    <ActivityLogsView />
                  </div>
                ) : currentView === 'systemErrors' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
                    <SystemErrorsPage />
                  </div>
                ) : (
                  <AdminDashboard />
                )
              ) : user.role === 'manager' ? (
                <ManagerDashboard />
              ) : user.role === 'supervisor' ? (
                <SiteSupervisorDashboard />
              ) : (
                <TraineeDashboard />
              )}
            </ErrorBoundary>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}