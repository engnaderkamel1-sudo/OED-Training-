import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Plus, Trash2, Palmtree, Flag, User as UserIcon, Check, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context';
import { HolidayType, VacationCategory } from '../types';

interface HolidaysAndVacationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: number;
  initialDate?: string; // Pre-fill startDate when opened by clicking a specific day
}

export const HolidaysAndVacationsModal: React.FC<HolidaysAndVacationsModalProps> = ({
  isOpen,
  onClose,
  selectedYear,
  initialDate
}) => {
  const { 
    user, 
    holidaysAndVacations, 
    addHolidayOrVacation, 
    deleteHolidayOrVacation 
  } = useAppContext();

  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  // Active view inside modal: 'list' | 'add'
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'personal'>('all');
  const [showAddForm, setShowAddForm] = useState<boolean>(!!initialDate);

  // Form State
  const [formType, setFormType] = useState<HolidayType>(isAdmin ? 'public' : 'personal');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<VacationCategory>('national_holiday');
  const [formStartDate, setFormStartDate] = useState(initialDate || `${selectedYear}-01-01`);
  const [formEndDate, setFormEndDate] = useState(initialDate || `${selectedYear}-01-01`);
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Filter items for current selected year
  const yearItems = holidaysAndVacations.filter(item => {
    const startYear = parseInt(item.startDate.substring(0, 4), 10);
    const endYear = parseInt(item.endDate.substring(0, 4), 10);
    return item.year === selectedYear || startYear === selectedYear || endYear === selectedYear;
  });

  // Filter items according to tab & user privacy
  const filteredItems = yearItems.filter(item => {
    if (activeTab === 'public') return item.type === 'public';
    if (activeTab === 'personal') {
      if (isAdmin) return item.type === 'personal';
      return item.type === 'personal' && item.userId === user?.id;
    }
    // 'all'
    if (item.type === 'public') return true;
    if (isAdmin) return true;
    return item.userId === user?.id;
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStartDate) {
      setStatusMessage({ type: 'error', text: 'Please fill in the title and start date.' });
      return;
    }

    if (formEndDate < formStartDate) {
      setStatusMessage({ type: 'error', text: 'End date cannot be earlier than start date.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const yearFromDate = parseInt(formStartDate.substring(0, 4), 10) || selectedYear;

      await addHolidayOrVacation({
        title: formTitle.trim(),
        type: formType,
        category: formCategory,
        startDate: formStartDate,
        endDate: formEndDate,
        year: yearFromDate,
        userId: formType === 'personal' ? (user?.id || 'unknown') : undefined,
        userName: formType === 'personal' ? (user?.name || 'Staff Member') : undefined,
        userHrCode: formType === 'personal' ? (user?.hrCode || '') : undefined,
        notes: formNotes.trim() || undefined,
        createdBy: user?.name || 'System'
      });

      setStatusMessage({ type: 'success', text: 'Holiday / Vacation added successfully!' });
      setFormTitle('');
      setFormNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to save record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this holiday/vacation record?')) {
      try {
        await deleteHolidayOrVacation(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-[#002D62] dark:border-blue-900 shadow-2xl max-w-2xl w-full overflow-hidden my-6"
      >
        {/* Modal Top Banner */}
        <div className="bg-[#002D62] text-white p-5 flex items-center justify-between border-b-2 border-blue-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Palmtree className="text-[#FFC000]" size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-wide uppercase">
                Official Holidays & Vacations ({selectedYear})
              </h3>
              <p className="text-xs text-blue-200 font-medium">
                Public Holidays & Personal Staff Leaves
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Sub-Header Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => { setActiveTab('all'); setShowAddForm(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all' && !showAddForm
                  ? 'bg-white dark:bg-slate-700 text-[#002D62] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({yearItems.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('public'); setShowAddForm(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'public' && !showAddForm
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <Flag size={12} />
              <span>Public ({yearItems.filter(i => i.type === 'public').length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('personal'); setShowAddForm(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'personal' && !showAddForm
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-500'
              }`}
            >
              <Palmtree size={12} />
              <span>Personal ({yearItems.filter(i => i.type === 'personal').length})</span>
            </button>
          </div>

          {/* Add Holiday Button */}
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              showAddForm
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                : 'bg-[#FFC000] hover:bg-amber-400 text-[#002D62]'
            }`}
          >
            {showAddForm ? (
              <span>Cancel Add</span>
            ) : (
              <>
                <Plus size={14} />
                <span>Add Record</span>
              </>
            )}
          </button>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div className={`mx-4 mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200'
          }`}>
            {statusMessage.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Add Record Form View */}
        {showAddForm ? (
          <form onSubmit={handleCreate} className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#002D62] dark:text-amber-400">
                New Holiday or Personal Vacation
              </h4>

              {/* Type Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Type of Leave / Holiday
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setFormType('public'); setFormCategory('national_holiday'); }}
                    disabled={!isAdmin}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      formType === 'public'
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Flag size={14} />
                    <span>Official Public Holiday</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFormType('personal'); setFormCategory('annual_leave'); }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      formType === 'personal'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Palmtree size={14} />
                    <span>Personal Vacation</span>
                  </button>
                </div>
                {!isAdmin && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    * Only administrators can register official public holidays.
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Title / Event Name *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={formType === 'public' ? 'e.g., Armed Forces Day' : 'e.g., Annual Leave'}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as VacationCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden"
                >
                  {formType === 'public' ? (
                    <>
                      <option value="national_holiday">National Holiday</option>
                      <option value="religious_holiday">Religious Holiday</option>
                      <option value="other">Other Official Holiday</option>
                    </>
                  ) : (
                    <>
                      <option value="annual_leave">Annual Leave</option>
                      <option value="casual_leave">Casual Leave</option>
                      <option value="sick_leave">Sick Leave</option>
                      <option value="other">Other Personal Leave</option>
                    </>
                  )}
                </select>
              </div>

              {/* Dates: Start & End */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (formEndDate < e.target.value) {
                        setFormEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    min={formStartDate}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notes / Description (Optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional operational details or comments..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#002D62] hover:bg-blue-950 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{isSubmitting ? 'Saving...' : 'Save to Calendar'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* List View */
          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2.5">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Palmtree className="mx-auto text-slate-300 dark:text-slate-700" size={36} />
                <p className="text-xs font-bold">No holidays or vacations recorded for {selectedYear}.</p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 px-4 py-1.5 rounded-xl bg-[#FFC000] text-[#002D62] text-xs font-black inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>Add First Record</span>
                </button>
              </div>
            ) : (
              filteredItems.map(item => {
                const isPublic = item.type === 'public';
                const canDelete = isAdmin || item.userId === user?.id;
                const isMultiDay = item.startDate !== item.endDate;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isPublic
                          ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200'
                          : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200'
                      }`}>
                        {isPublic ? <Flag size={18} /> : <Palmtree size={18} />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            isPublic
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                          }`}>
                            {isPublic ? 'Official Holiday' : 'Personal Vacation'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          <span className="flex items-center gap-1 text-[#002D62] dark:text-amber-400 font-bold">
                            <Calendar size={12} />
                            <span>
                              {item.startDate} {isMultiDay ? `to ${item.endDate}` : ''}
                            </span>
                          </span>

                          {!isPublic && item.userName && (
                            <span className="flex items-center gap-1">
                              <UserIcon size={12} />
                              <span>{item.userName}</span>
                            </span>
                          )}
                        </div>

                        {item.notes && (
                          <p className="text-[10px] text-slate-400 italic pt-0.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {yearItems.length} total entries active for {selectedYear}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#002D62] hover:bg-blue-950 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
