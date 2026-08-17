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
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
  // ★★★ SMART SESSION TRACKER (Replaces Auto-Logout) ★★★
  // ============================================
  React.useEffect(() => {
    if (!user) return;

    // مدة الخمول: 5 دقائق
    const IDLE_TIMEOUT = 5 * 60 * 1000; 
    let timeoutId: NodeJS.Timeout;
    let isIdle = false;

    // دالة لتسجيل النشاط في قاعدة البيانات بذكاء
    const logSessionActivity = async (actionType: string) => {
      try {
        await addDoc(collection(db, 'activity_logs'), {
          userId: user.id,
          userName: user.name,
          hrCode: user.hrCode,
          role: user.role,
          action: actionType, // 'session_start' أو 'resume_after_idle'
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error logging activity:', error);
      }
    };

    // تسجيل الدخول الأساسي أول مرة يفتح فيها التطبيق
    const hasLoggedInitialStart = sessionStorage.getItem('initial_session_logged');
    if (!hasLoggedInitialStart) {
      logSessionActivity('system_login');
      sessionStorage.setItem('initial_session_logged', 'true');
    }

    // المستخدم دخل في حالة خمول
    const handleBecomeIdle = () => {
      isIdle = true;
      console.log('User is idle. Awaiting next action to start new session.');
    };

    // المستخدم رجع يتفاعل مع التطبيق
    const handleUserActivity = () => {
      if (isIdle) {
        // كان خامل ورجع، نسجل إن دي جلسة جديدة
        isIdle = false;
        logSessionActivity('session_resume');
        
        // إظهار رسالة ترحيب صغيرة (اختياري، يطمنه إن التطبيق متصل)
        import('react-hot-toast').then(({ default: toast }) => {
          toast.success(
            language === 'ar' ? 'مرحباً بعودتك!' : 'Welcome back!',
            { position: 'bottom-center', duration: 2000, style: { background: 'var(--bg-card)', color: 'var(--text-primary)' } }
          );
        });
      }

      // إعادة ضبط العداد
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleBecomeIdle, IDLE_TIMEOUT);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // التطبيق نزل في الخلفية، نعتبره خامل فوراً لتوفير الموارد
        clearTimeout(timeoutId);
        isIdle = true;
      } else {
        // التطبيق رجع للواجهة
        handleUserActivity();
      }
    };

    // مراقبة أحداث الشاشة بـ (Throttling) عشان ما نهلكش الموبايل
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    let lastEventTime = 0;
    
    const throttledActivityHandler = () => {
      const now = Date.now();
      if (now - lastEventTime > 2000) { // نفذ الأكشن كل ثانيتين كحد أقصى
        handleUserActivity();
        lastEventTime = now;
      }
    };

    activityEvents.forEach(evt => window.addEventListener(evt, throttledActivityHandler, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // بدء العداد لأول مرة
    timeoutId = setTimeout(handleBecomeIdle, IDLE_TIMEOUT);

    // تنظيف
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