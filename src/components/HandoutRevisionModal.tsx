import React, { useState } from 'react';
import { useAppContext } from '../context';
import { HandoutIssueType } from '../types';
import { X, Send, BookOpen, FileText, CheckCircle2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

interface HandoutRevisionModalProps {
  initialCourseTitle?: string;
  onClose: () => void;
}

export const HandoutRevisionModal: React.FC<HandoutRevisionModalProps> = ({
  initialCourseTitle = '',
  onClose
}) => {
  const { language, user, courses, addHandoutRevision } = useAppContext();

  const [courseTitle, setCourseTitle] = useState(initialCourseTitle);
  const [pageNumber, setPageNumber] = useState('');
  const [topicOrSection, setTopicOrSection] = useState('');
  const [issueType, setIssueType] = useState<HandoutIssueType>('technical_update');
  const [description, setDescription] = useState('');
  const [proposedCorrection, setProposedCorrection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim() || !description.trim()) {
      alert(language === 'ar' ? 'يرجى اختيار الدورة وكتابة تفاصيل الملاحظة.' : 'Please select a course and provide description.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addHandoutRevision({
        userId: user?.id || 'anonymous',
        userName: user?.name || 'Anonymous Trainee',
        hrCode: user?.hrCode || 'N/A',
        department: user?.department || 'General',
        courseTitle: courseTitle.trim(),
        pageNumber: pageNumber.trim() || undefined,
        topicOrSection: topicOrSection.trim() || undefined,
        issueType,
        description: description.trim(),
        proposedCorrection: proposedCorrection.trim()
      });

      setSubmittedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting handout revision:', err);
      alert('Error: ' + (err.message || 'Failed to submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[99999] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div 
        className="bg-white dark:bg-[#0E1A30] w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] border border-gray-300 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#002D62] text-white flex justify-between items-center shrink-0 border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFC000] text-[#001D42] flex items-center justify-center font-bold shadow-xs">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {language === 'ar' ? 'اقتراح تعديل في المادة التدريبية (Handout)' : 'Handout Revision Suggestion'}
              </h2>
              <p className="text-xs text-blue-200">
                {language === 'ar' ? 'تطوير وتحديث محتوى ومذكرات التدريب' : 'Help us improve course materials & handbooks'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-300 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        {submittedSuccess ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-400 shadow-md animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              {language === 'ar' ? 'تم استلام مقترح التعديل بنجاح!' : 'Revision Submitted Successfully!'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
              {language === 'ar' 
                ? 'شكراً لحرصك وملاحظتك الفنية. تم إرسال التنبيه لإدارة التدريب لمراجعة الكتاب وتحديثه.'
                : 'Thank you for your valuable feedback. The training team has been notified to review and update the materials.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* Course Title Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                📚 {language === 'ar' ? 'اسم الدورة التدريبية' : 'Course Title'} *
              </label>
              {courses && courses.length > 0 ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب أو اختر اسم الدورة...' : 'Enter or select course title...'}
                    list="courseTitlesList"
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#002D62] text-sm"
                  />
                  <datalist id="courseTitlesList">
                    {courses.map((c) => (
                      <option key={c.id} value={c.title} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <input 
                  type="text" 
                  required
                  value={courseTitle} 
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder={language === 'ar' ? 'اسم الدورة التدريبية...' : 'Course Title...'}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#002D62] text-sm"
                />
              )}
            </div>

            {/* Page Number & Topic Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                  📄 {language === 'ar' ? 'رقم الصفحة / الشريحة' : 'Page / Slide Number'}
                </label>
                <input 
                  type="text" 
                  value={pageNumber} 
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: صـ 14 أو Slide 8' : 'e.g. Page 14 or Slide 8'}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                  📑 {language === 'ar' ? 'الموضوع / العنوان الرئيسي' : 'Topic / Section Title'}
                </label>
                <input 
                  type="text" 
                  value={topicOrSection} 
                  onChange={(e) => setTopicOrSection(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: دائرة الهيدروليك' : 'e.g. Hydraulic Circuit'}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Issue Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                🏷️ {language === 'ar' ? 'نوع الملاحظة / التعديل' : 'Type of Revision'} *
              </label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as HandoutIssueType)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm cursor-pointer"
              >
                <option value="technical_update">{language === 'ar' ? '⚙️ معلومة فنية تحتاج تحديث / تصحيح (Technical Correction)' : 'Technical Update / Correction'}</option>
                <option value="missing_info">{language === 'ar' ? '💡 معلومة ناقصة أو مطلوب إضافتها (Missing Info)' : 'Missing Information'}</option>
                <option value="diagram_enhancement">{language === 'ar' ? '🖼️ صورة أو مخطط أو رسم غير واضح (Diagram / Visual)' : 'Diagram / Visual Issue'}</option>
                <option value="typo">{language === 'ar' ? '✏️ خطأ إملائي أو مطبعي (Typo)' : 'Typo / Spelling Error'}</option>
                <option value="other">{language === 'ar' ? '📌 مقترح عام آخر (Other Suggestion)' : 'Other Suggestion'}</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                🔍 {language === 'ar' ? 'تفاصيل الملاحظة أو الخطأ الموجود' : 'Description of Mistake / Missing Point'} *
              </label>
              <textarea 
                rows={3}
                required
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === 'ar' ? 'اشرح ما وجدته في الكتاب (مثلاً: ضغط الزيت المكتوب 180 بار بينما الصحيح في كتالوج الصيانة 210 بار)...' : 'Describe the mistake or missing detail...'}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-medium text-xs outline-none focus:ring-2 focus:ring-[#002D62]"
              />
            </div>

            {/* Proposed Correction */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                ✨ {language === 'ar' ? 'التعديل أو المحتوى المقترح كتابته بدلاً منه' : 'Proposed Correction / Addition'}
              </label>
              <textarea 
                rows={2}
                value={proposedCorrection} 
                onChange={(e) => setProposedCorrection(e.target.value)}
                placeholder={language === 'ar' ? 'اكتب النص أو القيمة الصحيحة المقترحة...' : 'Write the proposed text or correct value...'}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-medium text-xs outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* User Details Box */}
            <div className="p-3 bg-gray-50 dark:bg-[#081220] rounded-xl border border-gray-200 dark:border-slate-800 text-[11px] text-gray-600 dark:text-gray-400 flex items-center justify-between">
              <span>{language === 'ar' ? `المقدم: ${user?.name || 'متدرب'}` : `Submitted by: ${user?.name || 'Trainee'}`} ({user?.hrCode || 'N/A'})</span>
              <span className="font-bold text-[#002D62] dark:text-[#FFC000]">{user?.department || 'OED'}</span>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#002D62] hover:bg-blue-900 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-105 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} className="text-[#FFC000]" />}
                <span>{language === 'ar' ? 'إرسال المقترح للإدارة' : 'Submit Revision'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
