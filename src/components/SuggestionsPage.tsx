import React, { useState } from 'react';
import { useAppContext } from '../context';
import { Suggestion, SuggestionCategory, SuggestionStatus } from '../types';
import { 
  Lightbulb, Bug, BookOpen, Sparkles, 
  Send, Clock, CheckCircle, XCircle, 
  Search, MessageSquare, AlertCircle, X,
  Mail, ChevronDown, ChevronRight
} from 'lucide-react';

const CATEGORIES: { value: SuggestionCategory; icon: React.FC<any>; color: string }[] = [
  { value: 'ui',      icon: Sparkles,  color: 'text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700/50' },
  { value: 'course',  icon: BookOpen,  color: 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50' },
  { value: 'bug',     icon: Bug,       color: 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/50' },
  { value: 'general', icon: Lightbulb, color: 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/50' },
];

const STATUS_CONFIG: Record<SuggestionStatus, { label_en: string; label_ar: string; color: string; icon: React.FC<any> }> = {
  pending:   { label_en: 'Pending',       label_ar: 'قيد الانتظار', color: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.08] border-gray-300 dark:border-white/[0.15]', icon: Clock },
  reviewing: { label_en: 'Under Review',  label_ar: 'قيد الدراسة', color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50',    icon: AlertCircle },
  done:      { label_en: 'Done',          label_ar: 'تم',           color: 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/50', icon: CheckCircle },
  rejected:  { label_en: 'Rejected',      label_ar: 'مرفوض',        color: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/50',       icon: XCircle },
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-[#002D62] flex items-center gap-2">
              <Mail size={18} className="text-[#FFC000]" />
              {language === 'ar' ? 'إرسال رسالة للمستخدم' : 'Send Message to User'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {suggestion.userName} · {suggestion.hrCode}
              <span className={`ml-2 rtl:mr-2 rtl:ml-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[newStatus].color}`}>
                {statusLabel}
              </span>
            </p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Suggestion preview */}
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 border border-gray-100">
            <span className="font-semibold text-gray-800">{language === 'ar' ? 'الاقتراح: ' : 'Suggestion: '}</span>
            {suggestion.title}
          </div>

          {/* Templates */}
          <div>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#002D62] mb-2"
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
                    className={`w-full text-start text-sm px-3 py-2.5 rounded-lg border transition-all leading-relaxed ${
                      selectedTemplate === idx
                        ? 'border-[#002D62] bg-blue-50 text-[#002D62] font-medium shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className={`inline-block w-5 h-5 rounded-full border-2 mr-2 rtl:ml-2 rtl:mr-0 text-[10px] font-bold flex-shrink-0 align-middle text-center leading-4 ${
                      selectedTemplate === idx ? 'border-[#002D62] bg-[#002D62] text-white' : 'border-gray-300'
                    }`}>{idx + 1}</span>
                    {tpl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom message */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              {language === 'ar' ? '✏️ أو اكتب رسالة مخصصة:' : '✏️ Or write a custom message:'}
            </label>
            <textarea
              value={customMsg}
              onChange={e => { setCustomMsg(e.target.value); setSelectedTemplate(null); }}
              rows={3}
              placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002D62]/30 resize-none"
            />
          </div>

          {/* Admin internal note */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              {language === 'ar' ? '📋 ملاحظة داخلية (اختياري - للأدمن فقط):' : '📋 Internal Note (optional – admin only):'}
            </label>
            <input
              type="text"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder={language === 'ar' ? 'ملاحظة داخلية...' : 'Internal note...'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002D62]/20"
            />
          </div>

          {/* Preview */}
          {finalMessage.trim() && (
            <div className="bg-[#002D62]/5 border border-[#002D62]/20 rounded-lg px-4 py-3">
              <p className="text-[10px] font-bold text-[#002D62] uppercase tracking-wider mb-1">{language === 'ar' ? 'معاينة الرسالة' : 'Message Preview'}</p>
              <p className="text-sm text-gray-800 leading-relaxed">{finalMessage}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSend}
            disabled={!finalMessage.trim() || sending}
            className="flex-1 py-2 rounded-lg bg-[#002D62] text-white font-bold text-sm hover:bg-blue-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
            {sending
              ? (language === 'ar' ? 'جارٍ الإرسال...' : 'Sending...')
              : (language === 'ar' ? 'إرسال الرسالة' : 'Send Message')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SuggestionsPage: React.FC = () => {
  const { user, language, t, suggestions, addSuggestion, updateSuggestion } = useAppContext() as any;
  const isAdmin = user?.role === 'admin';

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('general');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Admin filter state
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null);

  // Message modal state
  const [messagingFor, setMessagingFor] = useState<{ suggestion: Suggestion; newStatus: SuggestionStatus } | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    const newSuggestion: Suggestion = {
      id: `sug_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: user?.id || '',
      userName: user?.name || '',
      hrCode: user?.hrCode || '',
      department: user?.department || '',
      title: title.trim(),
      description: description.trim(),
      category,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await addSuggestion(newSuggestion);
    setTitle('');
    setDescription('');
    setCategory('general');
    setSuccessMsg(t('suggestionSubmitted'));
    setSubmitting(false);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleStatusClick = (suggestion: Suggestion, newStatus: SuggestionStatus) => {
    if (suggestion.status === newStatus) return;
    setMessagingFor({ suggestion, newStatus });
  };

  const handleSendMessage = async (message: string, adminNote: string) => {
    if (!messagingFor) return;
    const { suggestion, newStatus } = messagingFor;
    await updateSuggestion(suggestion.id, {
      status: newStatus,
      adminMessage: message,
      adminMessageAt: new Date().toISOString(),
      ...(adminNote ? { adminNote } : {}),
    });
    setMessagingFor(null);
    const label = language === 'ar' ? STATUS_CONFIG[newStatus].label_ar : STATUS_CONFIG[newStatus].label_en;
    setSendSuccess(language === 'ar' ? `تم تغيير الحالة إلى "${label}" وإرسال الرسالة ✓` : `Status changed to "${label}" and message sent ✓`);
    setTimeout(() => setSendSuccess(null), 4000);
  };

  const getCategoryLabel = (cat: SuggestionCategory) => {
    const map: Record<SuggestionCategory, string> = {
      ui: t('catUi'), course: t('catCourse'), bug: t('catBug'), general: t('catGeneral')
    };
    return map[cat];
  };

  const mySuggestions = suggestions.filter((s: Suggestion) => s.userId === user?.id);

  let adminSuggestions = [...suggestions];
  if (filterStatus !== 'all') adminSuggestions = adminSuggestions.filter((s: Suggestion) => s.status === filterStatus);
  if (filterCategory !== 'all') adminSuggestions = adminSuggestions.filter((s: Suggestion) => s.category === filterCategory);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    adminSuggestions = adminSuggestions.filter((s: Suggestion) =>
      s.title.toLowerCase().includes(q) ||
      s.userName.toLowerCase().includes(q) ||
      s.hrCode.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  }

  const StatusBadge = ({ status }: { status: SuggestionStatus }) => {
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
        <Icon size={11} />
        {language === 'ar' ? cfg.label_ar : cfg.label_en}
      </span>
    );
  };

  const CategoryBadge = ({ cat }: { cat: SuggestionCategory }) => {
    const cfg = CATEGORIES.find(c => c.value === cat)!;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
        <Icon size={11} />
        {getCategoryLabel(cat)}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#002D62] flex items-center gap-2">
          <MessageSquare size={24} className="text-[#FFC000]" />
          {t('suggestions')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {language === 'ar'
            ? 'شارك اقتراحاتك لتحسين النظام'
            : 'Share your feedback to help us improve the system'}
        </p>
      </div>

      {/* Send success toast */}
      {sendSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm">
          <CheckCircle size={16} />
          {sendSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Submit Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-bold text-[#002D62] mb-4 flex items-center gap-2">
              <Lightbulb size={18} className="text-[#FFC000]" />
              {t('newSuggestion')}
            </h2>
            {successMsg && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
                <CheckCircle size={15} />
                {successMsg}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('suggestionCategory')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-semibold transition-all ${
                          category === cat.value ? cat.color + ' scale-[1.03] shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={16} />
                        <span>{getCategoryLabel(cat.value)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('suggestionTitle')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder={language === 'ar' ? 'عنوان مختصر...' : 'Brief title...'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002D62]/30"
                />
              </div>
              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('suggestionDescription')}</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  rows={4}
                  placeholder={language === 'ar' ? 'اشرح اقتراحك بالتفصيل...' : 'Describe your suggestion in detail...'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002D62]/30 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !description.trim()}
                className="w-full bg-[#002D62] text-white font-bold py-2.5 rounded-lg hover:bg-blue-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={15} />
                {submitting ? '...' : t('submitSuggestion')}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Suggestions List */}
        <div className="lg:col-span-2 space-y-4">
          {isAdmin ? (
            <>
              {/* Admin: Filters */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[150px]">
                  <Search size={15} className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                    className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D62]/20"
                  />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
                  <option value="pending">{t('statusPending')}</option>
                  <option value="reviewing">{t('statusReviewing')}</option>
                  <option value="done">{t('statusDone')}</option>
                  <option value="rejected">{t('statusRejected')}</option>
                </select>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="all">{language === 'ar' ? 'كل التصنيفات' : 'All Categories'}</option>
                  <option value="ui">{t('catUi')}</option>
                  <option value="course">{t('catCourse')}</option>
                  <option value="bug">{t('catBug')}</option>
                  <option value="general">{t('catGeneral')}</option>
                </select>
                <span className="text-xs text-gray-500 font-semibold ml-auto rtl:mr-auto rtl:ml-0">
                  {adminSuggestions.length} {language === 'ar' ? 'نتيجة' : 'results'}
                </span>
              </div>

              {/* Admin suggestions list */}
              {adminSuggestions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">{t('noSuggestions')}</div>
              ) : (
                adminSuggestions.map((s: Suggestion) => (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-bold text-gray-900">{s.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.userName} · {s.hrCode} · {s.department}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(s.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <CategoryBadge cat={s.category} />
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">{s.description}</p>

                    {/* Admin Message sent indicator */}
                    {(s as any).adminMessage && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-start gap-2">
                        <Mail size={13} className="mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold">{language === 'ar' ? 'رسالة أُرسلت: ' : 'Message sent: '}</span>
                          {(s as any).adminMessage}
                        </div>
                      </div>
                    )}

                    {/* Admin Controls — clicking status opens the message modal */}
                    <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-2 items-center">
                      <span className="text-xs font-semibold text-gray-500">
                        {language === 'ar' ? 'تغيير الحالة + إرسال رسالة:' : 'Change Status + Send Message:'}
                      </span>
                      {(['pending', 'reviewing', 'done', 'rejected'] as SuggestionStatus[]).map(st => (
                        <button
                          key={st}
                          onClick={() => handleStatusClick(s, st)}
                          className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-all hover:scale-105 ${
                            s.status === st ? STATUS_CONFIG[st].color + ' scale-[1.05]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
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
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          />
                          <button
                            onClick={async () => { await updateSuggestion(s.id, { adminNote: editingNote.note }); setEditingNote(null); }}
                            className="bg-[#002D62] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            {language === 'ar' ? 'حفظ' : 'Save'}
                          </button>
                          <button onClick={() => setEditingNote(null)} className="text-xs text-gray-500 hover:text-gray-700">
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingNote({ id: s.id, note: s.adminNote || '' })}
                          className="text-xs text-[#002D62] hover:underline font-medium"
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
              <h2 className="text-base font-bold text-[#002D62]">{t('mySuggestions')}</h2>
              {mySuggestions.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                  <p>{t('noSuggestions')}</p>
                </div>
              ) : (
                mySuggestions.map((s: Suggestion) => (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">{s.title}</p>
                      <div className="flex gap-2 flex-wrap">
                        <CategoryBadge cat={s.category} />
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{s.description}</p>

                    {/* Admin message to user */}
                    {(s as any).adminMessage && (
                      <div className="bg-[#002D62]/5 border border-[#002D62]/20 rounded-lg px-3 py-2.5 text-sm">
                        <p className="text-xs font-bold text-[#002D62] mb-1 flex items-center gap-1">
                          <Mail size={12} />
                          {language === 'ar' ? 'رد الإدارة:' : 'Admin Reply:'}
                        </p>
                        <p className="text-gray-800 leading-relaxed">{(s as any).adminMessage}</p>
                        {(s as any).adminMessageAt && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date((s as any).adminMessageAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                          </p>
                        )}
                      </div>
                    )}

                    {s.adminNote && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm text-amber-800">
                        <span className="font-bold">{t('adminNote')}: </span>{s.adminNote}
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
