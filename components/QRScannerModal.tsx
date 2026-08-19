import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { UpcomingSession } from '../types';

interface QRScannerModalProps {
  onClose: () => void;
  onScanSuccess: (sessionId: string) => void;
  language: 'en' | 'ar';
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ onClose, onScanSuccess, language }) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    // Check if the script loaded
    if (!(window as any).Html5QrcodeScanner) {
      setError(language === 'ar' ? 'فشل تحميل مكتبة المسح. يرجى التأكد من اتصال الإنترنت وإعادة المحاولة.' : 'Failed to load scanner library. Please check your internet connection.');
      return;
    }

    const scanner = new (window as any).Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    
    scannerRef.current = scanner;

    const onScan = (decodedText: string) => {
      // Prevent multiple scans
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      setSuccess(language === 'ar' ? 'تم التقاط الكود بنجاح!' : 'Code scanned successfully!');
      
      setTimeout(() => {
        onScanSuccess(decodedText.trim());
      }, 1000);
    };

    const onScanFailure = (err: any) => {
      // Ignore background scan failures
    };

    scanner.render(onScan, onScanFailure);

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [language, onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="bg-[#002D62] p-4 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {language === 'ar' ? 'تسجيل الحضور' : 'Scan Attendance'}
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {success ? (
            <div className="text-center py-12">
              <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800">{success}</h3>
              <p className="text-gray-500 mt-2">
                {language === 'ar' ? 'جاري تسجيل حضورك...' : 'Recording your attendance...'}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle size={64} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800">{error}</h3>
              <button
                onClick={onClose}
                className="mt-6 bg-[#002D62] text-white px-6 py-2 rounded font-bold"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          ) : (
            <>
              <p className="text-center text-gray-600 mb-4 font-medium">
                {language === 'ar' 
                  ? 'قم بتوجيه الكاميرا نحو كود الحضور الخاص بالدورة' 
                  : 'Point your camera at the session attendance QR code'}
              </p>
              
              <div id="qr-reader" className="w-full overflow-hidden rounded-lg border-2 border-dashed border-gray-300"></div>
              
              <button
                onClick={onClose}
                className="w-full mt-6 bg-gray-200 text-gray-800 py-3 rounded font-bold hover:bg-gray-300 transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
