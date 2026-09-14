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
  ChevronDown
} from 'lucide-react';
import { AnnualYearPlan, AnnualPlanCourseTarget, Course } from '../types';

export const AnnualTrainingPlanPage: React.FC = () => {
  const { 
    language, 
    user, 
    courses, 
    upcomingSessions, 
    cleanedData, 
    annualPlans, 
    saveAnnualPlan, 
    deleteAnnualPlan,
    setCurrentView 
  } = useAppContext();

  const isAr = language === 'ar';
  const isAdmin = user?.role === 'admin';

  // Active Top-Level Navigation Tab: 'plan' (الخطة والمستهدفات) vs 'achievements' (متابعة الإنجاز)
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
      title: isAr ? `خطة التدريب السنوية ${selectedYear}` : `Annual Training Plan ${selectedYear}`,
      status: 'active' as const,
      targets: []
    };
  }, [annualPlans, selectedYear, isAr]);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState<'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('ALL');
  const [achievementFilter, setAchievementFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'REMAINING'>('ALL');

  // Modals State
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState(String(new Date().getFullYear() + 1));
  const [cloneFromYear, setCloneFromYear] = useState('2026');

  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [targetFormCourseTitle, setTargetFormCourseTitle] = useState('');
  const [targetFormRounds, setTargetFormRounds] = useState('4');
  const [targetFormTrainees, setTargetFormTrainees] = useState('32');
  const [targetFormQuarter, setTargetFormQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [targetFormTrack, setTargetFormTrack] = useState<AnnualPlanCourseTarget['track']>('mechanical');
  const [targetFormDuration, setTargetFormDuration] = useState('5');
  const [targetFormNotes, setTargetFormNotes] = useState('');

  // Course Details Modal
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<AnnualPlanCourseTarget | null>(null);

  // -------------------------------------------------------------
  // Data Aggregation: Match Real Completed & Scheduled Sessions
  // -------------------------------------------------------------
  const targetsWithExecution = useMemo(() => {
    return currentPlan.targets.map(t => {
      const normalizedTargetTitle = t.courseTitle.trim().toLowerCase();

      // 1. Matches in upcomingSessions collection (Live from Firestore)
      const matchingLiveSessions = upcomingSessions.filter(s => {
        const sTitle = (s.courseTitle || '').trim().toLowerCase();
        return sTitle.includes(normalizedTargetTitle) || normalizedTargetTitle.includes(sTitle);
      });

      const liveCompletedCount = matchingLiveSessions.filter(s => s.status === 'completed').length;
      const liveScheduledCount = matchingLiveSessions.filter(s => s.status !== 'completed' && s.status !== 'cancelled').length;

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
        const matchTitle = t.courseTitle.toLowerCase().includes(q) || (t.courseTitleEn || '').toLowerCase().includes(q);
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
  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const currentMonthName = isAr ? monthNamesAr[currentRealMonth - 1] : now.toLocaleString('en-US', { month: 'long' });
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

  // 2. Expected Paced Rounds to Date (المستهدف الزمني المطلوب إنجازه حتى اليوم)
  const expectedRoundsYTD = timeFraction > 0 ? Math.max(1, Math.round(totalTargetRounds * timeFraction)) : 0;

  // 3. Time-Paced Progress Rate (نسبة الإنجاز الزمني مقارنة بالمستهدف حتى اليوم)
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
          label: isAr ? 'خطة سابقة مكتملة' : 'Archived Plan',
          color: 'text-slate-400',
          badge: 'bg-slate-700 text-slate-200'
        };
      }
      return {
        label: isAr ? 'خطة قادمة لم تبدأ' : 'Upcoming Plan',
        color: 'text-blue-300',
        badge: 'bg-blue-900/60 text-blue-200'
      };
    }
    if (pacedCompletionRate >= 100) {
      return {
        label: isAr ? `⭐ ملتزم بالخطة الزمنية (100% حتى ${currentMonthName})` : `100% On Schedule (Thru ${currentMonthName})`,
        color: 'text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      };
    } else if (pacedCompletionRate >= 80) {
      return {
        label: isAr ? `🟢 أداء جيد ومقارب للخطة (حتى ${currentMonthName})` : `Near Target Pace (Thru ${currentMonthName})`,
        color: 'text-[#FFC000]',
        badge: 'bg-[#FFC000]/20 text-[#FFC000] border border-[#FFC000]/30'
      };
    } else {
      return {
        label: isAr ? `🟡 متأخر عن الخطة الزمنية حتى ${currentMonthName}` : `Behind Schedule (Thru ${currentMonthName})`,
        color: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
      };
    }
  }, [isCurrentYearPlan, selectedYear, currentRealYear, pacedCompletionRate, currentMonthName, isAr]);

  // Track Meta & Colors
  const getTrackMeta = (track: AnnualPlanCourseTarget['track']) => {
    switch (track) {
      case 'mechanical':
        return { label: isAr ? 'ميكانيكا ومحركات' : 'Mechanical & Engines', dot: 'bg-[#002D62]' };
      case 'hydraulic':
        return { label: isAr ? 'هيدروليك وقوى' : 'Hydraulics & Powertrain', dot: 'bg-blue-600' };
      case 'electrical':
        return { label: isAr ? 'كهرباء وإلكترونيات' : 'Electrical & Electronics', dot: 'bg-amber-600' };
      case 'heavy_machinery':
        return { label: isAr ? 'معدات ثقيلة وأسطول' : 'Heavy Equipment & Fleet', dot: 'bg-slate-700 dark:bg-slate-300' };
      case 'tbm':
        return { label: isAr ? 'حفر الأنفاق TBM' : 'Tunneling TBM', dot: 'bg-indigo-700' };
      case 'quality_sos':
      default:
        return { label: isAr ? 'فحص الزيوت والجودة S.O.S' : 'Oil Analysis & Quality S.O.S', dot: 'bg-[#002D62]' };
    }
  };

  // -------------------------------------------------------------
  // Plan Mutations: Add Year, Add/Edit Course
  // -------------------------------------------------------------
  const handleCreateYearPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const yr = parseInt(newYearInput, 10);
    if (isNaN(yr) || yr < 2020 || yr > 2035) {
      alert(isAr ? 'يرجى إدخال سنة صحيحة' : 'Please enter a valid year');
      return;
    }

    // Check if year exists
    if (annualPlans.some(p => p.year === yr)) {
      alert(isAr ? 'هذه السنة موجودة بالفعل' : 'This year plan already exists');
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
      title: isAr ? `خطة التدريب السنوية ${yr}` : `Annual Training Plan ${yr}`,
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
    setTargetFormTrainees(String(target.targetTrainees || 30));
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
      updatedTargets = currentPlan.targets.map(t => {
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
      updatedTargets = [...currentPlan.targets, newTarget];
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
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الدورة من الخطة؟' : 'Remove this course from the plan?')) return;
    const updatedTargets = currentPlan.targets.filter(t => t.id !== targetId);
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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive Orascom Header Banner */}
      <div className="rounded-2xl bg-[#002D62] text-white p-6 sm:p-8 shadow-sm border border-slate-700/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC000]/15 text-[#FFC000] border border-[#FFC000]/30 text-xs font-bold">
              <CalendarRange size={13} />
              <span>{isAr ? `إدارة المعدات المركزية - خطة عام ${selectedYear}` : `Equipment Department - ${selectedYear} Annual Plan`}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{isAr ? 'منظومة خطة التدريب السنوية ومتابعة الإنجاز' : 'Annual Training Plan & Achievement Tracking'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAr 
                ? 'إدارة الخطط التدريبية السنوية المعتمدة، تحديد عدد الدورات المستهدفة لكل برنامج، ومتابعة نسب الإنجاز والدورات المتبقية والمنفذة فعلياً.'
                : 'Manage approved annual training programs, define round targets per course, and track real-time execution rates and remaining sessions.'}
            </p>
          </div>

          {/* Quick Year Selector & Print Header Action */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 print:hidden">
            {/* Year Selector */}
            <div className="bg-white/10 rounded-xl p-1 flex items-center gap-1 border border-white/15">
              {availableYears.map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-[#FFC000] text-[#001D42] shadow-xs'
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
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#FFC000] hover:bg-white/15 transition-all flex items-center gap-1 cursor-pointer"
                  title={isAr ? 'إضافة خطة لسنة جديدة' : 'Add new year plan'}
                >
                  <PlusCircle size={13} />
                  <span>{isAr ? 'سنة جديدة' : '+ Year'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 border border-white/20 transition-all cursor-pointer"
              title={isAr ? 'طباعة تقرير الخطة' : 'Print Plan Report'}
            >
              <Printer size={15} />
              <span>{isAr ? 'طباعة' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Strip: Dual Metric (Paced vs Cumulative) */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Time-Paced Completion Rate (المعدل الزمني التراكمي حتى الشهر الحالي) */}
          <div className="bg-white/10 rounded-xl p-3 border border-white/20 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-slate-200 font-bold flex items-center gap-1">
                  <span>⏱️</span>
                  <span>{isAr ? `الإنجاز الزمني (حتى ${currentMonthName})` : `Paced Pace (Thru ${currentMonthName})`}</span>
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${paceStatus.badge}`}>
                  {paceStatus.label.split(' ')[0]}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-[#FFC000]">
                  {pacedCompletionRate}%
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  ({totalCompletedRounds} / {expectedRoundsYTD} {isAr ? 'دورة' : 'rnd'})
                </span>
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    pacedCompletionRate >= 100 ? 'bg-emerald-400' : pacedCompletionRate >= 80 ? 'bg-[#FFC000]' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, pacedCompletionRate)}%` }} 
                />
              </div>
              <span className="text-[10px] text-slate-300 block mt-1">
                {isAr ? `المستهدف حتى نهاية ${currentMonthName}: ${expectedRoundsYTD} دورة` : `YTD Target: ${expectedRoundsYTD} rounds`}
              </span>
            </div>
          </div>

          {/* Card 2: Cumulative Annual Full-Year Completion Rate (نسبة الإنجاز السنوية الكلية) */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                <span>📈</span>
                <span>{isAr ? 'الإنجاز السنوي الكلي (12 شهر)' : 'Full Year Completion (12M)'}</span>
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {overallCompletionRate}%
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  ({totalCompletedRounds} / {totalTargetRounds})
                </span>
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-500" 
                  style={{ width: `${overallCompletionRate}%` }} 
                />
              </div>
              <span className="text-[10px] text-slate-300 block mt-1">
                {isAr ? `إجمالي العام: ${totalCompletedRounds} من ${totalTargetRounds} دورة` : `Total Year: ${totalCompletedRounds} of ${totalTargetRounds}`}
              </span>
            </div>
          </div>

          {/* Card 3: Target Total Rounds */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                <span>🎯</span>
                <span>{isAr ? 'إجمالي مستهدف العام' : 'Full Year Plan Target'}</span>
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#FFC000] mt-1 block">
                {totalTargetRounds} <span className="text-xs font-bold text-slate-300">{isAr ? 'دورة' : 'Rounds'}</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-300 block mt-2">
              {targetsWithExecution.length} {isAr ? 'برامج تدريبية معتمدة' : 'Approved Programs'}
            </span>
          </div>

          {/* Card 4: Remaining Rounds */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                <span>⏳</span>
                <span>{isAr ? 'الدورات المتبقية للتنفيذ' : 'Remaining Target Rounds'}</span>
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-300 mt-1 block">
                {totalRemainingRounds} <span className="text-xs font-bold text-slate-300">{isAr ? 'دورة' : 'Rounds'}</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-300 block mt-2">
              {totalScheduledRounds} {isAr ? 'دورات مجدولة حالياً' : 'Currently Scheduled'}
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
                ? 'bg-[#002D62] text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <BookOpen size={16} />
            <span>{isAr ? `خطة سنة ${selectedYear} والمستهدفات` : `${selectedYear} Plan & Round Targets`}</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20">
              {targetsWithExecution.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('achievements')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'achievements'
                ? 'bg-[#002D62] text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <TrendingUp size={16} />
            <span>{isAr ? 'متابعة الإنجاز ونسبة التحقيق' : 'Progress & Achievements Tracker'}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              overallCompletionRate >= 70 ? 'bg-emerald-500 text-white' : 'bg-[#FFC000] text-[#001D42]'
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
            className="px-4 py-2 rounded-xl bg-[#002D62] hover:bg-blue-950 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <PlusCircle size={15} className="text-[#FFC000]" />
            <span>{isAr ? 'إضافة دورة للخطة السنوية' : 'Add Course Target to Plan'}</span>
          </button>
        )}
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 print:hidden">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث باسم الكورس أو المحور الفني...' : 'Search courses or topics...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-9 text-xs focus:outline-none focus:ring-1 focus:ring-[#002D62] text-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="absolute left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto top-1/2 -translate-y-1/2 text-slate-400"
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
                  ? 'bg-[#002D62] text-white dark:bg-[#FFC000] dark:text-[#001D42]'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {q === 'ALL' ? (isAr ? 'كل الفصول' : 'All Quarters') : q}
            </button>
          ))}
        </div>

        {/* Achievements Filter (only visible on achievements tab) */}
        {activeMainTab === 'achievements' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', labelAr: 'الكل', labelEn: 'All' },
              { id: 'COMPLETED', labelAr: `تمت بالكامل (${countCompletedCourses})`, labelEn: `Completed (${countCompletedCourses})` },
              { id: 'IN_PROGRESS', labelAr: `قيد التنفيذ (${countInProgressCourses})`, labelEn: `In Progress (${countInProgressCourses})` },
              { id: 'REMAINING', labelAr: `متبقية (${countRemainingCourses})`, labelEn: `Remaining (${countRemainingCourses})` }
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
                {isAr ? f.labelAr : f.labelEn}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. TAB CONTENT 1: Plan & Round Targets */}
      {activeMainTab === 'plan' && (
        <div className="space-y-4">
          {filteredTargets.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 space-y-3">
              <BookOpen size={36} className="mx-auto text-slate-400" />
              <p className="text-sm font-bold">
                {isAr ? `لا توجد دورات مسجلة في خطة عام ${selectedYear} حالياً` : `No courses in ${selectedYear} plan yet`}
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openAddCourseModal}
                  className="px-4 py-2 rounded-xl bg-[#002D62] text-white text-xs font-bold cursor-pointer hover:bg-blue-950"
                >
                  {isAr ? 'إضافة الدورة الأولى للخطة' : 'Add First Course to Plan'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTargets.map(t => {
                const track = getTrackMeta(t.track);
                return (
                  <motion.div
                    key={t.id}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#002D62] dark:text-[#FFC000]">
                          {t.quarter}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span className={`w-2 h-2 rounded-full ${track.dot}`} />
                          <span className="text-[11px] truncate max-w-[130px]">{track.label}</span>
                        </div>
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
                          <span className="text-[10px] text-slate-400 block">{isAr ? 'عدد الدورات المستهدفة' : 'Target Rounds'}</span>
                          <strong className="text-sm font-black text-[#002D62] dark:text-[#FFC000]">
                            {t.targetRounds} {isAr ? 'دورات' : 'Rounds'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{isAr ? 'المتدربون المستهدفون' : 'Target Trainees'}</span>
                          <strong className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t.targetTrainees || t.targetRounds * 8} {isAr ? 'متدرب' : 'Trainees'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        ⏱️ {t.durationDays} {isAr ? 'أيام تدريبية' : 'Days'}
                      </span>

                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditCourseModal(t)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#002D62] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title={isAr ? 'تعديل عدد الدورات' : 'Edit rounds target'}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCourseTarget(t.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                              title={isAr ? 'حذف من الخطة' : 'Remove from plan'}
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
          {/* Schedule Alignment Callout Banner (شرح التوافق الزمني وحساب نسبة الإنجاز) */}
          <div className="bg-gradient-to-r from-[#002D62] to-[#001833] rounded-2xl p-4 sm:p-5 text-white shadow-sm border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">⏱️</span>
                <h3 className="font-black text-sm sm:text-base text-white">
                  {isAr ? `المتابعة الزمنية الذكية لشهر ${currentMonthName} (${currentRealQuarter})` : `Intelligent Schedule Pacing for ${currentMonthName} (${currentRealQuarter})`}
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${paceStatus.badge}`}>
                  {paceStatus.label}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {isAr
                  ? `بناءً على الخطة الزمنية المنقضية (${elapsedMonths} من 12 شهراً)، المستهدف الزمني المطلوب إنجازه حتى اليوم هو ${expectedRoundsYTD} دورة تدريبية. إنجازكم الفعلي (${totalCompletedRounds} دورة) يمثل التزاماً بنسبة ${pacedCompletionRate}% من المستهدف الزمني، في حين تبلغ نسبة التحقيق السنوية الكلية ${overallCompletionRate}%.`
                  : `Based on the elapsed time (${elapsedMonths} of 12 months), the expected YTD target is ${expectedRoundsYTD} rounds. Actual execution (${totalCompletedRounds} rounds) represents ${pacedCompletionRate}% schedule compliance, while total annual completion stands at ${overallCompletionRate}%.`}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 bg-white/10 p-3 rounded-xl border border-white/15">
              <div className="text-center px-2">
                <span className="text-[10px] text-slate-300 block">{isAr ? 'الإنجاز الزمني' : 'Paced Pace'}</span>
                <span className="text-xl sm:text-2xl font-black text-[#FFC000]">{pacedCompletionRate}%</span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center px-2">
                <span className="text-[10px] text-slate-300 block">{isAr ? 'السنوي الكلي' : 'Annual Total'}</span>
                <span className="text-xl sm:text-2xl font-black text-white">{overallCompletionRate}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">{isAr ? 'اسم البرنامج التدريبي' : 'Training Program'}</th>
                    <th className="py-3.5 px-4 text-center">{isAr ? 'الفصل' : 'Quarter'}</th>
                    <th className="py-3.5 px-4 text-center">{isAr ? 'الموقف الزمني' : 'Schedule Pace'}</th>
                    <th className="py-3.5 px-4 text-center">{isAr ? 'المستهدف' : 'Target'}</th>
                    <th className="py-3.5 px-4 text-center">{isAr ? 'المنفذ فعلياً' : 'Completed'}</th>
                    <th className="py-3.5 px-4 text-center">{isAr ? 'المتبقي' : 'Remaining'}</th>
                    <th className="py-3.5 px-4 min-w-[170px]">{isAr ? 'نسبة التحقيق والإنجاز' : 'Completion Rate'}</th>
                    <th className="py-3.5 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    {isAdmin && <th className="py-3.5 px-4 text-center">{isAr ? 'إجراء سريع' : 'Action'}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTargets.map(t => {
                    const track = getTrackMeta(t.track);
                    const qNum = quarterIndex[t.quarter] || 1;
                    
                    // Schedule alignment evaluation
                    let scheduleBadge = {
                      text: isAr ? '✓ مكتمل' : '✓ Completed',
                      classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    };
                    if (t.executionStatus === 'completed') {
                      scheduleBadge = {
                        text: isAr ? '✓ مكتمل' : '✓ Completed',
                        classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      };
                    } else if (isCurrentYearPlan) {
                      if (qNum < currentQuarterNum) {
                        scheduleBadge = {
                          text: isAr ? '⚠️ متأخر عن الفصل' : '⚠️ Past Quarter',
                          classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        };
                      } else if (qNum === currentQuarterNum) {
                        scheduleBadge = {
                          text: isAr ? '⚡ جاري في الربع الحالي' : '⚡ Current Quarter',
                          classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        };
                      } else {
                        scheduleBadge = {
                          text: isAr ? '📅 مقرر لاحقاً' : '📅 Upcoming',
                          classes: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        };
                      }
                    } else {
                      scheduleBadge = {
                        text: selectedYear < currentRealYear ? (isAr ? 'منتهي' : 'Archived') : (isAr ? 'قادم' : 'Upcoming'),
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
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${track.dot}`} />
                            <span className="text-[11px] text-slate-400">{track.label}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-black text-slate-700 dark:text-slate-300">
                            {t.quarter}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${scheduleBadge.classes}`}>
                            {scheduleBadge.text}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-black text-[#002D62] dark:text-[#FFC000]">
                          {t.targetRounds} {isAr ? 'دورات' : 'Rounds'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {t.completedRounds} {isAr ? 'دورة' : 'Rounds'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-bold ${
                            t.remainingRounds === 0 ? 'text-slate-400' : 'text-amber-600 dark:text-amber-400 font-black'
                          }`}>
                            {t.remainingRounds} {isAr ? 'متبقي' : 'Left'}
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
                                      ? 'bg-[#002D62] dark:bg-[#FFC000]' 
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
                              <span>{isAr ? 'مكتمل بالكامل' : 'Completed'}</span>
                            </span>
                          ) : t.executionStatus === 'in_progress' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                              <Clock size={12} />
                              <span>{isAr ? 'قيد التنفيذ' : 'In Progress'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                              <span>{isAr ? 'بانتظار البدء' : 'Pending'}</span>
                            </span>
                          )}
                        </td>

                        {isAdmin && (
                          <td className="py-3.5 px-4 text-center">
                            {t.remainingRounds > 0 ? (
                              <button
                                type="button"
                                onClick={() => setCurrentView('tools_parent')}
                                className="px-2.5 py-1 rounded-lg bg-[#002D62] hover:bg-blue-950 text-white font-bold text-[10px] transition-all cursor-pointer whitespace-nowrap"
                              >
                                {isAr ? 'جدولة جلسة' : 'Schedule'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                ✓ {isAr ? 'تم المستهدف' : 'Fulfilled'}
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
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
                  <CalendarRange className="text-[#002D62] dark:text-[#FFC000]" size={18} />
                  <span>{isAr ? 'إنشاء خطة تدريب لسنة جديدة' : 'Create New Year Training Plan'}</span>
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
                    {isAr ? 'السنة التدريبية (Year)' : 'Training Year'}
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
                    {isAr ? 'نسخ المقررات من خطة سابقة (اختياري)' : 'Clone courses from year (Optional)'}
                  </label>
                  <select
                    value={cloneFromYear}
                    onChange={(e) => setCloneFromYear(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="none">{isAr ? 'بدء بخطة فارغة بدون كورسات' : 'Start empty without courses'}</option>
                    {annualPlans.map(p => (
                      <option key={p.year} value={String(p.year)}>
                        {isAr ? `نسخ مقررات خطة عام ${p.year} (${p.targets.length} دورات)` : `Clone from ${p.year} (${p.targets.length} courses)`}
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
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#002D62] text-white hover:bg-blue-950 font-bold shadow-xs cursor-pointer"
                  >
                    {isAr ? 'حفظ وتفعيل الخطة' : 'Create Plan'}
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
                  <BookOpen className="text-[#002D62] dark:text-[#FFC000]" size={18} />
                  <span>
                    {editingTargetId 
                      ? (isAr ? 'تعديل بيانات الكورس والمستهدف' : 'Edit Course Target') 
                      : (isAr ? `إضافة كورس إلى خطة عام ${selectedYear}` : `Add Course to ${selectedYear} Plan`)}
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
                    {isAr ? 'اسم البرنامج التدريبي / الكورس' : 'Course Title'}
                  </label>
                  <input
                    type="text"
                    list="availableCoursesList"
                    value={targetFormCourseTitle}
                    onChange={(e) => setTargetFormCourseTitle(e.target.value)}
                    required
                    placeholder={isAr ? 'اختر من الكتالوج أو اكتب اسم البرنامج...' : 'Select or type course title...'}
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
                    <label className="font-bold text-[#002D62] dark:text-[#FFC000] block mb-1">
                      {isAr ? 'عدد الدورات المستهدفة خلال العام' : 'Target Rounds/Sessions'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={targetFormRounds}
                      onChange={(e) => setTargetFormRounds(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-black text-[#002D62] dark:text-[#FFC000] focus:outline-none focus:ring-1 focus:ring-[#002D62]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {isAr ? 'عدد المتدربين المستهدفين' : 'Target Trainees'}
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
                      {isAr ? 'الربع السنوي المقترح' : 'Target Quarter'}
                    </label>
                    <select
                      value={targetFormQuarter}
                      onChange={(e) => setTargetFormQuarter(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <option value="Q1">Q1 (الربع الأول)</option>
                      <option value="Q2">Q2 (الربع الثاني)</option>
                      <option value="Q3">Q3 (الربع الثالث)</option>
                      <option value="Q4">Q4 (الربع الرابع)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {isAr ? 'المسار الفني التخصصي' : 'Technical Track'}
                    </label>
                    <select
                      value={targetFormTrack}
                      onChange={(e) => setTargetFormTrack(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <option value="mechanical">{isAr ? 'ميكانيكا ومحركات' : 'Mechanical'}</option>
                      <option value="hydraulic">{isAr ? 'هيدروليك وقوى' : 'Hydraulics'}</option>
                      <option value="electrical">{isAr ? 'كهرباء وإلكترونيات' : 'Electrical'}</option>
                      <option value="heavy_machinery">{isAr ? 'معدات ثقيلة وأسطول' : 'Heavy Equipment'}</option>
                      <option value="tbm">{isAr ? 'حفر الأنفاق TBM' : 'Tunneling TBM'}</option>
                      <option value="quality_sos">{isAr ? 'فحص الزيوت والجودة S.O.S' : 'Diagnostics & S.O.S'}</option>
                    </select>
                  </div>
                </div>

                {/* Duration & Notes */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {isAr ? 'مدة الدورة (أيام)' : 'Duration (Days)'}
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
                      {isAr ? 'المقر / ملاحظات التدريب' : 'Venue / Notes'}
                    </label>
                    <input
                      type="text"
                      value={targetFormNotes}
                      onChange={(e) => setTargetFormNotes(e.target.value)}
                      placeholder={isAr ? 'مثلاً: ورشة القطامية المركزية...' : 'e.g. Katamia Central Workshop...'}
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
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#002D62] text-white hover:bg-blue-950 font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>{isAr ? 'حفظ في الخطة' : 'Save Target'}</span>
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
