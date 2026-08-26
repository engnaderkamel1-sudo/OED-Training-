import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('oed_current_view');
      localStorage.setItem('oed_current_view', 'dashboard');
    } catch (e) {}
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 border border-amber-300 dark:border-amber-700 shadow-lg">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#002D62] dark:text-white mb-2">
            حدث خطأ أثناء تحميل هذه الصفحة
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-6 max-w-md font-semibold">
            تم ضبط الأمان التلقائي. اضغط على الزر أدناه للعودة فوراً إلى الصفحة الرئيسية وإعادة تشغيل المنظومة بسلاسة.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="cursor-pointer bg-[#002D62] hover:bg-blue-900 text-[#FFC000] font-black px-6 py-3.5 rounded-xl flex items-center gap-2 shadow-xl hover:scale-105 transition-all text-sm"
          >
            <Home size={18} />
            <span>العودة للصفحة الرئيسية (Dashboard)</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
