import React, { useState, useMemo, useRef } from 'react';
import { useAppContext, generateUUID } from '../context';
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
  ArrowUpRight,
  UploadCloud,
  FileSpreadsheet,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { AnnualYearPlan, AnnualPlanCourseTarget, Course } from '../types';

declare const XLSX: any;

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

  // Active Top-Level Navigation Tab: 'plan' | 'achievements' | 'audienceMatrix'
  const [activeMainTab, setActiveMainTab] = useState<'plan' | 'achievements' | 'audienceMatrix'>('plan');

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

  // Excel Plan Import State
  const [isUploadPlanModalOpen, setIsUploadPlanModalOpen] = useState(false);
  const [isParsingPlan, setIsParsingPlan] = useState(false);
  const [isSavingPlanImport, setIsSavingPlanImport] = useState(false);
  const [uploadPlanFileName, setUploadPlanFileName] = useState('');
  const [parsedPlanYear, setParsedPlanYear] = useState<number>(2026);
  const [parsedTargets, setParsedTargets] = useState<AnnualPlanCourseTarget[]>([]);
  const [importStrategy, setImportStrategy] = useState<'replace' | 'merge'>('replace');
  const [uploadPlanError, setUploadPlanError] = useState<string | null>(null);
  const [isDraggingPlan, setIsDraggingPlan] = useState(false);
  const planFileInputRef = useRef<HTMLInputElement>(null);

  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [targetFormCourseTitle, setTargetFormCourseTitle] = useState('');
  const [targetFormRounds, setTargetFormRounds] = useState('2');
  const [targetFormTraineesPerRound, setTargetFormTraineesPerRound] = useState('6');
  const [targetFormTrainees, setTargetFormTrainees] = useState('12');
  const [targetFormAudience, setTargetFormAudience] = useState<NonNullable<AnnualPlanCourseTarget['targetAudience']>>('engineers');
  const [targetFormQuarter, setTargetFormQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [targetFormTrack, setTargetFormTrack] = useState<AnnualPlanCourseTarget['track']>('mechanical');
  const [targetFormDuration, setTargetFormDuration] = useState('5');
  const [targetFormNotes, setTargetFormNotes] = useState('');

  // Auto-sync trainees when rounds or trainees/round change
  const handleRoundsChange = (val: string) => {
    setTargetFormRounds(val);
    const r = parseInt(val, 10) || 0;
    const tpr = parseInt(targetFormTraineesPerRound, 10) || 6;
    setTargetFormTrainees(String(r * tpr));
  };

  const handleTraineesPerRoundChange = (val: string) => {
    setTargetFormTraineesPerRound(val);
    const r = parseInt(targetFormRounds, 10) || 0;
    const tpr = parseInt(val, 10) || 6;
    setTargetFormTrainees(String(r * tpr));
  };

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
      // Estimate completed session batches from historical trainee records (avg 6 trainees per session)
      const estimatedHistoricalSessions = Math.min(
        t.targetRounds, 
        Math.floor(matchingHistorical.length / (t.traineesPerRound || 6)) + (matchingHistorical.length > 0 ? 1 : 0)
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

      // Participants
      const liveParticipantsCount = matchingLiveSessions
        .filter(s => s.status === 'completed' || s.status === 'Completed')
        .reduce((acc, s) => acc + (s.registeredUsers?.length || 0), 0);

      const actualParticipants = Math.max(
        liveParticipantsCount,
        matchingHistorical.length,
        totalCompleted * (t.traineesPerRound || 6)
      );

      const plannedTrainees = t.targetTrainees || (t.targetRounds * (t.traineesPerRound || 6));

      return {
        ...t,
        targetAudience: t.targetAudience || 'engineers',
        traineesPerRound: t.traineesPerRound || 6,
        targetTrainees: plannedTrainees,
        completedRounds: totalCompleted,
        scheduledRounds: liveScheduledCount,
        remainingRounds: remaining,
        completionPercent: percent,
        actualParticipants,
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
  // Dual Progress Metrics: Cumulative Annual vs Time-Paced YTD (Method A: Linear Pro-Rata)
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
  const overallCompletionRate = totalTargetRounds > 0 
    ? Math.min(100, Math.round((totalCompletedRounds / totalTargetRounds) * 100)) 
    : 0;

  // 2. Expected Linear Paced Rounds to Date (Method A: Linear Pro-Rata)
  const expectedRoundsYTD = (totalTargetRounds > 0 && timeFraction > 0)
    ? Math.round(totalTargetRounds * timeFraction)
    : 0;

  const hasYTDTarget = isCurrentYearPlan && totalTargetRounds > 0 && expectedRoundsYTD > 0;

  // 3. Time-Paced Progress Rate (YTD %)
  const pacedCompletionRate = hasYTDTarget
    ? Math.round((totalCompletedRounds / expectedRoundsYTD) * 100)
    : null;

  const countCompletedCourses = targetsWithExecution.filter(t => t.executionStatus === 'completed').length;
  const countInProgressCourses = targetsWithExecution.filter(t => t.executionStatus === 'in_progress').length;
  const countRemainingCourses = targetsWithExecution.filter(t => t.executionStatus === 'remaining').length;

  const paceStatus = useMemo(() => {
    if (!isCurrentYearPlan) {
      if (selectedYear < currentRealYear) {
        return {
          shortLabel: 'Archived',
          label: 'Archived Plan',
          badge: 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
        };
      }
      return {
        shortLabel: 'Upcoming',
        label: 'Upcoming Plan',
        badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700/50'
      };
    }
    if (totalTargetRounds === 0 || !hasYTDTarget) {
      return {
        shortLabel: 'Setup',
        label: 'No Targets Defined',
        badge: 'bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
      };
    }
    if (pacedCompletionRate !== null && pacedCompletionRate > 100) {
      return {
        shortLabel: 'Ahead',
        label: `${pacedCompletionRate}% Ahead of Schedule (Thru ${currentMonthName})`,
        badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
      };
    } else if (pacedCompletionRate === 100) {
      return {
        shortLabel: 'On Track',
        label: `100% On Schedule (Thru ${currentMonthName})`,
        badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
      };
    } else if (pacedCompletionRate !== null && pacedCompletionRate >= 80) {
      return {
        shortLabel: 'Near Target',
        label: `Near Target Pace (Thru ${currentMonthName})`,
        badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
      };
    } else {
      return {
        shortLabel: 'Behind',
        label: `Behind Schedule (Thru ${currentMonthName})`,
        badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
      };
    }
  }, [isCurrentYearPlan, selectedYear, currentRealYear, pacedCompletionRate, currentMonthName, totalTargetRounds, hasYTDTarget]);

  // -------------------------------------------------------------
  // Audience Analysis Matrix (Engineers / Techs / Summer Training)
  // -------------------------------------------------------------
  const audienceMatrix = useMemo(() => {
    const categories: Array<{
      key: 'engineers' | 'technicians_operators' | 'summer_training';
      label: string;
      icon: string;
    }> = [
      { key: 'engineers', label: 'Engineers', icon: '👷‍♂️' },
      { key: 'technicians_operators', label: 'Technicians / Operators', icon: '🔧' },
      { key: 'summer_training', label: 'Summer Training', icon: '☀️' }
    ];

    const rows = categories.map(cat => {
      const catTargets = targetsWithExecution.filter(t => (t.targetAudience || 'engineers') === cat.key);
      
      // 1. Courses (Distinct Programs defined)
      const plannedCourses = catTargets.length;
      const actualCourses = catTargets.filter(t => t.completedRounds > 0).length;
      const coursesPct = plannedCourses > 0 
        ? Math.round((actualCourses / plannedCourses) * 100) 
        : (actualCourses > 0 ? 100 : null);

      // 2. Sessions (Rounds Delivered)
      const plannedSessions = catTargets.reduce((acc, t) => acc + t.targetRounds, 0);
      const actualSessions = catTargets.reduce((acc, t) => acc + t.completedRounds, 0);
      const sessionsPct = plannedSessions > 0 
        ? Math.round((actualSessions / plannedSessions) * 100) 
        : (actualSessions > 0 ? 100 : null);

      // 3. Participants (Trainees Trained)
      const plannedParticipants = catTargets.reduce((acc, t) => acc + (t.targetTrainees || (t.targetRounds * (t.traineesPerRound || 6))), 0);
      const actualParticipants = catTargets.reduce((acc, t) => acc + (t.actualParticipants || (t.completedRounds * (t.traineesPerRound || 6))), 0);
      const participantsPct = plannedParticipants > 0 
        ? Math.round((actualParticipants / plannedParticipants) * 100) 
        : (actualParticipants > 0 ? 100 : null);

      return {
        ...cat,
        courses: { planned: plannedCourses, actual: actualCourses, pct: coursesPct },
        sessions: { planned: plannedSessions, actual: actualSessions, pct: sessionsPct },
        participants: { planned: plannedParticipants, actual: actualParticipants, pct: participantsPct }
      };
    });

    // Totals
    const totalPlannedCourses = rows.reduce((acc, r) => acc + r.courses.planned, 0);
    const totalActualCourses = rows.reduce((acc, r) => acc + r.courses.actual, 0);
    const totalCoursesPct = totalPlannedCourses > 0 ? Math.round((totalActualCourses / totalPlannedCourses) * 100) : (totalActualCourses > 0 ? 100 : null);

    const totalPlannedSessions = rows.reduce((acc, r) => acc + r.sessions.planned, 0);
    const totalActualSessions = rows.reduce((acc, r) => acc + r.sessions.actual, 0);
    const totalSessionsPct = totalPlannedSessions > 0 ? Math.round((totalActualSessions / totalPlannedSessions) * 100) : (totalActualSessions > 0 ? 100 : null);

    const totalPlannedParticipants = rows.reduce((acc, r) => acc + r.participants.planned, 0);
    const totalActualParticipants = rows.reduce((acc, r) => acc + r.participants.actual, 0);
    const totalParticipantsPct = totalPlannedParticipants > 0 ? Math.round((totalActualParticipants / totalPlannedParticipants) * 100) : (totalActualParticipants > 0 ? 100 : null);

    return {
      rows,
      totals: {
        courses: { planned: totalPlannedCourses, actual: totalActualCourses, pct: totalCoursesPct },
        sessions: { planned: totalPlannedSessions, actual: totalActualSessions, pct: totalSessionsPct },
        participants: { planned: totalPlannedParticipants, actual: totalActualParticipants, pct: totalParticipantsPct }
      }
    };
  }, [targetsWithExecution]);

  // Track Meta
  const getTrackMeta = (track: AnnualPlanCourseTarget['track']) => {
    switch (track) {
      case 'mechanical':
        return { label: 'Mechanical & Engines', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' };
      case 'hydraulic':
        return { label: 'Hydraulics & Powertrain', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' };
      case 'electrical':
        return { label: 'Electrical & Electronics', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' };
      case 'heavy_machinery':
        return { label: 'Heavy Equipment', badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
      case 'tbm':
        return { label: 'Tunneling TBM', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800' };
      case 'quality_sos':
        return { label: 'Diagnostics & SOS', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' };
      default:
        return { label: 'General Technical', badge: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  // -------------------------------------------------------------
  // Handlers: Year Creation, Plan Clone & Target CRUD
  // -------------------------------------------------------------
  const handleCreateNewYearPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const yr = parseInt(newYearInput, 10);
    if (!yr || isNaN(yr)) return;

    if (annualPlans.some(p => p.year === yr)) {
      alert(`A plan for year ${yr} already exists.`);
      setSelectedYear(yr);
      setIsAddYearModalOpen(false);
      return;
    }

    let clonedTargets: AnnualPlanCourseTarget[] = [];
    if (cloneFromYear !== 'none') {
      const sourcePlan = annualPlans.find(p => String(p.year) === cloneFromYear);
      if (sourcePlan && sourcePlan.targets) {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveAnnualPlan(newPlan);
    setSelectedYear(yr);
    setIsAddYearModalOpen(false);
  };

  const openAddCourseModal = () => {
    setEditingTargetId(null);
    setTargetFormCourseTitle(courses[0]?.title || '');
    setTargetFormRounds('2');
    setTargetFormTraineesPerRound('6');
    setTargetFormTrainees('12');
    setTargetFormAudience('engineers');
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
    const tpr = target.traineesPerRound || 6;
    setTargetFormTraineesPerRound(String(tpr));
    setTargetFormTrainees(String(target.targetTrainees || (target.targetRounds * tpr)));
    setTargetFormAudience(target.targetAudience || 'engineers');
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
    const tpr = Math.max(1, parseInt(targetFormTraineesPerRound, 10) || 6);
    const trainees = Math.max(1, parseInt(targetFormTrainees, 10) || (rounds * tpr));
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
            traineesPerRound: tpr,
            targetAudience: targetFormAudience,
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
        traineesPerRound: tpr,
        targetAudience: targetFormAudience,
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

  // -------------------------------------------------------------
  // Excel Plan Importer: Parse & Extract Annual Plan
  // -------------------------------------------------------------
  const handlePlanFileSelected = async (file: File) => {
    if (!file) return;
    setUploadPlanError(null);
    setIsParsingPlan(true);
    setUploadPlanFileName(file.name);

    try {
      if (typeof XLSX === 'undefined') {
        throw new Error('Excel parsing engine (XLSX) is initializing. Please try again in a moment.');
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('The uploaded Excel workbook contains no readable worksheets.');
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rows || rows.length === 0) {
        throw new Error('The selected worksheet is empty.');
      }

      // 1. Auto-detect plan year from header / title rows (first 10 rows)
      let detectedYear = selectedYear || 2026;
      for (let r = 0; r < Math.min(10, rows.length); r++) {
        const rowStr = (rows[r] || []).join(' ');
        const match = rowStr.match(/\b(20\d\d)\b/);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (parsed >= 2020 && parsed <= 2040) {
            detectedYear = parsed;
            break;
          }
        }
      }

      // 2. Locate table header row & column indexes
      let headerRowIdx = -1;
      let colCourse = 5;    // Default: Column F (index 5)
      let colMonth = 4;     // Default: Column E (index 4)
      let colAudience = 6;  // Default: Column G (index 6)
      let colSessions = 7;  // Default: Column H (index 7)

      for (let r = 0; r < Math.min(15, rows.length); r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const cell = String(row[c] || '').trim().toLowerCase();
          if (cell === 'course' || cell === 'course title' || cell === 'training course' || cell === 'courses') {
            headerRowIdx = r;
            colCourse = c;
          }
          if (cell === 'audience' || cell === 'target audience' || cell.includes('audience')) {
            colAudience = c;
          }
          if (cell.includes('session') || cell.includes('round') || cell.includes('no of') || cell === 'sessions') {
            colSessions = c;
          }
          if (cell === 'month' || cell.includes('month')) {
            colMonth = c;
          }
        }
        if (headerRowIdx !== -1) break;
      }

      // Fallback if header wasn't found
      if (headerRowIdx === -1) {
        headerRowIdx = 4;
      }

      // 3. Month & Quarter mapping dictionary
      const monthMap: Record<string, { quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; name: string }> = {
        january: { quarter: 'Q1', name: 'January' },
        jan: { quarter: 'Q1', name: 'January' },
        february: { quarter: 'Q1', name: 'February' },
        feb: { quarter: 'Q1', name: 'February' },
        march: { quarter: 'Q1', name: 'March' },
        mar: { quarter: 'Q1', name: 'March' },
        april: { quarter: 'Q2', name: 'April' },
        apr: { quarter: 'Q2', name: 'April' },
        may: { quarter: 'Q2', name: 'May' },
        june: { quarter: 'Q2', name: 'June' },
        jun: { quarter: 'Q2', name: 'June' },
        july: { quarter: 'Q3', name: 'July' },
        jul: { quarter: 'Q3', name: 'July' },
        august: { quarter: 'Q3', name: 'August' },
        aug: { quarter: 'Q3', name: 'August' },
        september: { quarter: 'Q3', name: 'September' },
        sep: { quarter: 'Q3', name: 'September' },
        october: { quarter: 'Q4', name: 'October' },
        oct: { quarter: 'Q4', name: 'October' },
        november: { quarter: 'Q4', name: 'November' },
        nov: { quarter: 'Q4', name: 'November' },
        december: { quarter: 'Q4', name: 'December' },
        dec: { quarter: 'Q4', name: 'December' }
      };

      const detectTrack = (courseTitle: string): AnnualPlanCourseTarget['track'] => {
        const c = courseTitle.toLowerCase();
        if (c.includes('hydraulic') || c.includes('powertrain') || c.includes('transmission')) return 'hydraulic';
        if (c.includes('electric') || c.includes('electronic') || c.includes('wiring')) return 'electrical';
        if (c.includes('tbm') || c.includes('tunnel')) return 'tbm';
        if (c.includes('sos') || c.includes('diagnostic') || c.includes('troubleshooting')) return 'quality_sos';
        if (c.includes('equipment') || c.includes('loader') || c.includes('excavator') || c.includes('crane')) return 'heavy_machinery';
        return 'mechanical';
      };

      const extractedTargets: AnnualPlanCourseTarget[] = [];
      let currentMonth = '';
      let currentCourse = '';

      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const mRaw = String(row[colMonth] || '').trim();
        const cRaw = String(row[colCourse] || '').trim();
        const aRaw = String(row[colAudience] || '').trim();
        const sRaw = String(row[colSessions] || '').trim();

        // Stop condition: summary rows or totals
        if (
          cRaw.includes('Technical Training Plan') ||
          cRaw.includes('Total Courses') ||
          cRaw.includes('Total Sessions') ||
          cRaw.includes('Training Summary') ||
          cRaw.includes('Grand Total')
        ) {
          break;
        }

        // Clean month value
        const cleanM = mRaw.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (cleanM && monthMap[cleanM]) {
          currentMonth = monthMap[cleanM].name;
        }

        // Clean course title
        if (cRaw && !cRaw.match(/^\d+$/)) {
          currentCourse = cRaw;
        }

        // Sessions count
        let numSessions = 0;
        if (/^\d+$/.test(sRaw)) {
          numSessions = parseInt(sRaw, 10);
        }

        if (currentCourse && (numSessions > 0 || aRaw)) {
          const cLower = currentCourse.toLowerCase();
          const aLower = aRaw.toLowerCase();

          let audience: NonNullable<AnnualPlanCourseTarget['targetAudience']> = 'engineers';
          if (cLower.includes('summer') || aLower.includes('summer')) {
            audience = 'summer_training';
          } else if (
            aLower.includes('tech') ||
            aLower.includes('driver') ||
            aLower.includes('operator') ||
            aLower.includes('fitter') ||
            aLower.includes('mechanic')
          ) {
            audience = 'technicians_operators';
          } else if (aLower.includes('eng')) {
            audience = 'engineers';
          }

          const q = (currentMonth && monthMap[currentMonth.toLowerCase()])
            ? monthMap[currentMonth.toLowerCase()].quarter
            : 'Q1';

          const rounds = numSessions > 0 ? numSessions : 1;
          const tpr = 6;
          const trainees = rounds * tpr;
          const track = detectTrack(currentCourse);

          // Attempt to match course in catalog for catalog ID linkage
          const matchedCourse = courses.find(
            c => (c.title || '').trim().toLowerCase() === currentCourse.toLowerCase()
          );

          extractedTargets.push({
            id: `t_${Date.now()}_${generateUUID().substring(0, 8)}_${extractedTargets.length}`,
            courseId: matchedCourse?.id,
            courseTitle: currentCourse,
            courseTitleEn: matchedCourse?.titleEn || currentCourse,
            targetRounds: rounds,
            traineesPerRound: tpr,
            targetTrainees: trainees,
            targetAudience: audience,
            quarter: q,
            track: track,
            durationDays: matchedCourse?.durationDays || 5,
            notes: currentMonth ? `Scheduled in ${currentMonth}` : ''
          });
        }
      }

      if (extractedTargets.length === 0) {
        throw new Error('No valid course targets could be extracted. Please make sure the Excel follows the OED Training Plan structure.');
      }

      setParsedPlanYear(detectedYear);
      setParsedTargets(extractedTargets);
    } catch (err: any) {
      console.error('Error parsing plan Excel:', err);
      setUploadPlanError(err?.message || 'Failed to read or parse Excel file.');
    } finally {
      setIsParsingPlan(false);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedTargets.length === 0) return;
    setIsSavingPlanImport(true);
    try {
      const existingPlan = annualPlans.find(p => p.year === parsedPlanYear);
      let finalTargets: AnnualPlanCourseTarget[] = [];

      if (importStrategy === 'merge' && existingPlan && existingPlan.targets) {
        finalTargets = [...existingPlan.targets];
        parsedTargets.forEach(newT => {
          const existingIdx = finalTargets.findIndex(
            t => t.courseTitle.trim().toLowerCase() === newT.courseTitle.trim().toLowerCase() && t.targetAudience === newT.targetAudience
          );
          if (existingIdx >= 0) {
            finalTargets[existingIdx] = { ...finalTargets[existingIdx], ...newT };
          } else {
            finalTargets.push(newT);
          }
        });
      } else {
        finalTargets = parsedTargets;
      }

      const planToSave: AnnualYearPlan = {
        id: existingPlan?.id || String(parsedPlanYear),
        year: parsedPlanYear,
        title: `Annual Training Plan ${parsedPlanYear}`,
        status: 'active',
        targets: finalTargets,
        updatedAt: new Date().toISOString(),
        createdAt: existingPlan?.createdAt || new Date().toISOString()
      };

      await saveAnnualPlan(planToSave);
      setSelectedYear(parsedPlanYear);
      setIsUploadPlanModalOpen(false);
      setParsedTargets([]);
      setUploadPlanFileName('');
      setUploadPlanError(null);
    } catch (err: any) {
      console.error('Error saving imported plan:', err);
      setUploadPlanError(err?.message || 'Failed to save annual plan to database.');
    } finally {
      setIsSavingPlanImport(false);
    }
  };

  const handleResetUploadModal = () => {
    setParsedTargets([]);
    setUploadPlanFileName('');
    setUploadPlanError(null);
    if (planFileInputRef.current) {
      planFileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPlan(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePlanFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePlanFileSelected(e.target.files[0]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      
      {/* 1. Executive Orascom Header Banner */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-slate-800 relative overflow-hidden transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-amber-400/20 text-[#002D62] dark:text-amber-300 border border-blue-200 dark:border-amber-400/30 text-xs font-bold tracking-wide">
              <CalendarRange size={13} />
              <span>Equipment Department (OED) — {selectedYear} Annual Training Plan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#002D62] dark:text-white flex items-center gap-3">
              <span>Annual Training Plan & Achievement Tracking</span>
            </h1>
          </div>

          {/* Print Header Action */}
          <div className="flex items-center gap-3 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
              title="Print Plan Report"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Prominent Executive Central Year Navigation Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <CalendarRange size={16} className="text-[#002D62] dark:text-amber-400" />
              <span>Select Plan Year:</span>
            </div>

            <div className="p-1.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 flex items-center gap-2 flex-wrap shadow-2xs">
              {availableYears.map(yr => {
                const isSelected = selectedYear === yr;
                const isCurrentYear = yr === currentRealYear;
                const yearTargetsCount = (annualPlans.find(p => p.year === yr)?.targets || []).length;

                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? 'bg-[#002D62] text-white shadow-md shadow-[#002D62]/25 dark:bg-blue-900 dark:text-white ring-1 ring-white/10'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    <span className="text-sm sm:text-base font-black tracking-tight">{yr}</span>
                    {isCurrentYear ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      }`}>
                        Current
                      </span>
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {yr > currentRealYear ? 'Upcoming' : 'Archived'}
                      </span>
                    )}
                    <span className={`text-[11px] font-medium ${
                      isSelected ? 'text-slate-200 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      ({yearTargetsCount} {yearTargetsCount === 1 ? 'Program' : 'Programs'})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prominent Action: + Add New Year Plan & Import Plan (Excel) (Admin Only) */}
          {isAdmin && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setParsedTargets([]);
                  setUploadPlanFileName('');
                  setUploadPlanError(null);
                  setParsedPlanYear(selectedYear);
                  setIsUploadPlanModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 text-[#002D62] dark:text-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs shrink-0"
                title="Import Annual Plan from Excel spreadsheet"
              >
                <UploadCloud size={17} className="text-[#002D62] dark:text-amber-400" />
                <span>Import Plan (Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddYearModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 dark:from-slate-800 dark:to-slate-700 border-2 border-dashed border-[#002D62]/40 dark:border-amber-400/40 text-[#002D62] dark:text-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs shrink-0"
                title="Add New Year Plan"
              >
                <PlusCircle size={17} className="text-[#002D62] dark:text-amber-400" />
                <span>+ Add New Year Plan</span>
              </button>
            </div>
          )}
        </div>

        {/* Executive KPI Summary Strip: Dual Metric (Paced vs Cumulative) */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Time-Paced Completion Rate (YTD) */}
          <div className="bg-blue-50/70 dark:bg-slate-800/90 rounded-xl p-3.5 border border-blue-200/80 dark:border-slate-700 shadow-2xs relative overflow-hidden flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-[#002D62] dark:text-slate-200 font-bold flex items-center gap-1">
                  <span>⏱️</span>
                  <span>Time-Paced Progress</span>
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${paceStatus.badge}`}>
                  {paceStatus.shortLabel}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-[#002D62] dark:text-amber-300">
                  {pacedCompletionRate !== null ? `${pacedCompletionRate}%` : '---'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-300 font-medium">
                  ({totalCompletedRounds} / {expectedRoundsYTD} rounds)
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <div className="w-full bg-blue-200/60 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    pacedCompletionRate !== null && pacedCompletionRate >= 100 
                      ? 'bg-emerald-500 dark:bg-emerald-400' 
                      : pacedCompletionRate !== null && pacedCompletionRate >= 80 
                        ? 'bg-amber-500 dark:bg-amber-400' 
                        : pacedCompletionRate !== null 
                          ? 'bg-rose-500 dark:bg-rose-400' 
                          : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  style={{ width: `${Math.min(100, pacedCompletionRate ?? 0)}%` }} 
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                Paced Target: {expectedRoundsYTD} rounds (Thru {currentMonthName})
              </span>
            </div>
          </div>

          {/* Card 2: Cumulative Annual Full-Year Completion Rate */}
          <div className="bg-slate-50 dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-colors">
            <div>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                <span>📈</span>
                <span>Full Year Target (12 Months)</span>
              </span>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {totalTargetRounds > 0 ? `${overallCompletionRate}%` : '---'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-300 font-medium">
                  ({totalCompletedRounds} / {totalTargetRounds})
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#002D62] dark:bg-amber-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${overallCompletionRate}%` }} 
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                Annual Progress: {totalCompletedRounds} of {totalTargetRounds} rounds
              </span>
            </div>
          </div>

          {/* Card 3: Target Total Rounds */}
          <div className="bg-slate-50 dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-colors">
            <div>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                <span>🎯</span>
                <span>Annual Target Rounds</span>
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#002D62] dark:text-amber-300 mt-1.5 block">
                {totalTargetRounds} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Rounds</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-2.5">
              {targetsWithExecution.length} Approved Programs
            </span>
          </div>

          {/* Card 4: Remaining Rounds */}
          <div className="bg-slate-50 dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-colors">
            <div>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                <span>⏳</span>
                <span>Remaining Target Rounds</span>
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1.5 block">
                {totalRemainingRounds} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Rounds</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-2.5">
              {totalScheduledRounds} Currently Scheduled
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Tab Switcher: Plan vs Achievements vs Audience Matrix */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 print:hidden">
        {/* Core 3 Tabs - Executive Segmented Container with High Affordance */}
        <div className="p-1.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 flex items-center gap-2 flex-wrap shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveMainTab('plan')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              activeMainTab === 'plan'
                ? 'bg-[#002D62] text-white shadow-md shadow-[#002D62]/25 dark:bg-blue-900 dark:text-white ring-1 ring-white/10'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <BookOpen size={16} className={activeMainTab === 'plan' ? 'text-amber-400' : 'text-slate-500 dark:text-slate-400'} />
            <span>{selectedYear} Plan & Target Rounds</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              activeMainTab === 'plan' 
                ? 'bg-white/20 text-white' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-600'
            }`}>
              {targetsWithExecution.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('achievements')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              activeMainTab === 'achievements'
                ? 'bg-[#002D62] text-white shadow-md shadow-[#002D62]/25 dark:bg-blue-900 dark:text-white ring-1 ring-white/10'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <TrendingUp size={16} className={activeMainTab === 'achievements' ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-400'} />
            <span>Progress & Achievements</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('audienceMatrix')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              activeMainTab === 'audienceMatrix'
                ? 'bg-[#002D62] text-white shadow-md shadow-[#002D62]/25 dark:bg-blue-900 dark:text-white ring-1 ring-white/10'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <BarChart3 size={16} className={activeMainTab === 'audienceMatrix' ? 'text-[#FFC000]' : 'text-slate-500 dark:text-slate-400'} />
            <span>Audience Analysis Matrix</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              activeMainTab === 'audienceMatrix'
                ? 'bg-[#FFC000] text-[#001D42]'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60'
            }`}>
              {audienceMatrix.totals.participants.planned} Trainees
            </span>
          </button>
        </div>

        {/* Action Button: Add Course Target & Import Plan (Excel) (Admin Only) */}
        {isAdmin && activeMainTab === 'plan' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setParsedTargets([]);
                setUploadPlanFileName('');
                setUploadPlanError(null);
                setParsedPlanYear(selectedYear);
                setIsUploadPlanModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Import Annual Plan from Excel"
            >
              <UploadCloud size={16} className="text-[#002D62] dark:text-amber-400" />
              <span>Import Plan (Excel)</span>
            </button>

            <button
              type="button"
              onClick={openAddCourseModal}
              className="px-4 py-2.5 rounded-xl bg-[#002D62] hover:bg-blue-950 dark:bg-blue-800 dark:hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <PlusCircle size={16} className="text-[#FFC000]" />
              <span>Add Course Target</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Search & Quarter Filter Bar (Active in Plan & Achievements) */}
      {activeMainTab !== 'audienceMatrix' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:hidden">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search plan by course title, track or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-[#002D62] text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quarter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
              <button
                key={q}
                type="button"
                onClick={() => setSelectedQuarter(q)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedQuarter === q
                    ? 'bg-[#002D62] text-white dark:bg-amber-400 dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {q === 'ALL' ? 'Full Year (All Quarters)' : q}
              </button>
            ))}
          </div>

          {/* Achievement Status Filter (Only when on achievements tab) */}
          {activeMainTab === 'achievements' && (
            <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-3">
              {(['ALL', 'COMPLETED', 'IN_PROGRESS', 'REMAINING'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAchievementFilter(f)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    achievementFilter === f
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f === 'COMPLETED' ? 'Completed' : f === 'IN_PROGRESS' ? 'In Progress' : 'Remaining'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB CONTENT 1: Plan Targets Grid & Setup */}
      {activeMainTab === 'plan' && (
        <div className="space-y-4">
          {filteredTargets.length === 0 ? (
            /* Clean Empty State when no targets defined */
            <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-slate-800 text-[#002D62] dark:text-amber-400 flex items-center justify-center mx-auto shadow-2xs">
                <BookOpen size={28} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  {searchQuery || selectedQuarter !== 'ALL' 
                    ? 'No Courses Found' 
                    : `Annual Plan for ${selectedYear} is Currently Empty`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {searchQuery || selectedQuarter !== 'ALL'
                    ? 'Try clearing the quarter filter or adjusting your search keywords.'
                    : 'No course programs or session targets have been defined yet for this year.'}
                </p>
              </div>
              {isAdmin && !searchQuery && selectedQuarter === 'ALL' && (
                <button
                  type="button"
                  onClick={openAddCourseModal}
                  className="px-5 py-2.5 rounded-xl bg-[#002D62] hover:bg-blue-950 dark:bg-blue-800 text-white text-xs font-bold cursor-pointer transition-all shadow-xs inline-flex items-center gap-2"
                >
                  <PlusCircle size={15} className="text-[#FFC000]" />
                  <span>Add First Course to Plan</span>
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[#002D62] dark:text-amber-400 border border-slate-200 dark:border-slate-700">
                            {t.quarter}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {t.targetAudience === 'technicians_operators' ? 'Techs / Ops' : t.targetAudience === 'summer_training' ? 'Summer Training' : 'Engineers'}
                          </span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border truncate max-w-[150px] ${trackMeta.badge}`}>
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
                          <strong className="text-sm font-black text-slate-800 dark:text-slate-200">
                            {t.targetTrainees || (t.targetRounds * (t.traineesPerRound || 6))} Trainees
                          </strong>
                          <span className="text-[9px] text-slate-400 block">({t.traineesPerRound || 6} / round)</span>
                        </div>
                      </div>

                      {/* Progress Execution Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">Execution Progress</span>
                          <span className="font-black text-[#002D62] dark:text-amber-400 text-xs">
                            {t.completedRounds} / {t.targetRounds} ({t.completionPercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              t.completionPercent >= 100 ? 'bg-emerald-500' : t.completionPercent > 0 ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            style={{ width: `${Math.min(100, t.completionPercent)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        ⏱️ {t.durationDays || 5} Days Program
                      </span>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditCourseModal(t)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#002D62] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Target"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCourseTarget(t.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Target"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
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
          <div className="bg-blue-50/80 dark:bg-slate-900 rounded-2xl p-5 text-slate-900 dark:text-white shadow-xs border border-blue-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">⏱️</span>
                <h3 className="font-black text-sm sm:text-base text-[#002D62] dark:text-white">
                  Intelligent Schedule Pacing for {currentMonthName} ({currentRealQuarter})
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${paceStatus.badge}`}>
                  {paceStatus.label}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                Based on the elapsed timeline ({elapsedMonths} of 12 months), the target rounds required to date are {expectedRoundsYTD} rounds. Actual completed sessions ({totalCompletedRounds} rounds) represent a {pacedCompletionRate !== null ? `${pacedCompletionRate}%` : '---'} compliance with current schedule targets, while total annual completion stands at {totalTargetRounds > 0 ? `${overallCompletionRate}%` : '---'}.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-blue-200/80 dark:border-slate-700 shadow-2xs">
              <div className="text-center px-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Time-Paced %</span>
                <span className="text-xl sm:text-2xl font-black text-[#002D62] dark:text-amber-300">{pacedCompletionRate !== null ? `${pacedCompletionRate}%` : '---'}</span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="text-center px-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Annual Total</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{totalTargetRounds > 0 ? `${overallCompletionRate}%` : '---'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Program & Technical Track</th>
                    <th className="py-3 px-3 text-center">Quarter</th>
                    <th className="py-3 px-3 text-center">Audience</th>
                    <th className="py-3 px-3 text-center">Target Rounds</th>
                    <th className="py-3 px-3 text-center">Completed</th>
                    <th className="py-3 px-3 text-center">Scheduled</th>
                    <th className="py-3 px-3 text-center">Remaining</th>
                    <th className="py-3 px-4 text-center">Completion Rate</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTargets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No course records match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTargets.map(t => {
                      const trackMeta = getTrackMeta(t.track);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{t.courseTitle}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${trackMeta.badge}`}>
                                {trackMeta.label}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                            {t.quarter}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-600 dark:text-slate-400">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                              {t.targetAudience === 'technicians_operators' ? 'Techs/Ops' : t.targetAudience === 'summer_training' ? 'Summer' : 'Engineers'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-black text-slate-900 dark:text-white">
                            {t.targetRounds}
                          </td>
                          <td className="py-3.5 px-3 text-center font-black text-emerald-600 dark:text-emerald-400">
                            {t.completedRounds}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                            {t.scheduledRounds}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                            {t.remainingRounds}
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-[#002D62] dark:text-amber-400">
                            <div className="flex items-center justify-center gap-2">
                              <span className="w-9 text-right font-black">{t.completionPercent}%</span>
                              <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    t.completionPercent >= 100 ? 'bg-emerald-500' : t.completionPercent > 0 ? 'bg-amber-400' : 'bg-slate-400'
                                  }`} 
                                  style={{ width: `${t.completionPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                              t.executionStatus === 'completed' 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                                : t.executionStatus === 'in_progress'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}>
                              {t.executionStatus === 'completed' ? 'Completed' : t.executionStatus === 'in_progress' ? 'In Progress' : 'Remaining'}
                            </span>
                          </td>
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

      {/* 6. TAB CONTENT 3: Executive Audience Analysis Matrix (Engineers / Techs / Summer Training) */}
      {activeMainTab === 'audienceMatrix' && (
        <div className="space-y-6">
          {/* Header Card / Explanation Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#002D62] dark:text-amber-300 border border-blue-200 dark:border-blue-800/60 text-xs font-bold">
                <BarChart3 size={13} />
                <span>Target Audience Matrix — {selectedYear}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Executive Breakdown: Planned vs. Actual Performance
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Aggregated training intelligence segmenting distinct programs, delivered sessions, and total participants across technical workforce tiers (Engineers, Technicians/Operators, and Summer Training).
              </p>
            </div>

            {/* Quick 3 Mini KPI Badges */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Total Courses</span>
                <span className="text-base font-black text-[#002D62] dark:text-white">
                  {audienceMatrix.totals.courses.actual} / {audienceMatrix.totals.courses.planned}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Total Sessions</span>
                <span className="text-base font-black text-[#002D62] dark:text-white">
                  {audienceMatrix.totals.sessions.actual} / {audienceMatrix.totals.sessions.planned}
                </span>
              </div>
              <div className="bg-blue-50 dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-blue-700 dark:text-amber-300 block font-bold">Total Participants</span>
                <span className="text-base font-black text-[#002D62] dark:text-amber-300">
                  {audienceMatrix.totals.participants.actual} / {audienceMatrix.totals.participants.planned}
                </span>
              </div>
            </div>
          </div>

          {/* The Exact 3-Section Executive Matrix Table matching User's Spreadsheet */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#002D62] text-white font-black text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-6 w-1/2">Segment & Audience Tier</th>
                    <th className="py-3.5 px-4 text-center w-1/6">Planned</th>
                    <th className="py-3.5 px-4 text-center w-1/6">Actual</th>
                    <th className="py-3.5 px-4 text-center w-1/6">Achievement %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  
                  {/* ================= SECTION 1: COURSES ================= */}
                  <tr className="bg-slate-100 dark:bg-slate-800/90 font-black text-slate-800 dark:text-slate-200">
                    <td colSpan={4} className="py-3 px-6 text-xs font-black">
                      <div className="flex items-center gap-2">
                        <BookOpen size={15} className="text-[#002D62] dark:text-amber-400" />
                        <span className="uppercase tracking-wider">Courses (Approved Programs)</span>
                      </div>
                    </td>
                  </tr>
                  {audienceMatrix.rows.map(r => (
                    <tr key={`courses_${r.key}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-8 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>{r.icon}</span>
                        <span>{r.label}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {r.courses.planned}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-[#002D62] dark:text-amber-400">
                        {r.courses.actual}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                          r.courses.pct === null ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' :
                          r.courses.pct >= 100 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' :
                          r.courses.pct >= 80 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300' :
                          'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300'
                        }`}>
                          {r.courses.pct !== null ? `${r.courses.pct}%` : '---'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Total Courses Highlighted Row (Yellow matching spreadsheet) */}
                  <tr className="bg-[#FFC000]/25 dark:bg-[#FFC000]/15 font-black text-slate-900 dark:text-amber-300 border-t-2 border-b-2 border-[#FFC000]/50">
                    <td className="py-2.5 px-8 font-black uppercase tracking-wide">
                      Total Courses
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-base">
                      {audienceMatrix.totals.courses.planned}
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-base">
                      {audienceMatrix.totals.courses.actual}
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-sm">
                      {audienceMatrix.totals.courses.pct !== null ? `${audienceMatrix.totals.courses.pct}%` : '---'}
                    </td>
                  </tr>

                  {/* ================= SECTION 2: SESSIONS ================= */}
                  <tr className="bg-slate-100 dark:bg-slate-800/90 font-black text-slate-800 dark:text-slate-200">
                    <td colSpan={4} className="py-3 px-6 text-xs font-black">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={15} className="text-[#002D62] dark:text-amber-400" />
                        <span className="uppercase tracking-wider">Sessions (Total Rounds / Deliveries)</span>
                      </div>
                    </td>
                  </tr>
                  {audienceMatrix.rows.map(r => (
                    <tr key={`sessions_${r.key}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-8 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>{r.icon}</span>
                        <span>{r.label}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {r.sessions.planned}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-[#002D62] dark:text-amber-400">
                        {r.sessions.actual}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                          r.sessions.pct === null ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' :
                          r.sessions.pct >= 100 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' :
                          r.sessions.pct >= 80 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300' :
                          'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300'
                        }`}>
                          {r.sessions.pct !== null ? `${r.sessions.pct}%` : '---'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Total Sessions Highlighted Row */}
                  <tr className="bg-[#FFC000]/25 dark:bg-[#FFC000]/15 font-black text-slate-900 dark:text-amber-300 border-t-2 border-b-2 border-[#FFC000]/50">
                    <td className="py-2.5 px-8 font-black uppercase tracking-wide">
                      Total Sessions
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-base">
                      {audienceMatrix.totals.sessions.planned}
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-base">
                      {audienceMatrix.totals.sessions.actual}
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-sm">
                      {audienceMatrix.totals.sessions.pct !== null ? `${audienceMatrix.totals.sessions.pct}%` : '---'}
                    </td>
                  </tr>

                  {/* ================= SECTION 3: PARTICIPANTS ================= */}
                  <tr className="bg-slate-100 dark:bg-slate-800/90 font-black text-slate-800 dark:text-slate-200">
                    <td colSpan={4} className="py-3 px-6 text-xs font-black">
                      <div className="flex items-center gap-2">
                        <Users size={15} className="text-[#002D62] dark:text-amber-400" />
                        <span className="uppercase tracking-wider">Participants (Trainees Trained)</span>
                      </div>
                    </td>
                  </tr>
                  {audienceMatrix.rows.map(r => (
                    <tr key={`participants_${r.key}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-8 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>{r.icon}</span>
                        <span>{r.label}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {r.participants.planned}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-[#002D62] dark:text-amber-400">
                        {r.participants.actual}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                          r.participants.pct === null ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' :
                          r.participants.pct >= 100 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' :
                          r.participants.pct >= 80 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300' :
                          'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300'
                        }`}>
                          {r.participants.pct !== null ? `${r.participants.pct}%` : '---'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Total Participants Highlighted Row */}
                  <tr className="bg-[#FFC000]/25 dark:bg-[#FFC000]/15 font-black text-slate-900 dark:text-amber-300 border-t-2 border-b-2 border-[#FFC000]/50">
                    <td className="py-2.5 px-8 font-black uppercase tracking-wide">
                      Total Participants
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-base">
                      {audienceMatrix.totals.participants.planned}
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-base">
                      {audienceMatrix.totals.participants.actual}
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-sm">
                      {audienceMatrix.totals.participants.pct !== null ? `${audienceMatrix.totals.participants.pct}%` : '---'}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODALS */}
      {/* Modal 1: Add New Year Plan */}
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

              <form onSubmit={handleCreateNewYearPlan} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Plan Year
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2040"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D62]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Clone Courses & Targets From:
                  </label>
                  <select
                    value={cloneFromYear}
                    onChange={(e) => setCloneFromYear(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="none">Start with Empty Plan (No preloaded courses)</option>
                    {annualPlans.map(p => (
                      <option key={p.id} value={String(p.year)}>
                        Clone from {p.year} Plan ({p.targets?.length || 0} courses)
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

      {/* Modal 2: Add or Edit Course Target */}
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

                {/* Target Audience Selector */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Audience / Segment
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'engineers', label: 'Engineers', icon: '👷‍♂️' },
                      { key: 'technicians_operators', label: 'Techs / Ops', icon: '🔧' },
                      { key: 'summer_training', label: 'Summer Training', icon: '☀️' }
                    ].map(aud => (
                      <button
                        key={aud.key}
                        type="button"
                        onClick={() => setTargetFormAudience(aud.key as any)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          targetFormAudience === aud.key
                            ? 'bg-[#002D62] text-white border-[#002D62] shadow-xs dark:bg-amber-400 dark:text-slate-950 dark:border-amber-400'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{aud.icon}</span>
                        <span>{aud.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Rounds & Trainees per Round */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#002D62] dark:text-amber-400 block mb-1">
                      Target Rounds
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={targetFormRounds}
                      onChange={(e) => handleRoundsChange(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-black text-[#002D62] dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-[#002D62]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Trainees / Round
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetFormTraineesPerRound}
                      onChange={(e) => handleTraineesPerRoundChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Total Trainees
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetFormTrainees}
                      onChange={(e) => setTargetFormTrainees(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200"
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

        {/* Modal 3: Import Annual Training Plan (Excel) */}
        {isUploadPlanModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-[#002D62] dark:text-amber-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/60 shadow-2xs">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#002D62] dark:text-white flex items-center gap-2">
                      <span>Import Annual Training Plan</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#002D62] dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                        Excel .xlsx
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload your annual plan spreadsheet to auto-extract courses, quarters, audiences, and targets.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsUploadPlanModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={planFileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
                {/* 1. Error Display */}
                {uploadPlanError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5">
                    <AlertCircle size={17} className="shrink-0 text-rose-600 dark:text-rose-400" />
                    <span className="font-semibold">{uploadPlanError}</span>
                  </div>
                )}

                {/* 2. Drag & Drop Area (when no data parsed yet) */}
                {parsedTargets.length === 0 && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingPlan(true);
                    }}
                    onDragLeave={() => setIsDraggingPlan(false)}
                    onDrop={handleDrop}
                    onClick={() => {
                      if (!isParsingPlan) planFileInputRef.current?.click();
                    }}
                    className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${
                      isDraggingPlan
                        ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 scale-[0.99]'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-blue-50/30 dark:hover:bg-slate-800/70 hover:border-[#002D62] dark:hover:border-amber-400'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-3xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center border border-slate-200 dark:border-slate-700 text-[#002D62] dark:text-amber-400">
                      {isParsingPlan ? (
                        <RefreshCw size={28} className="animate-spin text-amber-500" />
                      ) : (
                        <UploadCloud size={30} />
                      )}
                    </div>

                    <div className="space-y-1.5 max-w-md">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {isParsingPlan
                          ? 'Parsing & extracting training plan spreadsheet...'
                          : 'Click or drag & drop Annual Training Plan (.xlsx) here'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Matches official Equipment Department annual plan sheets (Month, Course, Audience, Sessions).
                      </p>
                    </div>

                    {!isParsingPlan && (
                      <div className="flex items-center gap-2 flex-wrap justify-center pt-2">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#002D62] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Auto Year Detection
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Quarter & Audience Mapping
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          6 Trainees / Session
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Parsed Data Preview & Configuration (when data is ready) */}
                {parsedTargets.length > 0 && (
                  <div className="space-y-5">
                    {/* Executive Stats Summary Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Stat 1: Target Year */}
                      <div className="bg-blue-50/70 dark:bg-slate-800/90 rounded-2xl p-3.5 border border-blue-200/80 dark:border-slate-700 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Plan Year</span>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="number"
                            min="2020"
                            max="2040"
                            value={parsedPlanYear}
                            onChange={(e) => setParsedPlanYear(parseInt(e.target.value, 10) || selectedYear)}
                            className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-black text-[#002D62] dark:text-amber-300"
                          />
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-[#002D62] dark:text-blue-300">
                            Auto
                          </span>
                        </div>
                      </div>

                      {/* Stat 2: Total Programs */}
                      <div className="bg-slate-50 dark:bg-slate-800/90 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Programs Extracted</span>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                          {parsedTargets.length} <span className="text-xs font-semibold text-slate-500">Courses</span>
                        </div>
                      </div>

                      {/* Stat 3: Total Sessions */}
                      <div className="bg-slate-50 dark:bg-slate-800/90 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Total Planned Sessions</span>
                        <div className="text-xl font-black text-[#002D62] dark:text-amber-300 mt-1">
                          {parsedTargets.reduce((acc, t) => acc + t.targetRounds, 0)} <span className="text-xs font-semibold text-slate-500">Rounds</span>
                        </div>
                      </div>

                      {/* Stat 4: Planned Trainees */}
                      <div className="bg-emerald-50/70 dark:bg-slate-800/90 rounded-2xl p-3.5 border border-emerald-200/80 dark:border-slate-700 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Total Planned Trainees</span>
                        <div className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
                          {parsedTargets.reduce((acc, t) => acc + (t.targetTrainees || t.targetRounds * 6), 0)} <span className="text-xs font-semibold text-slate-500">(x6)</span>
                        </div>
                      </div>
                    </div>

                    {/* File Badge & Strategy Selector */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <FileCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Source File:</span>
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                            {uploadPlanFileName}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => planFileInputRef.current?.click()}
                          className="text-xs text-[#002D62] dark:text-amber-400 hover:underline font-bold cursor-pointer"
                        >
                          Change File
                        </button>
                      </div>

                      {/* Strategy Picker */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs font-bold">
                        <span className="text-slate-500 dark:text-slate-400">Import Strategy:</span>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="importStrategy"
                            value="replace"
                            checked={importStrategy === 'replace'}
                            onChange={() => setImportStrategy('replace')}
                            className="text-[#002D62] focus:ring-[#002D62]"
                          />
                          <span>Replace Existing Plan</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Overwrite targets for {parsedPlanYear})
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="importStrategy"
                            value="merge"
                            checked={importStrategy === 'merge'}
                            onChange={() => setImportStrategy('merge')}
                            className="text-[#002D62] focus:ring-[#002D62]"
                          />
                          <span>Merge & Append</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Preserve existing & append/update)
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                      <div className="p-3 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Preview Extracted Programs ({parsedTargets.length})
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Review programs before saving to database
                        </span>
                      </div>

                      <div className="max-h-72 overflow-y-auto overflow-x-auto relative">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 z-20 shadow-md">
                            <tr className="bg-[#002D62] text-white">
                              <th className="sticky top-0 bg-[#002D62] text-white px-3 py-3 w-12 text-center font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                                #
                              </th>
                              <th className="sticky top-0 bg-[#002D62] text-white px-3 py-3 min-w-[240px] font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                                Course Title
                              </th>
                              <th className="sticky top-0 bg-[#002D62] text-white px-3 py-3 min-w-[80px] text-center font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                                Quarter
                              </th>
                              <th className="sticky top-0 bg-[#002D62] text-white px-3 py-3 min-w-[160px] font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                                Target Audience
                              </th>
                              <th className="sticky top-0 bg-[#002D62] text-white px-3 py-3 min-w-[90px] text-center font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                                Sessions
                              </th>
                              <th className="sticky top-0 bg-[#002D62] text-white px-3 py-3 min-w-[130px] text-center font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                                Planned Trainees
                              </th>
                              <th className="sticky top-0 bg-[#002D62] text-white px-3 py-3 min-w-[140px] font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                                Schedule Note
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {parsedTargets.map((target, idx) => {
                              return (
                                <tr key={target.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-3 py-3 text-center text-slate-400 font-mono font-bold">
                                    {idx + 1}
                                  </td>
                                  <td className="px-3 py-3 font-bold text-slate-900 dark:text-slate-100">
                                    {target.courseTitle}
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <span className="px-2.5 py-1 rounded-md text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                      {target.quarter}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3">
                                    {target.targetAudience === 'engineers' && (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                        Engineers
                                      </span>
                                    )}
                                    {target.targetAudience === 'technicians_operators' && (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                                        Techs & Operators
                                      </span>
                                    )}
                                    {target.targetAudience === 'summer_training' && (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                                        Summer Training
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3 text-center font-black text-sm text-[#002D62] dark:text-amber-300">
                                    {target.targetRounds}
                                  </td>
                                  <td className="px-3 py-3 text-center font-black text-sm text-emerald-700 dark:text-emerald-400">
                                    {target.targetTrainees || target.targetRounds * 6}
                                  </td>
                                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                    {target.notes || '---'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 shrink-0">
                <div>
                  {parsedTargets.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetUploadModal}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Clear & Choose Another File
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadPlanModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={parsedTargets.length === 0 || isSavingPlanImport}
                    onClick={handleConfirmImport}
                    className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                      parsedTargets.length === 0 || isSavingPlanImport
                        ? 'opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500'
                        : 'bg-[#002D62] hover:bg-blue-950 dark:bg-blue-800 dark:hover:bg-blue-700 text-white active:scale-95'
                    }`}
                  >
                    {isSavingPlanImport ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-amber-400" />
                        <span>Saving Plan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} className="text-[#FFC000]" />
                        <span>Confirm & Import ({parsedTargets.length} Programs)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
