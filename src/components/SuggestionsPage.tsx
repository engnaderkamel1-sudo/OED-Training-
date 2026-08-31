import React, { useState } from 'react';
import { useAppContext } from '../context';
import { Suggestion, SuggestionCategory, SuggestionStatus } from '../types';
import { 
  Lightbulb, Bug, BookOpen, Sparkles, 
  Send, Clock, CheckCircle, XCircle, 
  Search, MessageSquare, AlertCircle, X,
  Mail, ChevronDown, ChevronRight
} from 'lucide-react';

const CATEGORIES: { value: SuggestionCategory; icon: React.FC<any>; color: string; activeColor: string }[] = [
  { value: 'ui',      icon: Sparkles,  color: 'text-sky-700 dark:text-sky-200 bg-sky-50 dark:bg-sky-500/20 border-sky-200 dark:border-sky-500/40', activeColor: 'bg-sky-600 text-white border-sky-600 shadow-sm' },
  { value: 'course',  icon: BookOpen,  color: 'text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/40', activeColor: 'bg-blue-600 text-white border-blue-600 shadow-sm' },
  { value: 'bug',     icon: Bug,       color: 'text-red-700 dark:text-rose-200 bg-red-50 dark:bg-rose-500/20 border-red-200 dark:border-rose-500/40', activeColor: 'bg-rose-600 text-white border-rose-600 shadow-sm' },
  { value: 'general', icon: Lightbulb, color: 'text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40', activeColor: 'bg-[#FFC000] text-[#001D42] border-yellow-500 font-black shadow-sm' },
];

const STATUS_CONFIG: Record<SuggestionStatus, { label_en: string; label_ar: string; color: string; icon: React.FC<any> }> = {
  pending:   { label_en: 'Pending',       label_ar: 'قيد الانتظار', color: 'text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700', icon: Clock },
  reviewing: { label_en: 'Under Review',  label_ar: 'قيد الدراسة', color: 'text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/40',    icon: AlertCircle },
  done:      { label_en: 'Done',          label_ar: 'تم',           color: 'text-emerald-700 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/40', icon: CheckCircle },
  rejected:  { label_en: 'Rejected',      label_ar: 'مرفوض',        color: 'text-red-700 dark:text-rose-200 bg-red-50 dark:bg-rose-500/20 border-red-200 dark:border-rose-500/40',       icon: XCircle },
};

// Message templates for each status change
const MESSAGE_TEMPLATES: Record<SuggestionStatus, { en: string[]; ar: string[] }> = {
  reviewing: {
    en: [
      'Thank you for your suggestion! We have received it and our team is currently reviewing it. We will get back to you soon.',
      'Your feedback is important to us. We are looking into your suggestion and will provide an update shortly.',
      'We appreciate your input. Your suggestion is under review by our team.',
    ],
    ar: [
      'شكراً على اقتراحك! تم استلامه وفريقنا يراجعه حالياً. سنعود إليك قريباً.',
      'ملاحظاتك مهمة بالنسبة لنا. نحن نراجع اقتراحك وسنوفر تحديثاً قريباً.',
      'نقدر مشاركتك. اقتراحك قيد المراجعة من قِبل فريقنا.',
    ],
  },
  done: {
    en: [
      'Great news! Your suggestion has been reviewed and approved. We will work on implementing it. Thank you for helping improve our system!',
      'Your suggestion has been accepted and implemented. Thank you for your valuable feedback!',
      'We are pleased to inform you that your suggestion has been completed. Thanks for contributing to our system improvement!',
    ],
    ar: [
      'أخبار رائعة! تمت مراجعة اقتراحك واعتماده. سنعمل على تطبيقه. شكراً لمساعدتنا في تحسين النظام!',
      'تم قبول اقتراحك وتطبيقه. شكراً على ملاحظاتك القيّمة!',
      'يسعدنا إخبارك بأنه تم الانتهاء من اقتراحك. شكراً لمساهمتك في تحسين النظام!',
    ],
  },
  rejected: {
    en: [
      'Thank you for your suggestion. After careful review, we are unable to implement it at this time. We appreciate your effort and encourage you to share more ideas.',
      'We have reviewed your suggestion and unfortunately it does not align with our current priorities. Thank you for taking the time to share your feedback.',
      'Your suggestion has been reviewed. While we appreciate your input, we have decided not to proceed with it at this time. Please feel free to submit other ideas.',
    ],
    ar: [
      'شكراً على اقتراحك. بعد المراجعة الدقيقة، لا يمكننا تطبيقه في الوقت الحالي. نقدر جهدك ونشجعك على مشاركة المزيد من الأفكار.',
      'راجعنا اقتراحك وللأسف لا يتوافق مع أولوياتنا الحالية. شكراً على وقتك وملاحظاتك.',
      'تمت مراجعة اقتراحك. بينما نقدر مشاركتك، قررنا عدم المضي قدماً به في الوقت الحالي. لا تتردد في تقديم أفكار أخرى.',
    ],
  },
  pending: {
    en: ['Your suggestion has been set back to pending status.'],
    ar: ['تم إعادة اقتراحك إلى حالة الانتظار.'],
  },
};

