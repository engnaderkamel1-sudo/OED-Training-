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
import { Loader2 } from 'lucide-react';
import { auth, db, messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';

const AppContent: React.FC = () => {
  const { user, isLoading, t } = useAppContext();

  React.useEffect(() => {
    if (user && messaging) {
      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const vapidKey = 'BLkYiBtoSBZjrTlPYF2yP5WVndyWBCmOV5b1WPuLRhCn-8F9Rx6F3e7SQIznNQwgEl7m7DoKLoGl2F_lY55OxX4'; 
            const currentToken = await getToken(messaging, { vapidKey });
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

  // Determine active role
  const activeRole = user?.role;

  return (
    <>
      <TopNav />
      <main className="min-h-[calc(100vh-4rem)] bg-gray-50 flex flex-col relative print:bg-white print:min-h-0">
        {isLoading ? (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 bg-opacity-75">
            <Loader2 className="w-12 h-12 text-[#002D62] animate-spin mb-4" />
            <p className="text-[#002D62] font-semibold text-lg animate-pulse">{t('loading') || 'Loading...'}</p>
          </div>
        ) : null}
        
        <div className={`flex-grow transition-opacity duration-300 ${isLoading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
          {!activeRole && <Login />}
          {activeRole === 'trainee' && <TraineeDashboard />}
          {activeRole === 'manager' && <ManagerDashboard />}
          {activeRole === 'admin' && <AdminDashboard />}
          {activeRole === 'supervisor' && <SiteSupervisorDashboard />}
        </div>
      </main>
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
