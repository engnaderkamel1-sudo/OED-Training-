import React from 'react';
import { X, Printer } from 'lucide-react';
import { UpcomingSession } from '../types';

interface QRCodeModalProps {
  session: UpcomingSession;
  onClose: () => void;
  language: 'en' | 'ar';
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ session, onClose, language }) => {
  const handlePrint = () => {
    window.print();
  };

  const qrData = session.id;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] no-print">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="bg-[#002D62] p-4 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {language === 'ar' ? 'رمز الحضور السريع (QR Code)' : 'Attendance QR Code'}
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          <p className="text-center text-gray-600 dark:text-gray-300 mb-6 font-medium">
            {language === 'ar' 
              ? 'اجعل المتدربين يمسحون هذا الكود لتسجيل حضورهم تلقائياً' 
              : 'Have trainees scan this code to automatically register their attendance'}
          </p>

          <div className="bg-white p-4 border-4 border-gray-100 rounded-xl shadow-sm mb-6" id="qr-print-area">
            <img src={qrUrl} alt="Attendance QR" className="w-[250px] h-[250px]" />
          </div>

          <div className="text-center mb-6">
            <h3 className="font-bold text-lg text-[#002D62] dark:text-[#70B2FF]">{session.courseTitle}</h3>
            <p className="text-gray-500 dark:text-gray-400">Session ID: {session.sessionNumber || session.id.substring(0,6)}</p>
          </div>

          <div className="flex gap-4 w-full">
            <button
              onClick={handlePrint}
              className="flex-1 bg-[#FFC000] text-[#002D62] py-3 rounded-lg font-bold hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Printer size={20} />
              {language === 'ar' ? 'طباعة الكود' : 'Print QR'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-white/[0.08] text-gray-800 dark:text-gray-200 py-3 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-white/[0.12] transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #qr-print-area, #qr-print-area * {
            visibility: visible;
          }
          #qr-print-area {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(2);
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
};
