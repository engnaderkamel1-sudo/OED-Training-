import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Send, Home, Loader2, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isSending: boolean;
  hasSent: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isSending: false,
    hasSent: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private getCurrentUser = () => {
    try {
      const stored = localStorage.getItem('oed_user');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  };

  private handleSendReportAndReturn = async () => {
    if (this.state.isSending) return;
    this.setState({ isSending: true });

    const currentUser = this.getCurrentUser();
    const errorMessage = this.state.error?.message || 'Uncaught Application Error';
    const errorStack = this.state.error?.stack || '';
    const componentStack = this.state.errorInfo?.componentStack || '';

    try {
      // 1. Log to Firestore 'error_reports' collection
      await addDoc(collection(db, 'error_reports'), {
        message: errorMessage,
        stack: errorStack,
        componentStack: componentStack,
        url: window.location.href,
        userName: currentUser?.name || 'Anonymous User',
        userHrCode: currentUser?.hrCode || currentUser?.id || 'N/A',
        userRole: currentUser?.role || 'trainee',
        userId: currentUser?.id || 'anonymous',
        timestamp: serverTimestamp(),
        status: 'open'
      });

      // 2. Trigger Admin Notification in announcements
      await addDoc(collection(db, 'announcements'), {
        title: `🚨 System Error: ${errorMessage.substring(0, 45)}`,
        content: `Error reported by ${currentUser?.name || 'User'} (${currentUser?.hrCode || 'N/A'})\n\nMessage: ${errorMessage}\nPage: ${window.location.pathname}`,
        targetRoles: ['admin'],
        createdAt: serverTimestamp(),
        priority: 'high',
        isBroadcast: false
      });

      this.setState({ hasSent: true });
    } catch (err) {
      console.error('Failed to log error report to Firestore:', err);
    } finally {
      // 3. Reset view and navigate to Home
      setTimeout(() => {
        try {
          localStorage.removeItem('oed_current_view');
          localStorage.setItem('oed_current_view', 'dashboard');
        } catch (e) {}
        window.location.href = window.location.pathname;
      }, 600);
    }
  };

  public render() {
    if (this.state.hasError) {
      const { isSending, hasSent, error } = this.state;

      return (
        <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          {/* Warning Icon */}
          <div className="w-18 h-18 rounded-3xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 border-2 border-amber-300 dark:border-amber-700 shadow-xl">
            <AlertTriangle size={38} className="animate-bounce" />
          </div>

          {/* English Primary Title with Arabic Subtitle */}
          <h2 className="text-2xl sm:text-3xl font-black text-[#002D62] dark:text-white mb-2 tracking-tight">
            There is an error on this page
          </h2>
          <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-3">
            (يوجد خطأ في الصفحة)
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-6 max-w-lg font-medium leading-relaxed">
            An unexpected error occurred while loading this section. Click the button below to automatically submit an error report to the administration and safely return to the home screen.
          </p>

          {/* Technical Error Snippet (Clean) */}
          {error?.message && (
            <div className="w-full max-w-md p-3 mb-6 rounded-xl bg-gray-100 dark:bg-slate-900 border border-gray-300 dark:border-slate-800 text-left font-mono text-[11px] text-red-600 dark:text-red-400 truncate shadow-2xs">
              <span className="font-bold text-gray-500">Error: </span>
              {error.message}
            </div>
          )}

          {/* Action Button: Send Error Report & Return to Home */}
          <button
            type="button"
            onClick={this.handleSendReportAndReturn}
            disabled={isSending}
            className="cursor-pointer bg-[#002D62] hover:bg-blue-900 text-[#FFC000] font-black px-7 py-4 rounded-2xl flex items-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm sm:text-base border-2 border-[#FFC000]/40 disabled:opacity-75"
          >
            {isSending ? (
              <>
                <Loader2 size={20} className="animate-spin text-[#FFC000]" />
                <span>Sending Report & Returning Home...</span>
              </>
            ) : hasSent ? (
              <>
                <CheckCircle2 size={20} className="text-emerald-400" />
                <span>Report Sent! Returning to Dashboard...</span>
              </>
            ) : (
              <>
                <Send size={18} className="text-[#FFC000]" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-left rtl:text-right">
                  <span>Send Error Report & Return to Home</span>
                  <span className="text-xs font-normal text-amber-200">
                    (إرسال تقرير الخطأ والعودة إلى الصفحة الرئيسية)
                  </span>
                </div>
                <Home size={18} className="hidden sm:block text-[#FFC000]" />
              </>
            )}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