// Admin Message Modal
const AdminMessageModal: React.FC<{
  suggestion: Suggestion;
  newStatus: SuggestionStatus;
  language: string;
  onSend: (message: string, adminNote: string) => Promise<void>;
  onCancel: () => void;
}> = ({ suggestion, newStatus, language, onSend, onCancel }) => {
  const templates = MESSAGE_TEMPLATES[newStatus][language === 'ar' ? 'ar' : 'en'];
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [adminNote, setAdminNote] = useState(suggestion.adminNote || '');
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);

  const finalMessage = selectedTemplate !== null ? templates[selectedTemplate] : customMsg;
  const statusLabel = language === 'ar' ? STATUS_CONFIG[newStatus].label_ar : STATUS_CONFIG[newStatus].label_en;

  const handleSend = async () => {
    if (!finalMessage.trim()) return;
    setSending(true);
    await onSend(finalMessage, adminNote);
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white dark:bg-[#0F1E36] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-[#002D62] dark:text-white flex items-center gap-2">
              <Mail size={18} className="text-[#FFC000]" />
              {language === 'ar' ? 'إرسال رسالة للمستخدم' : 'Send Message to User'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {suggestion.userName} · {suggestion.hrCode}
              <span className={`ml-2 rtl:mr-2 rtl:ml-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[newStatus].color}`}>
                {statusLabel}
              </span>
            </p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Suggestion preview */}
          <div className="bg-gray-50 dark:bg-[#162744] rounded-xl px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700">
            <span className="font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'الاقتراح: ' : 'Suggestion: '}</span>
            {suggestion.title}
          </div>

          {/* Templates */}
          <div>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1.5 text-sm font-bold text-[#002D62] dark:text-blue-300 mb-2 cursor-pointer"
            >
              {showTemplates ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              {language === 'ar' ? 'قوالب جاهزة' : 'Ready Templates'}
            </button>
            {showTemplates && (
              <div className="space-y-2">
                {templates.map((tpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedTemplate(idx); setCustomMsg(''); }}
                    className={`w-full text-start text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border transition-all leading-relaxed cursor-pointer ${
                      selectedTemplate === idx
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <span className={`inline-block w-5 h-5 rounded-full border mr-2 rtl:ml-2 rtl:mr-0 text-[10px] font-bold flex-shrink-0 align-middle text-center leading-4 ${
                      selectedTemplate === idx ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 dark:border-slate-600'
                    }`}>{idx + 1}</span>
                    {tpl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom message */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
              {language === 'ar' ? '✏️ أو اكتب رسالة مخصصة:' : '✏️ Or write a custom message:'}
            </label>
            <textarea
              value={customMsg}
              onChange={e => { setCustomMsg(e.target.value); setSelectedTemplate(null); }}
              rows={3}
              placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#162744] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
            />
          </div>

          {/* Admin internal note */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
              {language === 'ar' ? '📋 ملاحظة داخلية (اختياري - للأدمن فقط):' : '📋 Internal Note (optional – admin only):'}
            </label>
            <input
              type="text"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder={language === 'ar' ? 'ملاحظة داخلية...' : 'Internal note...'}
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-[#162744] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preview */}
          {finalMessage.trim() && (
            <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 rounded-xl px-4 py-3">
              <p className="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-1">{language === 'ar' ? 'معاينة الرسالة' : 'Message Preview'}</p>
              <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 leading-relaxed font-medium">{finalMessage}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !finalMessage.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#002D62] dark:bg-blue-600 hover:bg-blue-900 dark:hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
            <span>{sending ? '...' : (language === 'ar' ? 'إرسال وتحديث' : 'Send & Update')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const SuggestionsPage: React.FC = () => {
  const { user, suggestions, addSuggestion, updateSuggestion, language, t } = useAppContext() as any;
  const [category, setCategory] = useState<SuggestionCategory>('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  // Admin filter states
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal for admin status change + message
  const [messagingFor, setMessagingFor] = useState<{
    suggestion: Suggestion;
    newStatus: SuggestionStatus;
  } | null>(null);

  // Admin internal note inline editing
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null);

  const isAdmin = user?.role === 'admin';

  // Submissions for trainee
  const mySuggestions = suggestions.filter((s: Suggestion) => s.userId === user?.id || s.hrCode === user?.hrCode);

  // Filtered suggestions for admin
  const adminSuggestions = suggestions.filter((s: Suggestion) => {
    const matchCat = filterCategory === 'all' || s.category === filterCategory;
    const matchStat = filterStatus === 'all' || s.status === filterStatus;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q ||
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.userName.toLowerCase().includes(q) ||
      s.hrCode.toLowerCase().includes(q) ||
      (s.department && s.department.toLowerCase().includes(q));
    return matchCat && matchStat && matchSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await addSuggestion({
        category,
        title: title.trim(),
        description: description.trim(),
      });
      setTitle('');
      setDescription('');
      setCategory('general');
      setSuccessMsg(language === 'ar' ? 'تم إرسال اقتراحك بنجاح!' : 'Suggestion submitted successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error("Suggestion submission error:", err);
      alert(language === 'ar' ? `حدث خطأ أثناء الإرسال: ${err.message || err}` : `Submission error: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusClick = (suggestion: Suggestion, newStatus: SuggestionStatus) => {
    // Open message modal
    setMessagingFor({ suggestion, newStatus });
  };

  const handleSendMessage = async (message: string, adminNote: string) => {
    if (!messagingFor) return;
    const { suggestion, newStatus } = messagingFor;
    await updateSuggestion(suggestion.id, {
      status: newStatus,
      adminMessage: message,
      adminMessageAt: new Date().toISOString(),
      adminNote: adminNote.trim() || undefined,
    });
    setMessagingFor(null);
    setSendSuccess(language === 'ar' ? 'تم تحديث الحالة وإرسال الرسالة بنجاح!' : 'Status updated and message sent!');
    setTimeout(() => setSendSuccess(''), 4000);
  };

  const getCategoryLabel = (cat: SuggestionCategory) => {
    switch (cat) {
      case 'ui':      return t('catUi');
      case 'course':  return t('catCourse');
      case 'bug':     return t('catBug');
      case 'general': return t('catGeneral');
    }
  };

  const StatusBadge = ({ status }: { status: SuggestionStatus }) => {
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${cfg.color}`}>
        <Icon size={12} />
        {language === 'ar' ? cfg.label_ar : cfg.label_en}
      </span>
    );
  };

  const CategoryBadge = ({ cat }: { cat: SuggestionCategory }) => {
    const cfg = CATEGORIES.find(c => c.value === cat)!;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${cfg.color}`}>
        <Icon size={12} />
        {getCategoryLabel(cat)}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* الشريط الذهبي والترحيب على اليمين */}
      <div className="w-full flex items-center justify-end border-b-2 border-[#FFC000] pb-2 mb-2 print:hidden">
        <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 md:hidden ml-auto rtl:ml-0 rtl:mr-auto text-right">
          {language === 'ar' ? '👋 أهلاً بك، ' : '👋 Welcome, '}
          <span className="text-[#002D62] dark:text-[#FFC000] font-black">{user?.name?.split(' ')[0]}</span>
        </p>
      </div>

      {/* Message Modal */}
      {messagingFor && (
        <AdminMessageModal
          suggestion={messagingFor.suggestion}
          newStatus={messagingFor.newStatus}
          language={language}
          onSend={handleSendMessage}
          onCancel={() => setMessagingFor(null)}
        />
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-[#002D62] dark:text-white flex items-center gap-2">
          <MessageSquare size={26} className="text-amber-600 dark:text-[#FFC000]" />
          {t('suggestions')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
          {language === 'ar'
            ? 'شارك اقتراحاتك وملاحظاتك لتطوير وتحسين النظام'
            : 'Share your feedback to help us improve the system'}
        </p>
      </div>

      {/* Send success toast */}
      {sendSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-sm px-4 py-3 rounded-2xl flex items-center gap-2 shadow-sm font-bold">
          <CheckCircle size={17} />
          {sendSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Submit Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#0F1E36] rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-sm p-5 space-y-4">
            <h2 className="text-base font-black text-[#002D62] dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
              <Lightbulb size={20} className="text-amber-600 dark:text-[#FFC000]" />
              {t('newSuggestion')}
            </h2>
            {successMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-bold">
                <CheckCircle size={15} />
                {successMsg}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-2.5">{t('suggestionCategory')}</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected ? cat.activeColor + ' scale-[1.03] shadow-md' : 'border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-[#162744] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{getCategoryLabel(cat.value)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-1.5">{t('suggestionTitle')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder={language === 'ar' ? 'عنوان مختصر...' : 'Brief title...'}
                  className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/80 dark:bg-[#162744] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-1.5">{t('suggestionDescription')}</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  rows={4}
                  placeholder={language === 'ar' ? 'اشرح اقتراحك بالتفصيل...' : 'Describe your suggestion in detail...'}
                  className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/80 dark:bg-[#162744] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !description.trim()}
                className="w-full bg-[#002D62] dark:bg-blue-600 text-white font-black py-3 rounded-xl hover:bg-blue-900 dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
              >
                <Send size={15} />
                <span>{submitting ? '...' : t('submitSuggestion')}</span>
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Suggestions List */}
        <div className="lg:col-span-2 space-y-4">
          {isAdmin ? (
            <>
              {/* Admin: Filters */}
              <div className="bg-white dark:bg-[#0F1E36] rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[150px]">
                  <Search size={15} className="absolute left-3.5 rtl:right-3.5 rtl:left-auto top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                    className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-3 py-2 text-xs sm:text-sm border border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-[#162744] text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-[#162744] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none font-bold">
                  <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
                  <option value="pending">{t('statusPending')}</option>
                  <option value="reviewing">{t('statusReviewing')}</option>
                  <option value="done">{t('statusDone')}</option>
                  <option value="rejected">{t('statusRejected')}</option>
                </select>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-[#162744] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none font-bold">
                  <option value="all">{language === 'ar' ? 'كل التصنيفات' : 'All Categories'}</option>
                  <option value="ui">{t('catUi')}</option>
                  <option value="course">{t('catCourse')}</option>
                  <option value="bug">{t('catBug')}</option>
                  <option value="general">{t('catGeneral')}</option>
                </select>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-black ml-auto rtl:mr-auto rtl:ml-0">
                  {adminSuggestions.length} {language === 'ar' ? 'نتيجة' : 'results'}
                </span>
              </div>

              {/* Admin suggestions list */}
              {adminSuggestions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500 font-bold bg-white dark:bg-[#0F1E36] rounded-2xl border border-gray-200 dark:border-slate-700/80">{t('noSuggestions')}</div>
              ) : (
                adminSuggestions.map((s: Suggestion) => (
                  <div key={s.id} className="bg-white dark:bg-[#0F1E36] rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-sm p-5 space-y-3.5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-black text-base text-gray-900 dark:text-white">{s.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold mt-0.5">{s.userName} · {s.hrCode} · {s.department}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-0.5">
                          {new Date(s.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <CategoryBadge cat={s.category} />
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-[#162744] border border-gray-100 dark:border-slate-700/80 rounded-xl p-3.5 leading-relaxed font-medium">{s.description}</p>

                    {/* Admin Message sent indicator */}
                    {(s as any).adminMessage && (
                      <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 rounded-xl px-3.5 py-2.5 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                        <Mail size={14} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                        <div>
                          <span className="font-bold">{language === 'ar' ? 'رسالة أُرسلت: ' : 'Message sent: '}</span>
                          {(s as any).adminMessage}
                        </div>
                      </div>
                    )}

                    {/* Admin Controls — clicking status opens the message modal */}
                    <div className="border-t border-gray-100 dark:border-slate-800 pt-3.5 flex flex-wrap gap-2 items-center">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                        {language === 'ar' ? 'تغيير الحالة + إرسال رسالة:' : 'Change Status + Send Message:'}
                      </span>
                      {(['pending', 'reviewing', 'done', 'rejected'] as SuggestionStatus[]).map(st => (
                        <button
                          key={st}
                          onClick={() => handleStatusClick(s, st)}
                          className={`text-xs px-3 py-1 rounded-full border font-bold transition-all hover:scale-105 cursor-pointer ${
                            s.status === st ? STATUS_CONFIG[st].color + ' scale-[1.05] shadow-xs' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {language === 'ar' ? STATUS_CONFIG[st].label_ar : STATUS_CONFIG[st].label_en}
                        </button>
                      ))}
                    </div>

                    {/* Admin Internal Note */}
                    <div>
                      {editingNote?.id === s.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={editingNote.note}
                            onChange={e => setEditingNote({ id: s.id, note: e.target.value })}
                            placeholder={language === 'ar' ? 'ملاحظة داخلية...' : 'Internal note...'}
                            className="flex-1 border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-[#162744] text-gray-900 dark:text-white rounded-xl px-3.5 py-1.5 text-xs sm:text-sm focus:outline-none"
                          />
                          <button
                            onClick={async () => { await updateSuggestion(s.id, { adminNote: editingNote.note }); setEditingNote(null); }}
                            className="bg-[#002D62] dark:bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            {language === 'ar' ? 'حفظ' : 'Save'}
                          </button>
                          <button onClick={() => setEditingNote(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 cursor-pointer">
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingNote({ id: s.id, note: s.adminNote || '' })}
                          className="text-xs text-[#002D62] dark:text-blue-300 hover:underline font-bold cursor-pointer"
                        >
                          {s.adminNote
                            ? `📋 ${t('adminNote')}: ${s.adminNote}`
                            : (language === 'ar' ? '+ ملاحظة داخلية' : '+ Internal note')}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              {/* User: My Suggestions */}
              <h2 className="text-base font-bold text-[#002D62] dark:text-white">{t('mySuggestions')}</h2>
              {mySuggestions.length === 0 ? (
                <div className="bg-white dark:bg-[#0F1E36] rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-sm p-8 text-center text-gray-400 dark:text-gray-500 font-bold">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                  <p>{t('noSuggestions')}</p>
                </div>
              ) : (
                mySuggestions.map((s: Suggestion) => (
                  <div key={s.id} className="bg-white dark:bg-[#0F1E36] rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-sm p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="font-black text-base text-gray-900 dark:text-white">{s.title}</p>
                      <div className="flex gap-2 flex-wrap">
                        <CategoryBadge cat={s.category} />
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-[#162744] border border-gray-100 dark:border-slate-700/80 rounded-xl p-3.5 leading-relaxed font-medium">{s.description}</p>

                    {/* Admin message to user */}
                    {(s as any).adminMessage && (
                      <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm">
                        <p className="text-xs font-black text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-1">
                          <Mail size={13} />
                          {language === 'ar' ? 'رد الإدارة:' : 'Admin Reply:'}
                        </p>
                        <p className="text-gray-800 dark:text-gray-100 leading-relaxed font-medium">{(s as any).adminMessage}</p>
                        {(s as any).adminMessageAt && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                            {new Date((s as any).adminMessageAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      {new Date(s.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                    </p>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
