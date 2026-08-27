import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context';
import { HandoutRevision, HandoutRevisionStatus, HandoutIssueType } from '../types';
import { 
  BookOpen, Plus, Search, Filter, CheckCircle2, Clock, 
  AlertCircle, XCircle, Sparkles, MessageSquare, Save, Trash2, 
  ArrowLeft, Check, ChevronDown, User, Calendar, FileText
} from 'lucide-react';
import { HandoutRevisionModal } from './HandoutRevisionModal';

export const HandoutRevisionsPage: React.FC = () => {
  const { 
    language, 
    user, 
    handoutRevisions, 
    updateHandoutRevision, 
    deleteHandoutRevision,
    setCurrentView 
  } = useAppContext();

  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  // Issue Type Labels & Badges with unified vibrant contrast
  const getIssueTypeBadge = (type: HandoutIssueType) => {
    switch (type) {
      case 'technical_update':
        return {
          label: language === 'ar' ? 'تحديث فني' : 'Technical Update',
          classes: 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200 border-blue-300 dark:border-blue-500/40'
        };
      case 'missing_info':
        return {
          label: language === 'ar' ? 'معلومة ناقصة' : 'Missing Info',
          classes: 'bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-200 border-purple-300 dark:border-purple-500/40'
        };
      case 'diagram_enhancement':
        return {
          label: language === 'ar' ? 'مخطط / صورة' : 'Diagram / Visual',
          classes: 'bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-200 border-amber-300 dark:border-amber-500/40'
        };
      case 'typo':
        return {
          label: language === 'ar' ? 'خطأ مطبعي' : 'Typo',
          classes: 'bg-emerald-100 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40'
        };
      default:
        return {
          label: language === 'ar' ? 'مقترح عام' : 'General Suggestion',
          classes: 'bg-slate-100 text-slate-900 dark:bg-slate-700/40 dark:text-slate-200 border-slate-300 dark:border-slate-600'
        };
    }
  };

  // Status Badges with clear high-contrast colors
  const getStatusBadge = (status: HandoutRevisionStatus) => {
    switch (status) {
      case 'applied':
        return {
          label: language === 'ar' ? 'تم التعديل في الحقيبة ✓' : 'Applied in Handout ✓',
          classes: 'bg-emerald-100 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-200 border-emerald-400 dark:border-emerald-500/50'
        };
      case 'reviewing':
        return {
          label: language === 'ar' ? 'قيد المراجعة الفنية ⏳' : 'Under Review ⏳',
          classes: 'bg-blue-100 text-blue-950 dark:bg-blue-500/25 dark:text-blue-200 border-blue-400 dark:border-blue-500/50'
        };
      case 'rejected':
        return {
          label: language === 'ar' ? 'مرفوض / غير دقيق ✕' : 'Rejected ✕',
          classes: 'bg-red-100 text-red-950 dark:bg-red-500/25 dark:text-red-200 border-red-400 dark:border-red-500/50'
        };
      default:
        return {
          label: language === 'ar' ? 'جديد - قيد الدراسة 📋' : 'Pending Review 📋',
          classes: 'bg-amber-100 text-amber-950 dark:bg-amber-500/25 dark:text-amber-200 border-amber-400 dark:border-amber-500/50'
        };
    }
  };

  // Distinct Courses List for Filter
  const distinctCourses = useMemo(() => {
    const set = new Set<string>();
    (handoutRevisions || []).forEach(r => {
      if (r.courseTitle) set.add(r.courseTitle.trim());
    });
    return Array.from(set).sort();
  }, [handoutRevisions]);

  // Filtered List
  const filteredRevisions = useMemo(() => {
    return (handoutRevisions || []).filter(r => {
      // Non-admins only see their own submitted revisions
      if (!isAdmin && user && r.userId !== user.id && r.hrCode !== user.hrCode) {
        return false;
      }

      if (selectedCourse !== 'all' && r.courseTitle !== selectedCourse) return false;
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchCourse = (r.courseTitle || '').toLowerCase().includes(q);
        const matchDesc = (r.description || '').toLowerCase().includes(q);
        const matchProposed = (r.proposedCorrection || '').toLowerCase().includes(q);
        const matchUser = (r.userName || '').toLowerCase().includes(q);
        const matchHr = (r.hrCode || '').toLowerCase().includes(q);
        const matchTopic = (r.topicOrSection || '').toLowerCase().includes(q);
        if (!matchCourse && !matchDesc && !matchProposed && !matchUser && !matchHr && !matchTopic) {
          return false;
        }
      }
      return true;
    });
  }, [handoutRevisions, selectedCourse, selectedStatus, searchTerm, isAdmin, user]);

  // KPI Counts (Global for Admin, Personal for Trainee)
  const userScopeRevisions = useMemo(() => {
    return (handoutRevisions || []).filter(r => isAdmin || (user && (r.userId === user.id || r.hrCode === user.hrCode)));
  }, [handoutRevisions, isAdmin, user]);

  const pendingCount = userScopeRevisions.filter(r => r.status === 'pending').length;
  const appliedCount = userScopeRevisions.filter(r => r.status === 'applied').length;
  const totalCount = userScopeRevisions.length;

  const handleUpdateStatus = async (id: string, newStatus: HandoutRevisionStatus) => {
    try {
      setUpdatingId(id);
      await updateHandoutRevision(id, {
        status: newStatus,
        reviewedAt: new Date().toISOString(),
        reviewedBy: user?.name || 'Admin'
      });
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveFeedback = async (id: string) => {
    const feedback = editingNotes[id];
    if (feedback === undefined) return;
    try {
      setUpdatingId(id);
      await updateHandoutRevision(id, {
        adminFeedback: feedback.trim(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: user?.name || 'Admin'
      });
      alert(language === 'ar' ? 'تم حفظ رد الإدارة بنجاح!' : 'Admin feedback saved!');
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المقترح نهائياً؟' : 'Are you sure you want to delete this revision?')) {
      return;
    }
    try {
      await deleteHandoutRevision(id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* الشريط الذهبي والترحيب على اليمين */}
      <div className="w-full flex items-center justify-end border-b-2 border-[#FFC000] pb-2 mb-2 print:hidden">
        <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 md:hidden ml-auto rtl:ml-0 rtl:mr-auto text-right">
          {language === 'ar' ? '👋 أهلاً بك، ' : '👋 Welcome, '}
          <span className="text-[#002D62] dark:text-[#FFC000] font-black">{user?.name?.split(' ')[0]}</span>
        </p>
      </div>

      {/* Top Header Banner */}
      <div className="bg-white dark:bg-[#0E1A30] border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#002D62] dark:bg-blue-900/50 text-[#FFC000] flex items-center justify-center font-bold shadow-md">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#002D62] dark:text-white">
              {language === 'ar' ? 'تعديلات ومقترحات المحتوى التدريبي (Handouts)' : 'Handout & Material Revisions'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {language === 'ar' 
                ? 'سجل الملاحظات والتصحيحات الفنية المقترحة على حقائب وكورسات المعدات'
                : 'Review & manage technical revisions and improvements for course materials'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none cursor-pointer bg-[#002D62] hover:bg-blue-900 text-white font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:scale-105"
          >
            <Plus size={16} className="text-[#FFC000]" />
            <span>{language === 'ar' ? 'تقديم مقترح جديد' : 'New Revision'}</span>
          </button>
        </div>
      </div>

      {/* KPI Counts (Admin: Global, Trainee: Personal Requests) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#13233D] p-4 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-[#002D62] dark:text-blue-300 flex items-center justify-center font-black">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
              {isAdmin ? (language === 'ar' ? 'إجمالي المقترحات' : 'Total Revisions') : (language === 'ar' ? 'إجمالي طلباتي' : 'My Total Requests')}
            </p>
            <p className="text-lg font-black text-[#002D62] dark:text-white">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#13233D] p-4 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400">{language === 'ar' ? 'قيد الدراسة' : 'Pending Review'}</p>
            <p className="text-lg font-black text-amber-700 dark:text-amber-300">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#13233D] p-4 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400">{language === 'ar' ? 'تم التعديل في المادة' : 'Applied in Handout'}</p>
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{appliedCount}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar — Admin Only */}
      {isAdmin && (
        <div className="bg-white dark:bg-[#13233D] p-4 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex-1 w-full relative">
            <Search size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ar' ? 'بحث باسم الكورس، المتدرب، الكود، أو محتوى الملاحظة...' : 'Search course, trainee, HR code, or keyword...'}
              className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-[#0A1628] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto flex-wrap">
            {/* Course Filter */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="flex-1 md:flex-none text-xs bg-gray-50 dark:bg-[#0A1628] border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
            >
              <option value="all">{language === 'ar' ? 'جميع الكورسات' : 'All Courses'}</option>
              {distinctCourses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex-1 md:flex-none text-xs bg-gray-50 dark:bg-[#0A1628] border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
            >
              <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="pending">{language === 'ar' ? 'قيد الدراسة (Pending)' : 'Pending'}</option>
              <option value="reviewing">{language === 'ar' ? 'قيد المراجعة الفنية (Reviewing)' : 'Reviewing'}</option>
              <option value="applied">{language === 'ar' ? 'تم التعديل (Applied)' : 'Applied'}</option>
              <option value="rejected">{language === 'ar' ? 'مرفوض (Rejected)' : 'Rejected'}</option>
            </select>
          </div>
        </div>
      )}

      {/* Revisions Cards List */}
      <div className="space-y-4">
        {filteredRevisions.length === 0 ? (
          <div className="bg-white dark:bg-[#13233D] rounded-2xl p-12 text-center border border-gray-200 dark:border-slate-700/80 space-y-3">
            <BookOpen size={40} className="text-gray-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-700 dark:text-gray-300">
              {language === 'ar' ? 'لا توجد مقترحات مطابقة للبحث' : 'No revisions found matching criteria'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {language === 'ar' ? 'يمكنك تقديم مقترح جديد بالنقر على زر (تقديم مقترح جديد).' : 'You can submit a new suggestion using the button above.'}
            </p>
          </div>
        ) : (
          filteredRevisions.map((rev) => {
            const issueBadge = getIssueTypeBadge(rev.issueType);
            const statusBadge = getStatusBadge(rev.status);

            return (
              <div 
                key={rev.id}
                className="bg-white dark:bg-[#13233D] border border-gray-200 dark:border-slate-700/80 hover:border-[#002D62] dark:hover:border-blue-500/50 rounded-2xl p-5 shadow-sm transition-all space-y-4"
              >
                {/* Top Row: Course Title + Badges */}
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-[#002D62] dark:text-white">
                        {rev.courseTitle}
                      </h2>
                      {rev.pageNumber && (
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold border border-slate-300 dark:border-slate-700">
                          {rev.pageNumber}
                        </span>
                      )}
                      {rev.topicOrSection && (
                        <span className="text-xs bg-blue-50 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md font-bold border border-blue-200 dark:border-blue-500/30">
                          {rev.topicOrSection}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400 mt-1 flex-wrap font-medium">
                      <span className="flex items-center gap-1 font-bold text-gray-800 dark:text-slate-200">
                        <User size={13} className="text-[#002D62] dark:text-[#FFC000]" />
                        {rev.userName} ({rev.hrCode})
                      </span>
                      <span>•</span>
                      <span>{rev.department}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {new Date(rev.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-black px-3 py-1 rounded-xl border shadow-2xs ${issueBadge.classes}`}>
                      {issueBadge.label}
                    </span>
                    <span className={`text-xs font-black px-3 py-1 rounded-xl border shadow-2xs ${statusBadge.classes}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                {/* Description and Proposed Correction Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="bg-rose-50/80 dark:bg-rose-950/40 p-3.5 rounded-xl border border-rose-200 dark:border-rose-500/30 space-y-1">
                    <span className="text-xs font-black text-rose-700 dark:text-rose-300 block">
                      {language === 'ar' ? '🔍 الملاحظة / الخطأ في المادة:' : '🔍 Mistake / Issue Found:'}
                    </span>
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-slate-100 leading-relaxed font-medium">
                      {rev.description}
                    </p>
                  </div>

                  <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 space-y-1">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 block">
                      {language === 'ar' ? '✨ التصحيح المقترح:' : '✨ Proposed Correction:'}
                    </span>
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-slate-100 leading-relaxed font-medium">
                      {rev.proposedCorrection || (language === 'ar' ? '(لم يُحدد نص مقترح بديل)' : '(No alternative text specified)')}
                    </p>
                  </div>
                </div>

                {/* Admin Feedback Display (For Trainees) */}
                {rev.adminFeedback && (
                  <div className="bg-blue-50/80 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-200 dark:border-blue-500/30 text-xs sm:text-sm space-y-1">
                    <div className="flex items-center justify-between text-blue-900 dark:text-blue-300 font-black">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-[#FFC000]" />
                        {language === 'ar' ? 'رد وملاحظة إدارة التدريب:' : 'Training Admin Feedback:'}
                      </span>
                      {rev.reviewedBy && (
                        <span className="text-[11px] text-blue-700 dark:text-blue-400 font-normal">
                          {rev.reviewedBy} • {rev.reviewedAt ? new Date(rev.reviewedAt).toLocaleDateString() : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-slate-100 font-medium">
                      {rev.adminFeedback}
                    </p>
                  </div>
                )}

                {/* Admin Action Controls (For Admins Only) */}
                {isAdmin && (
                  <div className="pt-3 border-t border-gray-200 dark:border-slate-700/80 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-600 dark:text-slate-400">
                        {language === 'ar' ? 'تحديث الحالة:' : 'Set Status:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, 'reviewing')}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                          rev.status === 'reviewing'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200 border-gray-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                        }`}
                      >
                        {language === 'ar' ? 'قيد المراجعة ⏳' : 'Reviewing'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, 'applied')}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                          rev.status === 'applied'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200 border-gray-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                        }`}
                      >
                        {language === 'ar' ? 'تم التعديل في الكتاب ✓' : 'Applied in Handout'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, 'rejected')}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                          rev.status === 'rejected'
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200 border-gray-300 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30'
                        }`}
                      >
                        {language === 'ar' ? 'مرفوض ✕' : 'Reject'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingNotes[rev.id] !== undefined ? editingNotes[rev.id] : (rev.adminFeedback || '')}
                        onChange={(e) => setEditingNotes({ ...editingNotes, [rev.id]: e.target.value })}
                        placeholder={language === 'ar' ? 'اكتب رد أو ملاحظة للمتدرب...' : 'Write admin reply...'}
                        className="flex-1 md:w-64 text-xs px-3 py-1.5 bg-gray-50 dark:bg-[#0A1628] border border-gray-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveFeedback(rev.id)}
                        className="cursor-pointer bg-[#002D62] text-white hover:bg-blue-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs shrink-0"
                        title={language === 'ar' ? 'حفظ الرد' : 'Save Reply'}
                      >
                        <Save size={13} />
                        <span>{language === 'ar' ? 'حفظ الرد' : 'Save'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rev.id)}
                        className="cursor-pointer text-red-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title={language === 'ar' ? 'حذف المقترح' : 'Delete'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Handout Revision Modal */}
      {isModalOpen && (
        <HandoutRevisionModal 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};
