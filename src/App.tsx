/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
import { Loader2 } from 'lucide-react';
import { auth, db, messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
              await updateDoc(userRef, { fcmToken: currentToken });
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
  // ★★★ AUTO LOGOUT AFTER 1 MINUTE INACTIVITY ★★★
  // ============================================
  React.useEffect(() => {
    if (!user) return;

    const INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute
    let timeoutId: NodeJS.Timeout;
    let lastActiveTime = Date.now();
    let isLoggingOut = false;

    const handleLogoutDueToInactivity = async () => {
      if (isLoggingOut) return;
      isLoggingOut = true;

      try {
        await signOut(auth);
      } catch (error) {
        console.error('Logout error:', error);
      }
      
      setUser(null);
      localStorage.removeItem('oed_training_user');
      
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(
          language === 'ar' || navigator.language.startsWith('ar') 
            ? 'تم تسجيل الخروج تلقائياً لعدم النشاط.' 
            : 'You have been automatically logged out due to inactivity.'
        );
      });

      isLoggingOut = false;
    };

    const resetTimer = () => {
      lastActiveTime = Date.now();
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogoutDueToInactivity, INACTIVITY_TIMEOUT);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(handleLogoutDueToInactivity, INACTIVITY_TIMEOUT);
      } else {
        const timePassed = Date.now() - lastActiveTime;
        if (timePassed >= INACTIVITY_TIMEOUT) {
          handleLogoutDueToInactivity();
        } else {
          resetTimer();
        }
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      isLoggingOut = false;
    };
  }, [user, language, setUser]);

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
      {/* تمت إزالة الكلاسات المسؤولة عن الخلفية الغامقة الإجبارية */}
      <div className="flex min-h-[calc(100vh-4rem)] relative print:bg-white print:min-h-0 transition-colors duration-300">
        {user && <Sidebar />}
        <main className="flex-1 flex flex-col relative w-full min-w-0">
          <AnimatePresence>
            {isLoading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-opacity-75"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: 'var(--oc-navy)' }} />
                <p className="font-semibold text-lg animate-pulse" style={{ color: 'var(--oc-navy)' }}>
                  {t('loading') || 'Loading...'}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
          
          <motion.div 
            className={`flex-grow transition-opacity duration-300 ${isLoading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {!activeRole && <Login />}
            {activeRole && currentView === 'profile' && <ProfilePage />}
            {activeRole && currentView === 'coursesCatalog' && <CoursesPage />}
            {activeRole && currentView === 'suggestions' && <SuggestionsPage />}
            {activeRole === 'trainee' && currentView !== 'profile' && currentView !== 'coursesCatalog' && currentView !== 'suggestions' && <TraineeDashboard />}
            {activeRole === 'manager' && currentView !== 'profile' && currentView !== 'coursesCatalog' && currentView !== 'suggestions' && <ManagerDashboard />}
            {activeRole === 'admin' && currentView !== 'profile' && currentView !== 'coursesCatalog' && currentView !== 'suggestions' && <AdminDashboard />}
            {activeRole === 'supervisor' && currentView !== 'profile' && currentView !== 'coursesCatalog' && currentView !== 'suggestions' && <SiteSupervisorDashboard />}
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