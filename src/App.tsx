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

const AppContent: React.FC = () => {
  const { user, isLoading, t, currentView } = useAppContext();

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

  React.useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        if (payload.notification) {
          // Show an alert inside the app
          alert(`${payload.notification.title}\n\n${payload.notification.body}`);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  React.useEffect(() => {
    if (!user) return;

    const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes
    let timeoutId: NodeJS.Timeout;
    let lastActiveTime = Date.now();

    const handleLogoutDueToInactivity = () => {
      setUser(null);
      alert(t('language') === 'ar' || navigator.language.startsWith('ar') 
        ? 'تم تسجيل الخروج تلقائياً لعدم النشاط لمدة 3 دقائق لحماية حسابك.' 
        : 'You have been automatically logged out due to 3 minutes of inactivity.');
    };

    const resetTimer = () => {
      lastActiveTime = Date.now();
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogoutDueToInactivity, INACTIVITY_TIMEOUT);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastActiveTime = Date.now();
      } else {
        // App became visible again: check if 3 minutes have passed
        if (Date.now() - lastActiveTime >= INACTIVITY_TIMEOUT) {
          handleLogoutDueToInactivity();
        } else {
          resetTimer();
        }
      }
    };

    // Events to monitor user activity
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start initial timer
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Determine active role
  const activeRole = user?.role;

  return (
    <>
      <TopNav />
      <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)] relative print:bg-white print:min-h-0">
        {user && <Sidebar />}
        <main className="flex-1 flex flex-col relative w-full min-w-0">
          {isLoading ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 bg-opacity-75">
              <Loader2 className="w-12 h-12 text-[#002D62] animate-spin mb-4" />
              <p className="text-[#002D62] font-semibold text-lg animate-pulse">{t('loading') || 'Loading...'}</p>
            </div>
          ) : null}
          
          <div className={`flex-grow transition-opacity duration-300 ${isLoading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
            {!activeRole && <Login />}
            {activeRole && currentView === 'profile' && <ProfilePage />}
            {activeRole && currentView === 'coursesCatalog' && <CoursesPage />}
            {activeRole && currentView === 'suggestions' && <SuggestionsPage />}
            {activeRole === 'trainee' && currentView !== 'profile' && currentView !== 'coursesCatalog' && currentView !== 'suggestions' && <TraineeDashboard />}
            {activeRole === 'manager' && currentView !== 'profile' && currentView !== 'coursesCatalog' && currentView !== 'suggestions' && <ManagerDashboard />}
            {activeRole === 'admin' && currentView !== 'profile' && currentView !== 'coursesCatalog' && currentView !== 'suggestions' && <AdminDashboard />}
            {activeRole === 'supervisor' && currentView !== 'profile' && currentView !== 'coursesCatalog' && currentView !== 'suggestions' && <SiteSupervisorDashboard />}
          </div>
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
