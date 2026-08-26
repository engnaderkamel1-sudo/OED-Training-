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

const AppContent: React.FC = () => {
  const { user, isLoading, t, currentView, language, setUser } = useAppContext();

  // ============================================
  // Notifications Permission
  // ============================================
  React.useEffect(() => {
    if (user && messaging) {
      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const vapidKey = 'BLkYiBtoSBZjrTlPYF2yP5WVndyWBCmOV5b1WPuLRhCn-8F9Rx6F3e7SQIznNQwgEl7m7DoKLoGl2F_lY55OxX4'; 
            let registration;
            if ('serviceWorker' in navigator) {
              registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            }
            const currentToken = await getToken(messaging, { 
              vapidKey, 
              serviceWorkerRegistration: registration 
            });
            if (currentToken && currentToken !== user.fcmToken) {
              const userRef = doc(db, 'users', user.id);
              await setDoc(userRef, { fcmToken: currentToken }, { merge: true });
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

    // --- دالة جلب اللوكيشن المحدثة باستخدام API أقوى ومحاولة بديلة ---
    const fetchUserLocation = async () => {
      try {
        const response = await fetch('https://ipinfo.io/json');
        const data = await response.json();
        if (!data || !data.ip) return "Unknown";
        return `${data.city || 'Unknown City'}, ${data.country || ''} (${data.ip})`;
      } catch (error) {
        console.error("Location fetch failed:", error);
        
        // محاولة بديلة لو الأول فشل (هيجيب الـ IP بس)
        try {
           const backupRes = await fetch('https://api.ipify.org?format=json');
           const backupData = await backupRes.json();
           return `IP Only: ${backupData.ip}`;
        } catch(e) {
           return "Unknown Location";
        }
      }
    };

    const logSessionActivity = async (actionType: string) => {
      try {
        const locationStr = await fetchUserLocation();

        await addDoc(collection(db, 'activity_logs'), {
          userId: user.id,
          userName: user.name,
          hrCode: user.hrCode,
          role: user.role,
          action: actionType,
          location: locationStr, 
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error logging activity:', error);
      }
    };

    const hasLoggedInitialStart = sessionStorage.getItem('initial_session_logged');
    if (!hasLoggedInitialStart) {
      logSessionActivity('system_login');
      sessionStorage.setItem('initial_session_logged', 'true');
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
      <TopNav />
      <GlobalAttendanceAlertBanner />
      <QuotaExhaustedBanner />
      <UpdateNotificationBanner />
      {/* الكلاسات الأساسية للتطبيق */}
      <div className="flex min-h-[calc(100vh-4rem)] relative print:bg-white print:min-h-0 transition-colors duration-300">
        {user && <Sidebar />}
        <main className="flex-1 flex flex-col relative w-full min-w-0">
          <AnimatePresence>
            {isLoading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#001D42]"
              >
                <motion.div 
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center p-6 text-center"
                >
                  <div className="relative mb-5">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl border-2 border-[#FFC000]/60 p-1 bg-white/10 backdrop-blur-md">
                      <img 
                        src="/app-icon.jpg?v=7" 
                        alt="OED-TTMS Logo" 
                        className="w-full h-full object-cover rounded-2xl" 
                      />
                    </div>
                    <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#FFC000] to-blue-400 opacity-40 blur-lg -z-10 animate-pulse"></div>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider mb-1">
                    OED-TTMS
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-[#FFC000] tracking-wide mb-6">
                    Technical Training Management System
                  </p>

                  <div className="flex items-center gap-2 text-white/80 text-xs font-semibold bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                    <Loader2 className="w-4 h-4 animate-spin text-[#FFC000]" />
                    <span>{language === 'ar' ? 'جاري تهيئة المنظومة...' : 'Loading System...'}</span>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          
          <motion.div 
            className={`flex-grow transition-opacity duration-300 ${isLoading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
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
                ) : (
                  <AdminDashboard />
                )
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