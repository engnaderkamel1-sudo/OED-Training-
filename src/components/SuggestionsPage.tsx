import React, { useState } from 'react';
import { useAppContext } from '../context';
import { Suggestion, SuggestionCategory, SuggestionStatus } from '../types';
import { 
  Lightbulb, Bug, BookOpen, Sparkles, 
  Send, Clock, CheckCircle, XCircle, 
  Search, MessageSquare, AlertCircle
} from 'lucide-react';

const CATEGORIES: { value: SuggestionCategory; icon: React.FC<any>; color: string }[] = [
  { value: 'ui',      icon: Sparkles,  color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'course',  icon: BookOpen,  color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'bug',     icon: Bug,       color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'general', icon: Lightbulb, color: 'text-amber-600 bg-amber-50 border-amber-200' },
];

const STATUS_CONFIG: Record<SuggestionStatus, { label_en: string; label_ar: string; color: string; icon: React.FC<any> }> = {
  pending:   { label_en: 'Pending',       label_ar: 'قيد الانتظار', color: 'text-gray-600 bg-gray-100 border-gray-300',    icon: Clock },
  reviewing: { label_en: 'Under Review',  label_ar: 'قيد الدراسة', color: 'text-blue-700 bg-blue-50 border-blue-200',    icon: AlertCircle },
  done:      { label_en: 'Done',          label_ar: 'تم',           color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle },
  rejected:  { label_en: 'Rejected',      label_ar: 'مرفوض',        color: 'text-red-700 bg-red-50 border-red-200',       icon: XCircle },
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

  const getCategoryLabel = (cat: SuggestionCategory) => {
    const map: Record<SuggestionCategory, string> = {
      ui: t('catUi'), course: t('catCourse'), bug: t('catBug'), general: t('catGeneral')
    };
    return map[cat];
  };

  // User's own suggestions
  const mySuggestions = suggestions.filter((s: Suggestion) => s.userId === user?.id);

  // Admin filtered suggestions
  let adminSuggestions = [...suggestions];
  if (filterStatus !== 'all') adminSuggestions = adminSuggestions.filter(s => s.status === filterStatus);
  if (filterCategory !== 'all') adminSuggestions = adminSuggestions.filter(s => s.category === filterCategory);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    adminSuggestions = adminSuggestions.filter(s =>
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
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D62]/20"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
                  <option value="pending">{t('statusPending')}</option>
                  <option value="reviewing">{t('statusReviewing')}</option>
                  <option value="done">{t('statusDone')}</option>
                  <option value="rejected">{t('statusRejected')}</option>
                </select>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="all">{language === 'ar' ? 'كل التصنيفات' : 'All Categories'}</option>
                  <option value="ui">{t('catUi')}</option>
                  <option value="course">{t('catCourse')}</option>
                  <option value="bug">{t('catBug')}</option>
                  <option value="general">{t('catGeneral')}</option>
                </select>
                <span className="text-xs text-gray-500 font-semibold ml-auto">
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
                        <p className="text-xs text-gray-500 mt-0.5">
                          {s.userName} · {s.hrCode} · {s.department}
                        </p>
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

                    {/* Admin Controls */}
                    <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-2 items-center">
                      <span className="text-xs font-semibold text-gray-500">{language === 'ar' ? 'تغيير الحالة:' : 'Change Status:'}</span>
                      {(['pending', 'reviewing', 'done', 'rejected'] as SuggestionStatus[]).map(st => (
                        <button
                          key={st}
                          onClick={() => updateSuggestion(s.id, { status: st })}
                          className={`text-xs px-2 py-1 rounded-full border font-semibold transition-all ${
                            s.status === st ? STATUS_CONFIG[st].color + ' scale-[1.05]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {language === 'ar' ? STATUS_CONFIG[st].label_ar : STATUS_CONFIG[st].label_en}
                        </button>
                      ))}
                    </div>

                    {/* Admin Note */}
                    <div>
                      {editingNote?.id === s.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={editingNote.note}
                            onChange={e => setEditingNote({ id: s.id, note: e.target.value })}
                            placeholder={language === 'ar' ? 'أضف ملاحظة...' : 'Add a note...'}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          />
                          <button
                            onClick={async () => {
                              await updateSuggestion(s.id, { adminNote: editingNote.note });
                              setEditingNote(null);
                            }}
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
                            ? `📝 ${t('adminNote')}: ${s.adminNote}`
                            : (language === 'ar' ? '+ إضافة ملاحظة' : '+ Add admin note')}
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
                      <div className="flex gap-2">
                        <CategoryBadge cat={s.category} />
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{s.description}</p>
                    {s.adminNote && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-800">
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
