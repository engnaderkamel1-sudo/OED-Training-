import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarRange, 
  Search, 
  Filter, 
  BookOpen, 
  Clock, 
  Users, 
  Layers, 
  CalendarDays, 
  Award, 
  Printer, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2, 
  PlusCircle, 
  TrendingUp, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  BarChart3, 
  Copy, 
  ChevronDown,
  Target,
  ArrowUpRight
} from 'lucide-react';
import { AnnualYearPlan, AnnualPlanCourseTarget, Course } from '../types';

export const AnnualTrainingPlanPage: React.FC = () => {
  const { 
    user, 
    courses, 
    upcomingSessions, 
    cleanedData, 
    annualPlans, 
    saveAnnualPlan, 
    deleteAnnualPlan,
    setCurrentView,
    theme
  } = useAppContext();

  const isDark = theme === 'dark';
  const isAdmin = user?.role === 'admin';

  // Active Top-Level Navigation Tab: 'plan' (Plan & Target Rounds) vs 'achievements' (Progress & Execution Tracker)
  const [activeMainTab, setActiveMainTab] = useState<'plan' | 'achievements'>('plan');

  // Selected Year State (defaults to current year 2026 or newest)
  const availableYears = useMemo(() => {
    const yrs = annualPlans.map(p => p.year);
    if (!yrs.includes(2026)) yrs.push(2026);
    return Array.from(new Set(yrs)).sort((a, b) => b - a);
  }, [annualPlans]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return availableYears[0] || 2026;
  });

  // Active Year Plan
  const currentPlan = useMemo(() => {
    const found = annualPlans.find(p => p.year === selectedYear);
    if (found) return found;
    return {
      id: String(selectedYear),
      year: selectedYear,
      title: `Annual Training Plan ${selectedYear}`,
      status: 'active' as const,
      targets: []
    };
  }, [annualPlans, selectedYear]);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState<'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('ALL');
  const [achievementFilter, setAchievementFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'REMAINING'>('ALL');

  // Modals State
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState(String(new Date().getFullYear() + 1));
  const [cloneFromYear, setCloneFromYear] = useState('none');

  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [targetFormCourseTitle, setTargetFormCourseTitle] = useState('');
  const [targetFormRounds, setTargetFormRounds] = useState('4');
  const [targetFormTrainees, setTargetFormTrainees] = useState('32');
  const [targetFormQuarter, setTargetFormQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [targetFormTrack, setTargetFormTrack] = useState<AnnualPlanCourseTarget['track']>('mechanical');
  const [targetFormDuration, setTargetFormDuration] = useState('5');
  const [targetFormNotes, setTargetFormNotes] = useState('');

  // -------------------------------------------------------------
  // Data Aggregation: Match Real Completed & Scheduled Sessions
  // -------------------------------------------------------------
  const targetsWithExecution = useMemo(() => {
    return (currentPlan.targets || []).map(t => {
      const normalizedTargetTitle = (t.courseTitle || '').trim().toLowerCase();

      // 1. Matches in upcomingSessions collection (Live from Firestore)
      const matchingLiveSessions = upcomingSessions.filter(s => {
        const sTitle = (s.courseTitle || '').trim().toLowerCase();
        return sTitle.includes(normalizedTargetTitle) || normalizedTargetTitle.includes(sTitle);
      });

      const liveCompletedCount = matchingLiveSessions.filter(s => s.status === 'completed' || s.status === 'Completed').length;
      const liveScheduledCount = matchingLiveSessions.filter(s => s.status !== 'completed' && s.status !== 'Completed' && s.status !== 'cancelled' && s.status !== 'Cancelled').length;

      // 2. Matches in cleanedData (Excel master historical records)
      const matchingHistorical = cleanedData.filter(r => {
        const rTitle = (r.courseName || '').trim().toLowerCase();
        return rTitle.includes(normalizedTargetTitle) || normalizedTargetTitle.includes(rTitle);
      });
      // Estimate completed session batches from historical trainee records (avg 8 trainees per session)
      const estimatedHistoricalSessions = Math.min(
        t.targetRounds, 
        Math.floor(matchingHistorical.length / 8) + (matchingHistorical.length > 0 ? 1 : 0)
      );

      const totalCompleted = Math.max(liveCompletedCount, estimatedHistoricalSessions);
      const remaining = Math.max(0, t.targetRounds - totalCompleted);
      const percent = Math.min(100, Math.round((totalCompleted / (t.targetRounds || 1)) * 100));

      let executionStatus: 'completed' | 'in_progress' | 'remaining' = 'remaining';
      if (totalCompleted >= t.targetRounds && t.targetRounds > 0) {
        executionStatus = 'completed';
      } else if (totalCompleted > 0 || liveScheduledCount > 0) {
        executionStatus = 'in_progress';
      }

      return {
        ...t,
        completedRounds: totalCompleted,
        scheduledRounds: liveScheduledCount,
        remainingRounds: remaining,
        completionPercent: percent,
        executionStatus,
        matchingLiveSessions
      };
    });
  }, [currentPlan, upcomingSessions, cleanedData]);

  // Filtered List
  const filteredTargets = useMemo(() => {
    return targetsWithExecution.filter(t => {
      // Quarter filter
      if (selectedQuarter !== 'ALL' && t.quarter !== selectedQuarter) return false;
      // Achievement status filter (when on achievements tab)
      if (activeMainTab === 'achievements') {
        if (achievementFilter === 'COMPLETED' && t.executionStatus !== 'completed') return false;
        if (achievementFilter === 'IN_PROGRESS' && t.executionStatus !== 'in_progress') return false;
        if (achievementFilter === 'REMAINING' && t.executionStatus !== 'remaining') return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.courseTitle || '').toLowerCase().includes(q) || (t.courseTitleEn || '').toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNotes) return false;
      }
      return true;
    });
  }, [targetsWithExecution, selectedQuarter, activeMainTab, achievementFilter, searchQuery]);

  // -------------------------------------------------------------
  // Dual Progress Metrics: Cumulative Annual vs Time-Paced YTD
  // -------------------------------------------------------------
  const now = new Date();
  const currentRealYear = now.getFullYear();
  const currentRealMonth = now.getMonth() + 1; // 1 to 12
  const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
  const currentRealQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 
    currentRealMonth <= 3 ? 'Q1' : currentRealMonth <= 6 ? 'Q2' : currentRealMonth <= 9 ? 'Q3' : 'Q4';

  const quarterIndex: Record<string, number> = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 };
  const currentQuarterNum = quarterIndex[currentRealQuarter];

  let elapsedMonths = 12;
  let timeFraction = 1;
  let isCurrentYearPlan = false;
  if (selectedYear === currentRealYear) {
    elapsedMonths = currentRealMonth;
    timeFraction = elapsedMonths / 12;
    isCurrentYearPlan = true;
  } else if (selectedYear > currentRealYear) {
    elapsedMonths = 0;
    timeFraction = 0;
    isCurrentYearPlan = false;
  } else {
    elapsedMonths = 12;
    timeFraction = 1;
    isCurrentYearPlan = false;
  }

  // Total Target Rounds & Actual Completed Rounds
  const totalTargetRounds = targetsWithExecution.reduce((acc, t) => acc + t.targetRounds, 0);
  const totalCompletedRounds = targetsWithExecution.reduce((acc, t) => acc + t.completedRounds, 0);
  const totalRemainingRounds = targetsWithExecution.reduce((acc, t) => acc + t.remainingRounds, 0);
  const totalScheduledRounds = targetsWithExecution.reduce((acc, t) => acc + t.scheduledRounds, 0);

  // 1. Overall Cumulative Annual Completion Rate (%)
  const overallCompletionRate = totalTargetRounds > 0 ? Math.min(100, Math.round((totalCompletedRounds / totalTargetRounds) * 100)) : 0;

  // 2. Expected Paced Rounds to Date
  const expectedRoundsYTD = timeFraction > 0 ? Math.max(1, Math.round(totalTargetRounds * timeFraction)) : 0;

  // 3. Time-Paced Progress Rate
  const pacedCompletionRate = expectedRoundsYTD > 0 
    ? Math.round((totalCompletedRounds / expectedRoundsYTD) * 100)
    : 0;

  const countCompletedCourses = targetsWithExecution.filter(t => t.executionStatus === 'completed').length;
  const countInProgressCourses = targetsWithExecution.filter(t => t.executionStatus === 'in_progress').length;
  const countRemainingCourses = targetsWithExecution.filter(t => t.executionStatus === 'remaining').length;

  const paceStatus = useMemo(() => {
    if (!isCurrentYearPlan) {
      if (selectedYear < currentRealYear) {
        return {
          label: 'Archived Plan',
          badge: 'bg-slate-700/60 text-slate-200 border border-slate-600'
        };
      }
      return {
        label: 'Upcoming Plan',
        badge: 'bg-blue-900/60 text-blue-200 border border-blue-700/50'
      };
    }
    if (totalTargetRounds === 0) {
      return {
        label: 'Plan In Setup',
        badge: 'bg-slate-700/40 text-slate-300 border border-slate-600'
      };
    }
    if (pacedCompletionRate >= 100) {
      return {
        label: `100% On Schedule (Thru ${currentMonthName})`,
        badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      };
    } else if (pacedCompletionRate >= 80) {
      return {
        label: `Near Target Pace (Thru ${currentMonthName})`,
        badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
      };
    } else {
      return {
        label: `Behind Schedule (Thru ${currentMonthName})`,
        badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
      };
    }
  }, [isCurrentYearPlan, selectedYear, currentRealYear, pacedCompletionRate, currentMonthName, totalTargetRounds]);

  // Track Meta
  const getTrackMeta = (track: AnnualPlanCourseTarget['track']) => {
    switch (track) {
      case 'mechanical':
        return { label: 'Mechanical & Engines', badge: 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60' };
      case 'hydraulic':
        return { label: 'Hydraulics & Powertrain', badge: 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800/60' };
      case 'electrical':
        return { label: 'Electrical & Electronics', badge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60' };
      case 'heavy_machinery':
        return { label: 'Heavy Equipment & Fleet', badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700' };
      case 'tbm':
        return { label: 'Tunneling TBM', badge: 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/60' };
      case 'quality_sos':
      default:
        return { label: 'Diagnostics & S.O.S', badge: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60' };
    }
  };

  // -------------------------------------------------------------
  // Plan Mutations: Add Year, Add/Edit Course
  // -------------------------------------------------------------
  const handleCreateYearPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const yr = parseInt(newYearInput, 10);
    if (isNaN(yr) || yr < 2020 || yr > 2035) {
      alert('Please enter a valid year between 2020 and 2035.');
      return;
    }

    if (annualPlans.some(p => p.year === yr)) {
      alert('A plan for this year already exists.');
      return;
    }

    let clonedTargets: AnnualPlanCourseTarget[] = [];
    if (cloneFromYear && cloneFromYear !== 'none') {
      const sourcePlan = annualPlans.find(p => String(p.year) === cloneFromYear);
      if (sourcePlan) {
        clonedTargets = sourcePlan.targets.map(t => ({
          ...t,
          id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        }));
      }
    }

    const newPlan: AnnualYearPlan = {
      id: String(yr),
      year: yr,
      title: `Annual Training Plan ${yr}`,
      status: 'active',
      targets: clonedTargets,
      createdAt: new Date().toISOString()
    };

    await saveAnnualPlan(newPlan);
    setSelectedYear(yr);
    setIsAddYearModalOpen(false);
  };

  const openAddCourseModal = () => {
    setEditingTargetId(null);
    setTargetFormCourseTitle(courses[0]?.title || '');
    setTargetFormRounds('4');
    setTargetFormTrainees('32');
    setTargetFormQuarter('Q1');
    setTargetFormTrack('mechanical');
    setTargetFormDuration('5');
    setTargetFormNotes('');
    setIsAddCourseModalOpen(true);
  };

  const openEditCourseModal = (target: AnnualPlanCourseTarget) => {
    setEditingTargetId(target.id);
    setTargetFormCourseTitle(target.courseTitle);
    setTargetFormRounds(String(target.targetRounds));
    setTargetFormTrainees(String(target.targetTrainees || 32));
    setTargetFormQuarter(target.quarter);
    setTargetFormTrack(target.track);
    setTargetFormDuration(String(target.durationDays || 5));
    setTargetFormNotes(target.notes || '');
    setIsAddCourseModalOpen(true);
  };

  const handleSaveCourseTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFormCourseTitle.trim()) return;

    const rounds = Math.max(1, parseInt(targetFormRounds, 10) || 1);
    const trainees = Math.max(1, parseInt(targetFormTrainees, 10) || 20);
    const duration = Math.max(1, parseInt(targetFormDuration, 10) || 1);

    let updatedTargets: AnnualPlanCourseTarget[];

    if (editingTargetId) {
      updatedTargets = (currentPlan.targets || []).map(t => {
        if (t.id === editingTargetId) {
          return {
            ...t,
            courseTitle: targetFormCourseTitle.trim(),
            targetRounds: rounds,
            targetTrainees: trainees,
            quarter: targetFormQuarter,
            track: targetFormTrack,
            durationDays: duration,
            notes: targetFormNotes.trim()
          };
        }
        return t;
      });
    } else {
      const newTarget: AnnualPlanCourseTarget = {
        id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        courseTitle: targetFormCourseTitle.trim(),
        targetRounds: rounds,
        targetTrainees: trainees,
        quarter: targetFormQuarter,
        track: targetFormTrack,
        durationDays: duration,
        notes: targetFormNotes.trim()
      };
      updatedTargets = [...(currentPlan.targets || []), newTarget];
    }

    const updatedPlan: AnnualYearPlan = {
      ...currentPlan,
      targets: updatedTargets,
      updatedAt: new Date().toISOString()
    };

    await saveAnnualPlan(updatedPlan);
    setIsAddCourseModalOpen(false);
  };

  const handleDeleteCourseTarget = async (targetId: string) => {
    if (!window.confirm('Are you sure you want to remove this course target from the annual plan?')) return;
    const updatedTargets = (currentPlan.targets || []).filter(t => t.id !== targetId);
    await saveAnnualPlan({
      ...currentPlan,
      targets: updatedTargets,
      updatedAt: new Date().toISOString()
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      
      {/* 1. Executive Orascom Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#002D62] via-[#001D42] to-[#0A2244] text-white p-6 sm:p-8 shadow-md border border-blue-900/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold tracking-wide">
              <CalendarRange size={13} />
              <span>Equipment Department (OED) — {selectedYear} Annual Training Plan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Annual Training Plan & Achievement Tracking</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Manage approved annual training courses, define round targets per program, and monitor real-time schedule compliance and remaining sessions.
            </p>
          </div>

          {/* Quick Year Selector & Print Header Action */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 print:hidden">
            {/* Year Selector */}
            <div className="bg-white/10 rounded-xl p-1 flex items-center gap-1 border border-white/15 backdrop-blur-sm">
              {availableYears.map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {yr}
                </button>
              ))}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddYearModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 hover:bg-white/15 transition-all flex items-center gap-1 cursor-pointer"
                  title="Add New Year Plan"
                >
                  <PlusCircle size={13} />
                  <span>+ Year</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 border border-white/20 transition-all cursor-pointer"
              title="Print Plan Report"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Strip: Dual Metric (Paced vs Cumulative) */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Time-Paced Completion Rate */}
          <div className="bg-white/10 rounded-xl p-3.5 border border-white/20 shadow-xs relative overflow-hidden flex flex-col justify-between backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-slate-200 font-bold flex items-center gap-1">
                  <span>⏱️</span>
                  <span>Paced Pace (Thru {currentMonthName})</span>
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${paceStatus.badge}`}>
                  {paceStatus.label.split(' ')[0]}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-300">
                  {pacedCompletionRate}%
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  ({totalCompletedRounds} / {expectedRoundsYTD} rounds)
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    pacedCompletionRate >= 100 ? 'bg-emerald-400' : pacedCompletionRate >= 80 ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${Math.min(100, pacedCompletionRate)}%` }} 
                />
              </div>
              <span className="text-[10px] text-slate-300 block mt-1">
                YTD Expected Target: {expectedRoundsYTD} rounds
              </span>
            </div>
          </div>

          {/* Card 2: Cumulative Annual Full-Year Completion Rate */}
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                <span>📈</span>
                <span>Full Year Target (12 Months)</span>
              </span>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {overallCompletionRate}%
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  ({totalCompletedRounds} / {totalTargetRounds})
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-500" 
                  style={{ width: `${overallCompletionRate}%` }} 
                />
              </div>
              <span className="text-[10px] text-slate-300 block mt-1">
                Annual Progress: {totalCompletedRounds} of {totalTargetRounds} rounds
              </span>
            </div>
          </div>

          {/* Card 3: Target Total Rounds */}
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                <span>🎯</span>
                <span>Annual Target Rounds</span>
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-300 mt-1.5 block">
                {totalTargetRounds} <span className="text-xs font-bold text-slate-300">Rounds</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-300 block mt-2.5">
              {targetsWithExecution.length} Approved Programs
            </span>
          </div>

          {/* Card 4: Remaining Rounds */}
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                <span>⏳</span>
                <span>Remaining Target Rounds</span>
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-200 mt-1.5 block">
                {totalRemainingRounds} <span className="text-xs font-bold text-slate-300">Rounds</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-300 block mt-2.5">
              {totalScheduledRounds} Currently Scheduled
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Tab Switcher: Plan vs Achievements */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 print:hidden">
        {/* Core 2 Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMainTab('plan')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'plan'
                ? 'bg-[#002D62] text-white shadow-sm dark:bg-blue-900 dark:text-white'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BookOpen size={16} />
            <span>{selectedYear} Plan & Target Rounds</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20">
              {targetsWithExecution.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('achievements')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'achievements'
                ? 'bg-[#002D62] text-white shadow-sm dark:bg-blue-900 dark:text-white'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <TrendingUp size={16} />
            <span>Progress & Achievement Tracker</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              overallCompletionRate >= 70 ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'
            }`}>
              {overallCompletionRate}%
            </span>
          </button>
        </div>

        {/* Action Button: Add Course Target (when on plan tab and Admin) */}
        {isAdmin && activeMainTab === 'plan' && (
          <button
            type="button"
            onClick={openAddCourseModal}
            className="px-4 py-2 rounded-xl bg-[#002D62] hover:bg-blue-950 dark:bg-blue-800 dark:hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <PlusCircle size={15} className="text-amber-400" />
            <span>Add Course Target to Plan</span>
          </button>
        )}
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 print:hidden">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses by title or topic..."
            className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-[#002D62] text-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Quarter Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
            <button
              key={q}
              type="button"
              onClick={() => setSelectedQuarter(q)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedQuarter === q
                  ? 'bg-[#002D62] text-white dark:bg-amber-400 dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {q === 'ALL' ? 'All Quarters' : q}
            </button>
          ))}
        </div>

        {/* Achievements Filter (only visible on achievements tab) */}
        {activeMainTab === 'achievements' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'COMPLETED', label: `Completed (${countCompletedCourses})` },
              { id: 'IN_PROGRESS', label: `In Progress (${countInProgressCourses})` },
              { id: 'REMAINING', label: `Remaining (${countRemainingCourses})` }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAchievementFilter(f.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  achievementFilter === f.id
                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. TAB CONTENT 1: Plan & Round Targets */}
      {activeMainTab === 'plan' && (
        <div className="space-y-4">
          {filteredTargets.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 space-y-3">
              <BookOpen size={40} className="mx-auto text-slate-400" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No courses recorded in {selectedYear} plan yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Click below to add approved technical training courses and assign target rounds for each quarter.
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openAddCourseModal}
                  className="px-5 py-2.5 rounded-xl bg-[#002D62] hover:bg-blue-950 dark:bg-blue-800 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  Add First Course to Plan
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTargets.map(t => {
                const trackMeta = getTrackMeta(t.track);
                return (
                  <motion.div
                    key={t.id}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[#002D62] dark:text-amber-400 border border-slate-200 dark:border-slate-700">
                          {t.quarter}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border truncate max-w-[170px] ${trackMeta.badge}`}>
                          {trackMeta.label}
                        </span>
                      </div>

                      {/* Course Title */}
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                          {t.courseTitle}
                        </h3>
                        {t.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            📍 {t.notes}
                          </p>
                        )}
                      </div>

                      {/* Target Rounds & Trainees Pill Box */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Target Rounds</span>
                          <strong className="text-sm font-black text-[#002D62] dark:text-amber-400">
                            {t.targetRounds} Rounds
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Target Trainees</span>
                          <strong className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t.targetTrainees || t.targetRounds * 8} Trainees
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" />
                        <span>{t.durationDays} Days</span>
                      </span>

                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditCourseModal(t)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#002D62] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit target rounds"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCourseTarget(t.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                              title="Remove from plan"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT 2: Progress & Achievements Tracker */}
      {activeMainTab === 'achievements' && (
        <div className="space-y-4">
          {/* Schedule Alignment Callout Banner */}
          <div className="bg-gradient-to-r from-[#002D62] via-[#001D42] to-[#0A2244] rounded-2xl p-5 text-white shadow-sm border border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">⏱️</span>
                <h3 className="font-black text-sm sm:text-base text-white">
                  Intelligent Schedule Pacing for {currentMonthName} ({currentRealQuarter})
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${paceStatus.badge}`}>
                  {paceStatus.label}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                Based on the elapsed timeline ({elapsedMonths} of 12 months), the target rounds required to date are {expectedRoundsYTD} rounds. Actual completed sessions ({totalCompletedRounds} rounds) represent a {pacedCompletionRate}% compliance with current schedule targets, while total annual completion stands at {overallCompletionRate}%.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 bg-white/10 p-3 rounded-xl border border-white/15">
              <div className="text-center px-2">
                <span className="text-[10px] text-slate-300 block font-medium">Paced Progress</span>
                <span className="text-xl sm:text-2xl font-black text-amber-300">{pacedCompletionRate}%</span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center px-2">
                <span className="text-[10px] text-slate-300 block font-medium">Annual Total</span>
                <span className="text-xl sm:text-2xl font-black text-white">{overallCompletionRate}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Training Program</th>
                    <th className="py-3.5 px-4 text-center">Quarter</th>
                    <th className="py-3.5 px-4 text-center">Schedule Pace</th>
                    <th className="py-3.5 px-4 text-center">Target</th>
                    <th className="py-3.5 px-4 text-center">Completed</th>
                    <th className="py-3.5 px-4 text-center">Remaining</th>
                    <th className="py-3.5 px-4 min-w-[170px]">Completion Rate</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    {isAdmin && <th className="py-3.5 px-4 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTargets.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-slate-400">
                        No courses recorded in {selectedYear} plan yet. Add courses in the Plan tab to track execution.
                      </td>
                    </tr>
                  ) : (
                    filteredTargets.map(t => {
                      const trackMeta = getTrackMeta(t.track);
                      const qNum = quarterIndex[t.quarter] || 1;
                      
                      let scheduleBadge = {
                        text: '✓ Completed',
                        classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      };
                      if (t.executionStatus === 'completed') {
                        scheduleBadge = {
                          text: '✓ Completed',
                          classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        };
                      } else if (isCurrentYearPlan) {
                        if (qNum < currentQuarterNum) {
                          scheduleBadge = {
                            text: '⚠️ Past Quarter',
                            classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          };
                        } else if (qNum === currentQuarterNum) {
                          scheduleBadge = {
                            text: '⚡ Current Quarter',
                            classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          };
                        } else {
                          scheduleBadge = {
                            text: '📅 Upcoming',
                            classes: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          };
                        }
                      } else {
                        scheduleBadge = {
                          text: selectedYear < currentRealYear ? 'Archived' : 'Upcoming',
                          classes: 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        };
                      }

                      return (
                        <tr 
                          key={t.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                              {t.courseTitle}
                            </div>
                            <div className="mt-0.5">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${trackMeta.badge}`}>
                                {trackMeta.label}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {t.quarter}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${scheduleBadge.classes}`}>
                              {scheduleBadge.text}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center font-black text-[#002D62] dark:text-amber-400">
                            {t.targetRounds} Rounds
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                            {t.completedRounds} Rounds
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`font-bold ${
                              t.remainingRounds === 0 ? 'text-slate-400' : 'text-amber-600 dark:text-amber-400 font-black'
                            }`}>
                              {t.remainingRounds} Left
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span className="text-slate-700 dark:text-slate-300">
                                  {t.completedRounds} / {t.targetRounds}
                                </span>
                                <span className={t.completionPercent === 100 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-600 dark:text-slate-400'}>
                                  {t.completionPercent}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    t.completionPercent === 100 
                                      ? 'bg-emerald-600 dark:bg-emerald-500' 
                                      : t.completionPercent > 0 
                                        ? 'bg-[#002D62] dark:bg-amber-400' 
                                        : 'bg-slate-300 dark:bg-slate-700'
                                  }`}
                                  style={{ width: `${t.completionPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {t.executionStatus === 'completed' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                <CheckCircle size={12} />
                                <span>Completed</span>
                              </span>
                            ) : t.executionStatus === 'in_progress' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                                <Clock size={12} />
                                <span>In Progress</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                                <span>Pending</span>
                              </span>
                            )}
                          </td>

                          {isAdmin && (
                            <td className="py-3.5 px-4 text-center">
                              {t.remainingRounds > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setCurrentView('tools_parent')}
                                  className="px-2.5 py-1 rounded-lg bg-[#002D62] hover:bg-blue-950 dark:bg-blue-800 text-white font-bold text-[10px] transition-all cursor-pointer whitespace-nowrap"
                                >
                                  Schedule
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                  ✓ Target Met
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: Add New Year Plan */}
      <AnimatePresence>
        {isAddYearModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarRange className="text-[#002D62] dark:text-amber-400" size={18} />
                  <span>Create New Year Training Plan</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddYearModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateYearPlan} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Training Year
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2035"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D62]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Clone Courses From Existing Year (Optional)
                  </label>
                  <select
                    value={cloneFromYear}
                    onChange={(e) => setCloneFromYear(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="none">Start empty without prefilled courses</option>
                    {annualPlans.map(p => (
                      <option key={p.year} value={String(p.year)}>
                        Clone courses from {p.year} ({p.targets.length} courses)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddYearModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#002D62] text-white hover:bg-blue-950 dark:bg-blue-800 dark:hover:bg-blue-700 font-bold shadow-xs cursor-pointer"
                  >
                    Create Plan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. MODAL: Add / Edit Course Target */}
      <AnimatePresence>
        {isAddCourseModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="text-[#002D62] dark:text-amber-400" size={18} />
                  <span>
                    {editingTargetId 
                      ? 'Edit Course Target' 
                      : `Add Course Target to ${selectedYear} Plan`}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCourseTarget} className="space-y-3.5 text-xs">
                {/* Course Title Selection / Input */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Course Title
                  </label>
                  <input
                    type="text"
                    list="availableCoursesList"
                    value={targetFormCourseTitle}
                    onChange={(e) => setTargetFormCourseTitle(e.target.value)}
                    required
                    placeholder="Select from courses catalog or type course title..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D62]"
                  />
                  <datalist id="availableCoursesList">
                    {courses.map(c => (
                      <option key={c.id} value={c.title} />
                    ))}
                  </datalist>
                </div>

                {/* Target Rounds & Trainees */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#002D62] dark:text-amber-400 block mb-1">
                      Target Rounds / Sessions
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={targetFormRounds}
                      onChange={(e) => setTargetFormRounds(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-black text-[#002D62] dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-[#002D62]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Target Trainees
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetFormTrainees}
                      onChange={(e) => setTargetFormTrainees(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Quarter & Track */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Target Quarter
                    </label>
                    <select
                      value={targetFormQuarter}
                      onChange={(e) => setTargetFormQuarter(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <option value="Q1">Q1 (First Quarter)</option>
                      <option value="Q2">Q2 (Second Quarter)</option>
                      <option value="Q3">Q3 (Third Quarter)</option>
                      <option value="Q4">Q4 (Fourth Quarter)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Technical Track
                    </label>
                    <select
                      value={targetFormTrack}
                      onChange={(e) => setTargetFormTrack(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <option value="mechanical">Mechanical & Engines</option>
                      <option value="hydraulic">Hydraulics & Powertrain</option>
                      <option value="electrical">Electrical & Electronics</option>
                      <option value="heavy_machinery">Heavy Equipment & Fleet</option>
                      <option value="tbm">Tunneling TBM</option>
                      <option value="quality_sos">Diagnostics & S.O.S</option>
                    </select>
                  </div>
                </div>

                {/* Duration & Notes */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={targetFormDuration}
                      onChange={(e) => setTargetFormDuration(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Venue / Training Notes
                    </label>
                    <input
                      type="text"
                      value={targetFormNotes}
                      onChange={(e) => setTargetFormNotes(e.target.value)}
                      placeholder="e.g. Katamia Central Workshop..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCourseModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#002D62] text-white hover:bg-blue-950 dark:bg-blue-800 dark:hover:bg-blue-700 font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>Save Target</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
