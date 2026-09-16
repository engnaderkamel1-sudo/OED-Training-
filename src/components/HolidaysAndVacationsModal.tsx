import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Plus, Trash2, Palmtree, Flag, User as UserIcon, Check, AlertCircle, UploadCloud, RefreshCw, FileText, CheckCircle2, Globe } from 'lucide-react';
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

  // Google Calendar Integration State
  const [showGoogleSync, setShowGoogleSync] = useState<boolean>(false);
  const [isSyncingGCal, setIsSyncingGCal] = useState<boolean>(false);
  const [gcalImportType, setGcalImportType] = useState<HolidayType>(isAdmin ? 'public' : 'personal');
  const [parsedGcalEvents, setParsedGcalEvents] = useState<Array<{
    title: string;
    startDate: string;
    endDate: string;
    category: VacationCategory;
    description?: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse iCal (.ics) string format
  const parseICalContent = (icsText: string) => {
    const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    const lines = unfolded.split(/\r?\n/);
    const results: Array<{
      title: string;
      startDate: string;
      endDate: string;
      category: VacationCategory;
      description?: string;
    }> = [];

    let inEvent = false;
    let title = '';
    let start = '';
    let end = '';
    let desc = '';

    const parseDateStr = (val: string): string => {
      const clean = val.includes(':') ? val.split(':').pop()! : val;
      const match = clean.match(/^(\d{4})(\d{2})(\d{2})/);
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
      return '';
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        title = '';
        start = '';
        end = '';
        desc = '';
      } else if (line === 'END:VEVENT') {
        if (inEvent && title && start) {
          let finalEnd = end || start;
          if (end && end > start) {
            const sDate = new Date(start);
            const eDate = new Date(end);
            const diffDays = Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 3600 * 24));
            if (diffDays === 1) {
              finalEnd = start;
            } else if (diffDays > 1) {
              eDate.setDate(eDate.getDate() - 1);
              finalEnd = eDate.toISOString().split('T')[0];
            }
          }

          const tLower = title.toLowerCase();
          let cat: VacationCategory = 'national_holiday';
          if (tLower.includes('eid') || tLower.includes('christmas') || tLower.includes('mawlid') || tLower.includes('ramadan') || tLower.includes('hijri') || tLower.includes('arafat')) {
            cat = 'religious_holiday';
          }

          results.push({
            title: title.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ').trim(),
            startDate: start,
            endDate: finalEnd,
            category: cat,
            description: desc.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ').trim() || undefined
          });
        }
        inEvent = false;
      } else if (inEvent) {
        if (line.startsWith('SUMMARY:')) {
          title = line.substring(8);
        } else if (line.startsWith('SUMMARY;')) {
          title = line.split(':').slice(1).join(':');
        } else if (line.startsWith('DTSTART')) {
          start = parseDateStr(line);
        } else if (line.startsWith('DTEND')) {
          end = parseDateStr(line);
        } else if (line.startsWith('DESCRIPTION:')) {
          desc = line.substring(12);
        }
      }
    }
    return results;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      try {
        const events = parseICalContent(content);
        if (events.length === 0) {
          setStatusMessage({ type: 'error', text: 'No calendar events found in this .ics file.' });
          return;
        }
        setParsedGcalEvents(events);
        setStatusMessage({ type: 'success', text: `Loaded ${events.length} event(s) from ${file.name}. Review and confirm import below.` });
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: 'Failed to parse calendar file: ' + (err?.message || 'Invalid format') });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSyncOfficialEgyptHolidays = async () => {
    setIsSyncingGCal(true);
    setStatusMessage(null);

    const officialGoogleHolidays: Array<{
      title: string;
      startDate: string;
      endDate: string;
      category: VacationCategory;
      notes: string;
    }> = [
      { title: 'Coptic Christmas Day', startDate: `${selectedYear}-01-07`, endDate: `${selectedYear}-01-07`, category: 'religious_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: 'Revolution Day & Police Day', startDate: `${selectedYear}-01-25`, endDate: `${selectedYear}-01-25`, category: 'national_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: 'Eid Al-Fitr Holiday', startDate: `${selectedYear}-03-20`, endDate: `${selectedYear}-03-23`, category: 'religious_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: 'Sham El-Nessim (Spring Festival)', startDate: `${selectedYear}-04-13`, endDate: `${selectedYear}-04-13`, category: 'national_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: 'Sinai Liberation Day', startDate: `${selectedYear}-04-25`, endDate: `${selectedYear}-04-25`, category: 'national_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: 'Labour Day', startDate: `${selectedYear}-05-01`, endDate: `${selectedYear}-05-01`, category: 'national_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: 'Arafat Day', startDate: `${selectedYear}-05-26`, endDate: `${selectedYear}-05-26`, category: 'religious_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: 'Eid Al-Adha (Feast of Sacrifice)', startDate: `${selectedYear}-05-27`, endDate: `${selectedYear}-05-30`, category: 'religious_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: 'Islamic New Year (Hijri 1448)', startDate: `${selectedYear}-06-16`, endDate: `${selectedYear}-06-16`, category: 'religious_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: '30 June Revolution Day', startDate: `${selectedYear}-06-30`, endDate: `${selectedYear}-06-30`, category: 'national_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: '23 July Revolution Day', startDate: `${selectedYear}-07-23`, endDate: `${selectedYear}-07-23`, category: 'national_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: "Prophet's Birthday (Mawlid al-Nabi)", startDate: `${selectedYear}-08-25`, endDate: `${selectedYear}-08-25`, category: 'religious_holiday', notes: 'Official Google Calendar Egypt Holiday' },
      { title: 'Armed Forces Day (6th of October)', startDate: `${selectedYear}-10-06`, endDate: `${selectedYear}-10-06`, category: 'national_holiday', notes: 'Official Google Calendar Egypt Holiday' }
    ];

    try {
      let addedCount = 0;
      let skippedCount = 0;

      for (const hol of officialGoogleHolidays) {
        const exists = holidaysAndVacations.some(item => 
          item.type === 'public' && 
          item.startDate === hol.startDate
        );

        if (!exists) {
          await addHolidayOrVacation({
            title: hol.title,
            type: 'public',
            category: hol.category,
            startDate: hol.startDate,
            endDate: hol.endDate,
            year: selectedYear,
            notes: hol.notes,
            createdBy: 'Google Calendar Sync'
          });
          addedCount++;
        } else {
          skippedCount++;
        }
      }

      setStatusMessage({
        type: 'success',
        text: `Google Calendar Sync Complete: ${addedCount} official holidays synchronized (${skippedCount} already up-to-date).`
      });
      setShowGoogleSync(false);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Google Calendar Sync failed: ' + (err?.message || 'Unknown error') });
    } finally {
      setIsSyncingGCal(false);
    }
  };

  const handleConfirmGcalImport = async () => {
    if (parsedGcalEvents.length === 0) return;
    setIsSyncingGCal(true);
    setStatusMessage(null);

    try {
      let addedCount = 0;
      let skippedCount = 0;

      for (const ev of parsedGcalEvents) {
        const evYear = parseInt(ev.startDate.substring(0, 4), 10) || selectedYear;
        
        const exists = holidaysAndVacations.some(item => 
          item.startDate === ev.startDate &&
          item.title.toLowerCase().trim() === ev.title.toLowerCase().trim() &&
          item.type === gcalImportType &&
          (gcalImportType === 'public' || item.userId === user?.id)
        );

        if (!exists) {
          await addHolidayOrVacation({
            title: ev.title,
            type: gcalImportType,
            category: ev.category,
            startDate: ev.startDate,
            endDate: ev.endDate,
            year: evYear,
            userId: gcalImportType === 'personal' ? (user?.id || 'unknown') : undefined,
            userName: gcalImportType === 'personal' ? (user?.name || 'Staff Member') : undefined,
            userHrCode: gcalImportType === 'personal' ? (user?.hrCode || '') : undefined,
            notes: ev.description || 'Imported from Google Calendar (.ics)',
            createdBy: user?.name || 'Google Calendar Import'
          });
          addedCount++;
        } else {
          skippedCount++;
        }
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${addedCount} events from Google Calendar (${skippedCount} duplicates skipped).`
      });
      setParsedGcalEvents([]);
      setShowGoogleSync(false);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Import failed: ' + (err?.message || 'Unknown error') });
    } finally {
      setIsSyncingGCal(false);
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

          {/* Action Buttons: Google Calendar Sync & Add Record */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowGoogleSync(!showGoogleSync);
                setShowAddForm(false);
                setParsedGcalEvents([]);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border ${
                showGoogleSync
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'bg-white dark:bg-slate-700 text-[#002D62] dark:text-blue-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50'
              }`}
            >
              <Globe size={13} className={showGoogleSync ? 'text-white' : 'text-blue-600 dark:text-amber-400'} />
              <span>Google Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowGoogleSync(false);
              }}
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

        {/* Google Calendar Sync & Import Panel */}
        {showGoogleSync ? (
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Header Description */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Globe size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#002D62] dark:text-blue-300">
                  Google Calendar Integration
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Synchronize official Egyptian public holidays or import any custom Google Calendar export file (.ics) to populate dates instantly without duplicate entries.
                </p>
              </div>
            </div>

            {/* Quick 1-Click Sync Section */}
            <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-900 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Option A: Sync Official Egypt Holidays ({selectedYear})
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                  Google Verified Feed
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly fetch and update Egypt statutory holidays (Coptic Christmas, Eid holidays, Revolution Days, Armed Forces Day, etc.) directly aligned with Google Calendar.
              </p>

              <button
                type="button"
                disabled={isSyncingGCal}
                onClick={handleSyncOfficialEgyptHolidays}
                className="w-full py-2.5 px-4 rounded-xl bg-[#002D62] hover:bg-blue-950 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isSyncingGCal ? 'animate-spin text-amber-400' : 'text-amber-400'} />
                <span>{isSyncingGCal ? 'Synchronizing with Google Calendar...' : `Sync Official ${selectedYear} Holidays from Google Calendar`}</span>
              </button>
            </div>

            {/* Upload .ics File Section */}
            <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Option B: Import Custom Google Calendar (.ics)
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  iCal Standard
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload any exported Google Calendar file (.ics). You can import personal vacations or official team schedules.
              </p>

              {/* Destination Type Selector */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Import as:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setGcalImportType('public')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gcalImportType === 'public'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    } ${!isAdmin ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    Public Holidays
                  </button>
                  <button
                    type="button"
                    onClick={() => setGcalImportType('personal')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gcalImportType === 'personal'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Personal Vacations
                  </button>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".ics,text/calendar"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UploadCloud size={16} className="text-blue-600 dark:text-blue-400" />
                <span>Choose or Drop .ics Google Calendar File</span>
              </button>
            </div>

            {/* Parsed Events Preview List */}
            {parsedGcalEvents.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                    Preview Parsed Events ({parsedGcalEvents.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setParsedGcalEvents([])}
                    className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear Preview
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-200 dark:divide-slate-700">
                  {parsedGcalEvents.map((ev, idx) => (
                    <div key={`parsed_${idx}`} className="pt-1.5 flex items-center justify-between gap-2 text-xs">
                      <div className="truncate font-bold text-slate-800 dark:text-slate-200">
                        {ev.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                        {ev.startDate} {ev.endDate !== ev.startDate ? `to ${ev.endDate}` : ''}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setParsedGcalEvents([])}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSyncingGCal}
                    onClick={handleConfirmGcalImport}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    <span>Confirm Import ({parsedGcalEvents.length} Events)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Back Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGoogleSync(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 cursor-pointer"
              >
                Back to Holiday List
              </button>
            </div>
          </div>
        ) : showAddForm ? (
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
