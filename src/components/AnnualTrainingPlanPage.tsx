import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext, generateUUID, DEFAULT_CERTIFIED_2026_PLAN, DEFAULT_CERTIFIED_2026_TARGETS } from '../context';
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
  FileCheck,
  Palmtree,
  Flag,
  Wand2,
  Zap
} from 'lucide-react';
import { AnnualYearPlan, AnnualPlanCourseTarget, Course } from '../types';
import { HolidaysAndVacationsModal } from './HolidaysAndVacationsModal';

declare const XLSX: any;

// -------------------------------------------------------------
// Robust Multi-Format Date & Year Extraction Helper
// Supports: ISO, DD/MM/YYYY, MM/DD/YYYY, Excel serial numbers (e.g. 45443),
// Arabic digits, attendanceDate, date, Session Date, raw['Attendance Date'], etc.
// -------------------------------------------------------------
export const extractRecordDateInfo = (r: any): { year: number | null; month: number } => {
  if (!r) return { year: null, month: 0 };

  // 1. Check direct year fields if present
  const directYear = r.year || r.raw?.['Year'] || r.raw?.['السنة'] || r.raw?.['سنة'];
  if (directYear !== undefined && directYear !== null && directYear !== '') {
    const yNum = typeof directYear === 'number' ? directYear : parseInt(String(directYear).replace(/[^\d]/g, ''), 10);
    if (!isNaN(yNum) && yNum >= 2018 && yNum <= 2035) {
      let m = 0;
      const directMonth = r.month || r.raw?.['Month'] || r.raw?.['الشهر'];
      if (directMonth !== undefined && directMonth !== null && directMonth !== '') {
        const mNum = typeof directMonth === 'number' ? directMonth : parseInt(String(directMonth).replace(/[^\d]/g, ''), 10);
        if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) m = mNum - 1;
      }
      return { year: yNum, month: m };
    }
  }

  // 2. Candidate date values
  const val = r.date || 
              r.attendanceDate || 
              r.sessionDate ||
              r.startDate ||
              r.raw?.['Date'] || 
              r.raw?.['Attendance Date'] || 
              r.raw?.['attendanceDate'] || 
              r.raw?.['Session Date'] || 
              r.raw?.['تاريخ'] || 
              r.raw?.['تاريخ الانعقاد'] || 
              r.raw?.['تاريخ الحضور'] || 
              '';

  if (!val) return { year: null, month: 0 };

  // 3. Handle Excel Serial Numbers (e.g. 45292 is Jan 1, 2024; 45443 is May 31, 2024)
  const numVal = typeof val === 'number' 
    ? val 
    : (typeof val === 'string' && /^\d{5}(\.\d+)?$/.test(val.trim()) ? parseFloat(val.trim()) : null);

  if (numVal !== null && numVal >= 35000 && numVal <= 65000) {
    const utcDays = Math.floor(numVal - 25569);
    const dateObj = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      const yr = dateObj.getUTCFullYear();
      if (yr >= 2018 && yr <= 2035) {
        return { year: yr, month: dateObj.getUTCMonth() };
      }
    }
  }

  // 4. Clean and normalize Arabic/Eastern numerals
  let str = String(val).trim();
  str = str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

  // 5. Try DD/MM/YYYY or DD-MM-YYYY (Egyptian/European standard)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let m = parseInt(dmyMatch[2], 10);
    const yr = parseInt(dmyMatch[3], 10);
    // If month > 12 and day <= 12, swap (MM/DD/YYYY)
    if (m > 12 && day <= 12) {
      const tmp = day;
      day = m;
      m = tmp;
    }
    const monthIndex = Math.max(0, Math.min(11, m - 1));
    if (yr >= 2018 && yr <= 2035) {
      return { year: yr, month: monthIndex };
    }
  }

  // 6. Try YYYY-MM-DD or YYYY/MM/DD (ISO standard)
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const yr = parseInt(ymdMatch[1], 10);
    const m = Math.max(0, Math.min(11, parseInt(ymdMatch[2], 10) - 1));
    if (yr >= 2018 && yr <= 2035) {
      return { year: yr, month: m };
    }
  }

  // 7. Standard JavaScript Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const yr = parsed.getFullYear();
    if (yr >= 2018 && yr <= 2035) {
      return { year: yr, month: parsed.getMonth() };
    }
  }

  // 8. Regex fallback searching for any 4-digit year 2018-2035
  const match = str.match(/\b(201\d|202\d|203\d)\b/);
  if (match) {
    return { year: parseInt(match[1], 10), month: 0 };
  }

  return { year: null, month: 0 };
};

export const AnnualTrainingPlanPage: React.FC = () => {
  const { 
    user, 
    courses, 
    upcomingSessions, 
    cleanedData, 
    records,
    fetchTrainingRecords,
    annualPlans, 
    saveAnnualPlan, 
    deleteAnnualPlan,
    holidaysAndVacations,
    setCurrentView,
    theme
  } = useAppContext();

  // Auto-fetch training records from database if not loaded in memory
  useEffect(() => {
    if ((!cleanedData || cleanedData.length === 0) && (!records || records.length === 0)) {
      fetchTrainingRecords().catch(console.error);
    }
  }, [cleanedData?.length, records?.length, fetchTrainingRecords]);

  // Combined verified historical dataset from cleanedData and records
  const allHistoricalRecords = useMemo(() => {
    const map = new Map<string, any>();
    (cleanedData || []).forEach((r, idx) => {
      const id = r.id || `cl_${idx}`;
      map.set(id, r);
    });
    (records || []).forEach((r, idx) => {
      const id = r.id || `rec_${idx}`;
      if (!map.has(id)) {
        map.set(id, {
          id,
          courseName: r.courseName || (r as any).courseTitle,
          department: (r as any).department || '',
          date: r.attendanceDate || (r as any).date,
          attendanceDate: r.attendanceDate,
          hrCode: r.hrCode || r.userId,
          score: r.score,
          raw: r.raw
        });
      }
    });
    return Array.from(map.values());
  }, [cleanedData, records]);

  const isDark = theme === 'dark';
  const isAdmin = user?.role === 'admin';

  // Active Top-Level Navigation Tab: 'plan' | 'annualResults' | 'wallCalendar' | 'achievements' | 'audienceMatrix'
  const [activeMainTab, setActiveMainTab] = useState<'plan' | 'annualResults' | 'wallCalendar' | 'achievements' | 'audienceMatrix'>('plan');
  const [annualResultsFilter, setAnnualResultsFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'AWAITING_APPROVAL' | 'PENDING'>('ALL');
  const [selectedCalendarSession, setSelectedCalendarSession] = useState<any | null>(null);

  // Holidays & Vacations Management Modal State
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState<boolean>(false);
  const [holidayModalInitialDate, setHolidayModalInitialDate] = useState<string | undefined>(undefined);
  const [selectedDayPopover, setSelectedDayPopover] = useState<{
    dateStr: string;
    dayNumber: number;
    monthName: string;
    holidays: any[];
  } | null>(null);

  // Extract all historical years and courses available in allHistoricalRecords
  const historicalYearsSummary = useMemo(() => {
    const yearCourseMap: Record<number, Map<string, { count: number; dates: Set<string>; monthCounts: Record<number, number>; title: string }>> = {};
    
    allHistoricalRecords.forEach(r => {
      const cName = (r.courseName || (r as any).courseTitle || '').trim();
      if (!cName || cName.length < 2) return;

      const { year: yr, month } = extractRecordDateInfo(r);

      if (yr && yr >= 2018 && yr <= 2035) {
        if (!yearCourseMap[yr]) {
          yearCourseMap[yr] = new Map();
        }
        const cKey = cName.toLowerCase();
        const existing = yearCourseMap[yr].get(cKey) || { count: 0, dates: new Set<string>(), monthCounts: {}, title: cName };
        existing.count += 1;
        existing.monthCounts[month] = (existing.monthCounts[month] || 0) + 1;
        const dKey = r.attendanceDate || r.date || r.raw?.['Date'] || r.raw?.['Attendance Date'];
        if (dKey) existing.dates.add(String(dKey).trim());
        yearCourseMap[yr].set(cKey, existing);
      }
    });

    const yearsList = Object.keys(yearCourseMap).map(Number).sort((a, b) => b - a);
    return yearsList.map(yr => {
      const coursesMap = yearCourseMap[yr];
      const distinctCourses = coursesMap.size;
      let totalTrainees = 0;
      coursesMap.forEach(val => { totalTrainees += val.count; });
      const estimatedRounds = Array.from(coursesMap.values()).reduce((acc, val) => {
        return acc + Math.max(val.dates.size, Math.ceil(val.count / 6), 1);
      }, 0);

      const existingPlan = annualPlans.find(p => p.year === yr);
      const currentPlanTargetsCount = existingPlan?.targets?.length || (yr === 2026 ? DEFAULT_CERTIFIED_2026_TARGETS.length : 0);
      const alreadyExists = currentPlanTargetsCount > 0;
      const canUpdateWithMore = distinctCourses > currentPlanTargetsCount;

      return {
        year: yr,
        distinctCourses,
        totalTrainees,
        estimatedRounds,
        alreadyExists,
        currentPlanTargetsCount,
        canUpdateWithMore
      };
    });
  }, [allHistoricalRecords, annualPlans]);

  // Selected Year State (defaults to current year 2026 or newest available)
  const availableYears = useMemo(() => {
    const yrs = annualPlans.map(p => p.year);
    // Include all detected historical years from the database
    historicalYearsSummary.forEach(h => {
      if (!yrs.includes(h.year)) yrs.push(h.year);
    });
    if (!yrs.includes(2026)) yrs.push(2026);
    return Array.from(new Set(yrs)).sort((a, b) => b - a);
  }, [annualPlans, historicalYearsSummary]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return availableYears[0] || 2026;
  });

  const selectedYearHistoricalInfo = useMemo(() => {
    return historicalYearsSummary.find(y => y.year === selectedYear) || null;
  }, [historicalYearsSummary, selectedYear]);

  // Active Year Plan
  const currentPlan = useMemo(() => {
    const found = annualPlans.find(p => p.year === selectedYear);
    if (found && found.targets && found.targets.length > 0) return found;
    if (selectedYear === 2026) {
      return {
        ...DEFAULT_CERTIFIED_2026_PLAN,
        id: found?.id || '2026'
      };
    }
    return found || {
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

  // Edit Year Plan Modal State
  const [isEditYearModalOpen, setIsEditYearModalOpen] = useState(false);
  const [editYearTitle, setEditYearTitle] = useState('');
  const [editYearStatus, setEditYearStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [editYearNotes, setEditYearNotes] = useState('');

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
  const [targetFormDuration, setTargetFormDuration] = useState('5');
  const [targetFormNotes, setTargetFormNotes] = useState('');

  // Auto-Generate Training Plans from History State
  const [isAutoGenerateModalOpen, setIsAutoGenerateModalOpen] = useState(false);
  const [isGeneratingPlans, setIsGeneratingPlans] = useState(false);
  const [autoGenerateOverwriteExisting, setAutoGenerateOverwriteExisting] = useState(false);
  const [selectedYearsToAutoGenerate, setSelectedYearsToAutoGenerate] = useState<number[]>([]);

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

      // 1. Matches in upcomingSessions collection (Filtered by selectedYear)
      const matchingLiveSessions = upcomingSessions.filter(s => {
        let sYear: number | null = null;
        if (s.startDate) {
          const info = extractRecordDateInfo({ date: s.startDate });
          sYear = info.year;
        } else if (s.sessionDate) {
          const info = extractRecordDateInfo({ date: s.sessionDate });
          sYear = info.year;
        }
        if (sYear && sYear !== selectedYear) return false;

        const sTitle = (s.courseTitle || '').trim().toLowerCase();
        return sTitle === normalizedTargetTitle || 
               (normalizedTargetTitle.length >= 6 && sTitle.length >= 6 && (sTitle.includes(normalizedTargetTitle) || normalizedTargetTitle.includes(sTitle)));
      });

      const liveCompletedCount = matchingLiveSessions.filter(s => s.status === 'completed' || s.status === 'Completed').length;
      const liveScheduledCount = matchingLiveSessions.filter(s => s.status !== 'completed' && s.status !== 'Completed' && s.status !== 'cancelled' && s.status !== 'Cancelled').length;

      // 2. Matches in allHistoricalRecords (filtered by selectedYear)
      const matchingHistorical = allHistoricalRecords.filter(r => {
        const { year: yr } = extractRecordDateInfo(r);
        if (yr !== selectedYear) return false;

        const rTitle = (r.courseName || (r as any).courseTitle || '').trim().toLowerCase();
        if (!rTitle) return false;
        return rTitle === normalizedTargetTitle || 
               (normalizedTargetTitle.length >= 6 && rTitle.length >= 6 && (rTitle.includes(normalizedTargetTitle) || normalizedTargetTitle.includes(rTitle)));
      });

      // Group historical trainees by attendance date to count distinct session batches/rounds
      const distinctSessionDates = new Set<string>();
      matchingHistorical.forEach(r => {
        const dKey = r.attendanceDate || r.date || r.raw?.['Date'] || r.raw?.['Attendance Date'] || r.id;
        if (dKey) distinctSessionDates.add(String(dKey).trim());
      });
      const historicalRoundsCount = distinctSessionDates.size > 0 
        ? distinctSessionDates.size 
        : Math.ceil(matchingHistorical.length / (t.traineesPerRound || 6));

      const totalCompleted = Math.max(liveCompletedCount, historicalRoundsCount);
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
  }, [currentPlan, upcomingSessions, allHistoricalRecords, selectedYear]);

  // -------------------------------------------------------------
  // Unplanned / On-Demand Deliveries Tracker (Outside Approved Plan)
  // -------------------------------------------------------------
  const unplannedExecutionItems = useMemo(() => {
    const plannedTargetTitles = (currentPlan.targets || []).map(t => (t.courseTitle || '').trim().toLowerCase()).filter(Boolean);

    const isPlannedTitle = (courseName: string) => {
      const nName = courseName.trim().toLowerCase();
      if (!nName) return true;
      for (const pt of plannedTargetTitles) {
        if (!pt) continue;
        if (pt === nName) return true;
        if (pt.length >= 6 && nName.length >= 6) {
          if (nName.includes(pt) && pt.length >= nName.length * 0.75) return true;
          if (pt.includes(nName) && nName.length >= pt.length * 0.75) return true;
        }
      }
      return false;
    };

    // 1. Historical records executed in selectedYear outside the plan
    const unplannedHistMap: Record<string, {
      courseTitle: string;
      traineesCount: number;
      dates: Set<string>;
      monthCounts: Record<number, number>;
    }> = {};

    allHistoricalRecords.forEach(r => {
      const { year: yr, month } = extractRecordDateInfo(r);
      if (yr !== selectedYear) return;

      const cName = (r.courseName || (r as any).courseTitle || '').trim();
      if (!cName || cName.length < 2 || isPlannedTitle(cName)) return;

      const key = cName.toLowerCase();
      if (!unplannedHistMap[key]) {
        unplannedHistMap[key] = {
          courseTitle: cName,
          traineesCount: 0,
          dates: new Set<string>(),
          monthCounts: {}
        };
      }
      unplannedHistMap[key].traineesCount += 1;
      unplannedHistMap[key].monthCounts[month] = (unplannedHistMap[key].monthCounts[month] || 0) + 1;
      const dKey = r.attendanceDate || r.date || r.raw?.['Date'] || r.raw?.['Attendance Date'];
      if (dKey) unplannedHistMap[key].dates.add(String(dKey).trim());
    });

    // 2. Live sessions executed in selectedYear outside the plan
    const unplannedLiveMap: Record<string, {
      courseTitle: string;
      sessionsCount: number;
      traineesCount: number;
      completedCount: number;
    }> = {};

    (upcomingSessions || []).forEach(s => {
      let yr: number | null = null;
      if (s.startDate) {
        const info = extractRecordDateInfo({ date: s.startDate });
        yr = info.year;
      } else if (s.sessionDate) {
        const info = extractRecordDateInfo({ date: s.sessionDate });
        yr = info.year;
      }
      if (yr !== selectedYear) return;

      const sTitle = (s.courseTitle || '').trim();
      if (!sTitle || isPlannedTitle(sTitle)) return;

      const key = sTitle.toLowerCase();
      if (!unplannedLiveMap[key]) {
        unplannedLiveMap[key] = {
          courseTitle: sTitle,
          sessionsCount: 0,
          traineesCount: 0,
          completedCount: 0
        };
      }
      unplannedLiveMap[key].sessionsCount += 1;
      unplannedLiveMap[key].traineesCount += (s.registeredUsers?.length || 6);
      if (s.status === 'completed' || s.status === 'Completed') {
        unplannedLiveMap[key].completedCount += 1;
      }
    });

    const allKeys = Array.from(new Set([...Object.keys(unplannedHistMap), ...Object.keys(unplannedLiveMap)]));

    return allKeys.map(key => {
      const hist = unplannedHistMap[key];
      const live = unplannedLiveMap[key];
      const title = hist?.courseTitle || live?.courseTitle || key;

      const histRounds = hist ? Math.max(hist.dates.size, Math.ceil(hist.traineesCount / 6), 1) : 0;
      const liveRounds = live?.sessionsCount || 0;
      const completedRounds = Math.max(histRounds, live?.completedCount || liveRounds, 1);
      const totalTrainees = Math.max(hist?.traineesCount || 0, live?.traineesCount || 0, completedRounds * 6);

      let quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';
      if (hist) {
        let bestM = 0;
        let maxM = -1;
        for (const [m, cnt] of Object.entries(hist.monthCounts)) {
          if (cnt > maxM) {
            maxM = cnt;
            bestM = parseInt(m, 10);
          }
        }
        quarter = bestM < 3 ? 'Q1' : bestM < 6 ? 'Q2' : bestM < 9 ? 'Q3' : 'Q4';
      }

      return {
        id: `unplanned_${key}`,
        courseTitle: title,
        completedRounds,
        traineesCount: totalTrainees,
        quarter,
        source: liveRounds > 0 ? 'Live Database' : 'Historical Records'
      };
    });
  }, [currentPlan, allHistoricalRecords, upcomingSessions, selectedYear]);

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

  // Unplanned / Emergent Output Metrics (Delivered Outside Initial Plan)
  const unplannedCoursesCount = unplannedExecutionItems.length;
  const unplannedDeliveredRounds = unplannedExecutionItems.reduce((acc, item) => acc + item.completedRounds, 0);
  const unplannedTraineesCount = unplannedExecutionItems.reduce((acc, item) => acc + item.traineesCount, 0);

  // Gross Output Metrics (Planned Deliveries + On-Demand Emergent Deliveries)
  const grossDeliveredRounds = totalCompletedRounds + unplannedDeliveredRounds;
  const grossDeliveredCourses = countCompletedCourses + unplannedCoursesCount;
  const grossTrainees = targetsWithExecution.reduce((acc, t) => acc + t.actualParticipants, 0) + unplannedTraineesCount;

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

  // -------------------------------------------------------------
  // Annual Results: Line-Item per Session Breakdown with Live Sync
  // -------------------------------------------------------------
  const annualSessionLineItems = useMemo(() => {
    const items: Array<{
      id: string;
      courseTargetId: string;
      courseId?: string;
      courseTitle: string;
      courseTitleEn?: string;
      targetAudience: 'engineers' | 'technicians_operators' | 'summer_training';
      track: AnnualPlanCourseTarget['track'];
      roundIndex: number;
      totalPlannedRounds: number;
      quarter: string;
      plannedTimingNote: string;
      actualDateRange: string | null;
      actualTimingMonth: string | null;
      isDateChanged: boolean;
      status: 'completed' | 'in_progress' | 'awaiting_approval' | 'scheduled' | 'pending';
      plannedTrainees: number;
      actualTrainees: number;
      matchedSessionId?: string;
      matchedSessionNumber?: string | number;
      instructorName?: string;
      location?: string;
    }> = [];

    targetsWithExecution.forEach(t => {
      const plannedRounds = Math.max(1, t.targetRounds || 1);
      const tpr = t.traineesPerRound || 6;
      const liveSessions = (t.matchingLiveSessions || []).slice().sort((a: any, b: any) => {
        const timeA = new Date(a.startDate || 0).getTime();
        const timeB = new Date(b.startDate || 0).getTime();
        return timeA - timeB;
      });

      // Split into completed vs active (in-progress/scheduled/pending approval)
      const completedSessions = liveSessions.filter((s: any) => s.status?.toLowerCase() === 'completed');
      const activeSessions = liveSessions.filter((s: any) => s.status?.toLowerCase() !== 'completed' && s.status?.toLowerCase() !== 'cancelled');

      const totalRoundsToDisplay = Math.max(plannedRounds, completedSessions.length + activeSessions.length);

      for (let r = 1; r <= totalRoundsToDisplay; r++) {
        let status: 'completed' | 'in_progress' | 'awaiting_approval' | 'scheduled' | 'pending' = 'pending';
        let actualDates: string | null = null;
        let actualTimingMonth: string | null = null;
        let actualTrainees = 0;
        let matchedSession: any = null;

        if (r <= completedSessions.length) {
          matchedSession = completedSessions[r - 1];
          status = 'completed';
          if (matchedSession.startDate && matchedSession.endDate) {
            actualDates = `${matchedSession.startDate} – ${matchedSession.endDate}`;
            try {
              actualTimingMonth = new Date(matchedSession.startDate).toLocaleString('en-US', { month: 'short' });
            } catch (e) {
              actualTimingMonth = null;
            }
          }
          actualTrainees = matchedSession.registeredUsers?.length || tpr;
        } else if (r <= completedSessions.length + activeSessions.length) {
          matchedSession = activeSessions[r - completedSessions.length - 1];
          
          if (matchedSession.startDate && matchedSession.endDate) {
            actualDates = `${matchedSession.startDate} – ${matchedSession.endDate}`;
            try {
              actualTimingMonth = new Date(matchedSession.startDate).toLocaleString('en-US', { month: 'short' });
            } catch (e) {
              actualTimingMonth = null;
            }
          } else if (matchedSession.sessionDate) {
            actualDates = matchedSession.sessionDate;
            try {
              actualTimingMonth = new Date(matchedSession.sessionDate).toLocaleString('en-US', { month: 'short' });
            } catch (e) {
              actualTimingMonth = null;
            }
          }

          // Evaluate session end and start against today's date
          const todayStr = new Date().toISOString().split('T')[0];
          const sEnd = (matchedSession.endDate || matchedSession.sessionDate || '').split('T')[0];
          const sStart = (matchedSession.startDate || matchedSession.sessionDate || '').split('T')[0];

          if (sEnd && sEnd < todayStr) {
            // Scheduled dates have passed, but admin hasn't finalized/approved it yet!
            status = 'awaiting_approval';
          } else if (sStart && sStart > todayStr) {
            // Future upcoming dates
            status = 'scheduled';
          } else {
            // Currently active today
            status = 'in_progress';
          }

          actualTrainees = matchedSession.registeredUsers?.length || 0;
        } else if (r <= (t.completedRounds || 0)) {
          // Historical completed batch
          status = 'completed';
          actualDates = 'Completed (Master Records)';
          actualTrainees = tpr;
        } else {
          // Pending for future
          status = 'pending';
          actualDates = null;
          actualTrainees = 0;
        }

        const plannedMonthNote = t.notes ? t.notes.replace(/^Scheduled in\s*/i, '').trim() : t.quarter;
        const isDateChanged = Boolean(
          actualTimingMonth && 
          plannedMonthNote && 
          !plannedMonthNote.toLowerCase().includes(actualTimingMonth.toLowerCase())
        );

        items.push({
          id: `${t.id}_round_${r}`,
          courseTargetId: t.id,
          courseId: t.courseId,
          courseTitle: t.courseTitle,
          courseTitleEn: t.courseTitleEn,
          targetAudience: t.targetAudience,
          track: t.track,
          roundIndex: r,
          totalPlannedRounds: plannedRounds,
          quarter: t.quarter,
          plannedTimingNote: plannedMonthNote,
          actualDateRange: actualDates,
          actualTimingMonth,
          isDateChanged,
          status,
          plannedTrainees: tpr,
          actualTrainees,
          matchedSessionId: matchedSession?.id,
          matchedSessionNumber: matchedSession?.sessionNumber,
          instructorName: matchedSession?.instructorName,
          location: matchedSession?.location || t.notes
        });
      }
    });

    // Also include any live upcomingSessions for selectedYear that were not matched to an annual plan target
    const representedSessionIds = new Set(items.map(i => i.matchedSessionId).filter(Boolean));
    upcomingSessions.forEach((s) => {
      if (s.id && !representedSessionIds.has(s.id) && !s.isDeleted && s.status !== 'Cancelled') {
        const sDateStr = s.startDate || (s as any).sessionDate || '';
        const { year: sYear, month: sMonth } = extractRecordDateInfo({ date: sDateStr });
        const finalYear = sYear || (sDateStr ? new Date(sDateStr).getFullYear() : selectedYear);
        if (finalYear === selectedYear) {
          const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const timingMonth = MONTH_NAMES[sMonth] || null;
          const qNum = Math.floor(sMonth / 3) + 1;
          
          items.push({
            id: `live_session_${s.id}`,
            courseTargetId: s.courseId || s.id,
            courseId: s.courseId || s.id,
            courseTitle: s.courseTitle || 'Training Session',
            courseTitleEn: s.courseTitle || 'Training Session',
            targetAudience: 'engineers',
            track: 'mechanical',
            roundIndex: 1,
            totalPlannedRounds: 1,
            quarter: `Q${qNum}` as any,
            plannedTimingNote: timingMonth ? `Scheduled in ${timingMonth}` : undefined,
            actualDateRange: s.startDate && s.endDate ? `${s.startDate} – ${s.endDate}` : ((s as any).sessionDate || null),
            actualTimingMonth: timingMonth,
            isDateChanged: false,
            status: s.status === 'Completed' ? 'completed' : 'scheduled',
            plannedTrainees: s.targetParticipants ? (parseInt(s.targetParticipants, 10) || 6) : 6,
            actualTrainees: s.registeredUsers?.length || 0,
            matchedSessionId: s.id,
            matchedSessionNumber: s.sessionNumber,
            instructorName: (s as any).instructor,
            location: s.location
          });
        }
      }
    });

    return items;
  }, [targetsWithExecution, upcomingSessions, selectedYear]);

  const filteredAnnualSessionLineItems = useMemo(() => {
    return annualSessionLineItems.filter(item => {
      // Status filter
      if (annualResultsFilter === 'COMPLETED' && item.status !== 'completed') return false;
      if (annualResultsFilter === 'IN_PROGRESS' && item.status !== 'in_progress') return false;
      if (annualResultsFilter === 'AWAITING_APPROVAL' && item.status !== 'awaiting_approval') return false;
      if (annualResultsFilter === 'PENDING' && item.status !== 'pending' && item.status !== 'scheduled') return false;

      // Quarter filter
      if (selectedQuarter !== 'ALL' && item.quarter !== selectedQuarter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.courseTitle.toLowerCase().includes(q);
        const matchesAudience = item.targetAudience.toLowerCase().includes(q);
        const matchesTiming = (item.plannedTimingNote || '').toLowerCase().includes(q) || (item.actualDateRange || '').toLowerCase().includes(q);
        return matchesTitle || matchesAudience || matchesTiming;
      }

      return true;
    });
  }, [annualSessionLineItems, annualResultsFilter, selectedQuarter, searchQuery]);

  const annualResultsKPI = useMemo(() => {
    const totalSessions = annualSessionLineItems.length;
    const completedSessions = annualSessionLineItems.filter(i => i.status === 'completed').length;
    const inProgressSessions = annualSessionLineItems.filter(i => i.status === 'in_progress').length;
    const awaitingApprovalSessions = annualSessionLineItems.filter(i => i.status === 'awaiting_approval').length;
    const scheduledSessions = annualSessionLineItems.filter(i => i.status === 'scheduled').length;
    const pendingSessions = annualSessionLineItems.filter(i => i.status === 'pending').length;

    const totalPlannedTrainees = annualSessionLineItems.reduce((acc, i) => acc + i.plannedTrainees, 0);
    const actualTrainees = annualSessionLineItems.reduce((acc, i) => acc + i.actualTrainees, 0);

    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    return {
      totalSessions,
      completedSessions,
      inProgressSessions,
      awaitingApprovalSessions,
      scheduledSessions,
      pendingSessions,
      totalPlannedTrainees,
      actualTrainees,
      completionRate
    };
  }, [annualSessionLineItems]);



  // -------------------------------------------------------------
  // Wall Calendar: 12-Month Quarterly Schedule Data Engine
  // -------------------------------------------------------------
  const calendarMonthsData = useMemo(() => {
    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH',
      'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER',
      'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];

    const monthMapLookup: Record<string, number> = {
      january: 0, jan: 0,
      february: 1, feb: 1,
      march: 2, mar: 2,
      april: 3, apr: 3,
      may: 4,
      june: 5, jun: 5,
      july: 6, jul: 6,
      august: 7, aug: 7,
      september: 8, sep: 8,
      october: 9, oct: 9,
      november: 10, nov: 10,
      december: 11, dec: 11
    };

    // Group items by assigned month index (0 to 11)
    const itemsByMonth: Array<typeof annualSessionLineItems> = Array.from({ length: 12 }, () => []);

    annualSessionLineItems.forEach(item => {
      let mIdx: number | null = null;

      // 1. Check planned timing note for explicit month (e.g. "Scheduled in January", "May")
      if (item.plannedTimingNote) {
        const noteClean = item.plannedTimingNote.toLowerCase().replace(/[^a-z]/g, ' ');
        const words = noteClean.split(/\s+/);
        for (const w of words) {
          if (monthMapLookup[w] !== undefined) {
            mIdx = monthMapLookup[w];
            break;
          }
        }
      }

      // 2. Master Course Schedule Map (guarantees official 12-month distribution for all 16 programs)
      if (mIdx === null) {
        const titleLower = (item.courseTitle || '').toLowerCase().trim();
        const isTech = item.targetAudience === 'technicians_operators';

        if (titleLower.includes('diesel engine') && isTech) {
          mIdx = 1; // February (Technicians)
        } else if (titleLower.includes('diesel engine')) {
          mIdx = 1; // February (Engineers)
        } else if (titleLower.includes('hydraulic') && isTech) {
          mIdx = 4; // May (Technicians)
        } else if (titleLower.includes('hydraulic') && titleLower.includes('advanced')) {
          mIdx = 5; // June (Engineers)
        } else if (titleLower.includes('hydraulic')) {
          mIdx = 3; // April (Engineers)
        } else if (titleLower.includes('maintenance') && isTech) {
          mIdx = 10; // November (Technicians)
        } else if (titleLower.includes('maintenance')) {
          mIdx = 9; // October (Engineers)
        } else if (titleLower.includes('electrical power') || titleLower.includes('generation')) {
          mIdx = 0; // January (Engineers)
        } else if (titleLower.includes('electricity') || titleLower.includes('fundamentals')) {
          mIdx = 2; // March (Engineers)
        } else if (titleLower.includes('electronic diesel') || titleLower.includes(' et')) {
          mIdx = 2; // March (Engineers)
        } else if (titleLower.includes('power train')) {
          mIdx = 6; // July (Engineers)
        } else if (titleLower.includes('950h') || titleLower.includes('loader')) {
          mIdx = 7; // August (Engineers)
        } else if (titleLower.includes('summer')) {
          mIdx = 8; // September (Engineers)
        } else if (titleLower.includes('defensive')) {
          mIdx = 8; // September (Drivers)
        } else if (titleLower.includes('oil sample') || titleLower.includes('s.o.s')) {
          mIdx = 9; // October (Engineers)
        } else if (titleLower.includes('14m') || titleLower.includes('grader')) {
          mIdx = 11; // December (Engineers)
        }
      }

      // 3. Check actual timing month if real session is scheduled in a specific month
      if (mIdx === null && item.actualTimingMonth) {
        const mKey = item.actualTimingMonth.toLowerCase().trim();
        if (monthMapLookup[mKey] !== undefined) {
          mIdx = monthMapLookup[mKey];
        }
      }

      // 4. Check actual date range
      if (mIdx === null && item.actualDateRange && item.actualDateRange.includes('–')) {
        const [startStr] = item.actualDateRange.split('–').map(s => s.trim());
        const d = new Date(startStr);
        if (!isNaN(d.getTime())) {
          mIdx = d.getMonth();
        }
      }

      // 5. Fallback to Quarter (Q1 -> Jan/Feb/Mar, Q2 -> Apr/May/Jun, etc.)
      if (mIdx === null && item.quarter) {
        const qNum = parseInt(item.quarter.replace(/[^0-9]/g, ''), 10) || 1;
        const baseMonth = (qNum - 1) * 3;
        const roundOffset = (item.roundIndex - 1) % 3;
        mIdx = Math.min(11, baseMonth + roundOffset);
      }

      if (mIdx === null) {
        mIdx = 0;
      }

      itemsByMonth[mIdx].push(item);
    });

    // Process each month to produce 7-column calendar weeks and multi-day spanning bars
    return monthNames.map((name, monthIndex) => {
      const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
      const firstDayOfWeek = new Date(selectedYear, monthIndex, 1).getDay(); // 0 = Sun ... 6 = Sat
      const quarterNumber = Math.floor(monthIndex / 3) + 1;
      const quarterName = `Q${quarterNumber}`;

      // Build flat cells
      const flatCells: Array<{
        dayNumber: number | null;
        dateStr: string | null;
        dayOfWeek: number;
        isWorkday: boolean;
      }> = [];

      // Leading empty slots
      for (let i = 0; i < firstDayOfWeek; i++) {
        flatCells.push({
          dayNumber: null,
          dateStr: null,
          dayOfWeek: i,
          isWorkday: false
        });
      }

      // Real days
      for (let d = 1; d <= daysInMonth; d++) {
        const mStr = String(monthIndex + 1).padStart(2, '0');
        const dStr = String(d).padStart(2, '0');
        const dateStr = `${selectedYear}-${mStr}-${dStr}`;
        const dayOfWeek = new Date(selectedYear, monthIndex, d).getDay();
        const isWorkday = dayOfWeek >= 0 && dayOfWeek <= 4;

        // Find any active public holiday or personal vacation on this date
        const matchingHolidays = holidaysAndVacations.filter(h => {
          if (dateStr < h.startDate || dateStr > h.endDate) return false;
          if (h.type === 'public') return true;
          // personal vacation
          if (isAdmin) return true;
          return h.userId === user?.id;
        });

        const hasPublicHoliday = matchingHolidays.some(h => h.type === 'public');
        const hasPersonalVacation = matchingHolidays.some(h => h.type === 'personal');

        flatCells.push({
          dayNumber: d,
          dateStr,
          dayOfWeek,
          isWorkday,
          holidays: matchingHolidays,
          hasPublicHoliday,
          hasPersonalVacation
        } as any);
      }

      // Complete to full 7-day weeks (35 or 42 cells)
      const totalCellsNeeded = flatCells.length <= 35 ? 35 : 42;
      while (flatCells.length < totalCellsNeeded) {
        flatCells.push({
          dayNumber: null,
          dateStr: null,
          dayOfWeek: flatCells.length % 7,
          isWorkday: false
        });
      }

      // Group flatCells into weeks (rows of 7 days)
      const weeks: Array<typeof flatCells> = [];
      for (let i = 0; i < flatCells.length; i += 7) {
        weeks.push(flatCells.slice(i, i + 7));
      }

      // Schedule all sessions assigned to this month into concrete day ranges
      const monthSessions = itemsByMonth[monthIndex];

      // Standard work slots inside this month (Sun to Thu weeks)
      // Slot 1: Days 4-8 (or 3-7 depending on start), Slot 2: Days 11-15, Slot 3: Days 18-22, Slot 4: Days 25-29
      const scheduledEventSpans: Array<{
        session: (typeof annualSessionLineItems)[0];
        startDay: number;
        endDay: number;
        duration: number;
      }> = [];

      // Find suitable Sunday-starts for consecutive work-weeks
      const sundayDays: number[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(selectedYear, monthIndex, d).getDay() === 0) {
          sundayDays.push(d);
        }
      }

      monthSessions.forEach((session, sIdx) => {
        let startDay = 0;
        let endDay = 0;

        // If session has exact dates in this month
        if (session.actualDateRange && session.actualDateRange.includes('–')) {
          const [startStr, endStr] = session.actualDateRange.split('–').map(s => s.trim());
          const sDate = new Date(startStr);
          const eDate = new Date(endStr);
          if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && sDate.getMonth() === monthIndex) {
            startDay = sDate.getDate();
            endDay = Math.min(daysInMonth, eDate.getDate());
          }
        }

        // If not exact or fell outside, assign to a dedicated week in this month
        if (!startDay || !endDay || endDay < startDay) {
          const targetSun = sundayDays[sIdx % Math.max(1, sundayDays.length)] || ((sIdx * 7) % Math.max(1, daysInMonth - 5) + 1);
          startDay = Math.max(1, Math.min(daysInMonth - 3, targetSun));
          // Default 3 to 4 working days span
          const durationDays = 3;
          endDay = Math.min(daysInMonth, startDay + durationDays - 1);
        }

        scheduledEventSpans.push({
          session,
          startDay,
          endDay,
          duration: endDay - startDay + 1
        });
      });

      // Active holidays and vacations for this month spanning across days
      const mStartStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      const mEndStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const activeMonthHolidays = holidaysAndVacations.filter(h => {
        if (h.startDate > mEndStr || h.endDate < mStartStr) return false;
        if (h.type === 'public') return true;
        if (isAdmin) return true;
        return h.userId === user?.id;
      });

      const scheduledHolidaySpans = activeMonthHolidays.map(h => {
        let startDay = 1;
        let endDay = daysInMonth;

        if (h.startDate >= mStartStr) {
          const parts = h.startDate.split('-');
          startDay = parseInt(parts[2], 10) || 1;
        }
        if (h.endDate <= mEndStr) {
          const parts = h.endDate.split('-');
          endDay = parseInt(parts[2], 10) || daysInMonth;
        }

        return {
          holiday: h,
          startDay,
          endDay
        };
      });

      // Break each event and holiday span across calendar week rows for continuous horizontal bars
      const weekRows = weeks.map((weekCells) => {
        const firstCellDay = weekCells.find(c => c.dayNumber !== null)?.dayNumber || null;
        const lastCellDay = weekCells.slice().reverse().find(c => c.dayNumber !== null)?.dayNumber || null;

        const eventBarsInThisWeek: Array<{
          session: (typeof annualSessionLineItems)[0];
          startCol: number; // 0 to 6
          spanCols: number; // 1 to 7
          isStart: boolean;
          isEnd: boolean;
        }> = [];

        const holidayBarsInThisWeek: Array<{
          holiday: (typeof holidaysAndVacations)[0];
          startCol: number; // 0 to 6
          spanCols: number; // 1 to 7
          isStart: boolean;
          isEnd: boolean;
        }> = [];

        if (firstCellDay !== null && lastCellDay !== null) {
          // Multi-day holiday bars
          scheduledHolidaySpans.forEach(hSpan => {
            if (hSpan.startDay <= lastCellDay && hSpan.endDay >= firstCellDay) {
              const segStartDay = Math.max(hSpan.startDay, firstCellDay);
              const segEndDay = Math.min(hSpan.endDay, lastCellDay);

              const startCol = weekCells.findIndex(c => c.dayNumber === segStartDay);
              const endCol = weekCells.findIndex(c => c.dayNumber === segEndDay);

              if (startCol !== -1 && endCol !== -1 && endCol >= startCol) {
                holidayBarsInThisWeek.push({
                  holiday: hSpan.holiday,
                  startCol,
                  spanCols: endCol - startCol + 1,
                  isStart: hSpan.startDay === segStartDay,
                  isEnd: hSpan.endDay === segEndDay
                });
              }
            }
          });

          // Course session bars
          scheduledEventSpans.forEach(ev => {
            if (ev.startDay <= lastCellDay && ev.endDay >= firstCellDay) {
              const segStartDay = Math.max(ev.startDay, firstCellDay);
              const segEndDay = Math.min(ev.endDay, lastCellDay);

              const startCol = weekCells.findIndex(c => c.dayNumber === segStartDay);
              const endCol = weekCells.findIndex(c => c.dayNumber === segEndDay);

              if (startCol !== -1 && endCol !== -1 && endCol >= startCol) {
                eventBarsInThisWeek.push({
                  session: ev.session,
                  startCol,
                  spanCols: endCol - startCol + 1,
                  isStart: ev.startDay === segStartDay,
                  isEnd: ev.endDay === segEndDay
                });
              }
            }
          });
        }

        return {
          cells: weekCells,
          events: eventBarsInThisWeek,
          holidayBars: holidayBarsInThisWeek
        };
      });

      return {
        monthIndex,
        name,
        quarter: quarterName,
        days: flatCells,
        weekRows,
        monthSessions
      };
    });
  }, [selectedYear, annualSessionLineItems, holidaysAndVacations, user?.id, isAdmin]);

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

  const handleSaveEditYearPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPlan: AnnualYearPlan = {
      ...currentPlan,
      title: editYearTitle.trim() || `Annual Training Plan ${selectedYear}`,
      status: editYearStatus,
      notes: editYearNotes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    await saveAnnualPlan(updatedPlan);
    setIsEditYearModalOpen(false);
  };

  const handleDeleteActiveYearPlan = async () => {
    const isMaster2026 = selectedYear === 2026;
    const confirmPrompt = isMaster2026
      ? `Are you sure you want to reset the 2026 Annual Training Plan? This will remove custom additions and restore the certified official baseline.`
      : `Are you sure you want to permanently delete the Annual Training Plan for ${selectedYear} and all of its ${currentPlan.targets?.length || 0} program targets? This action cannot be undone.`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      await deleteAnnualPlan(currentPlan.id || String(selectedYear));
      const remainingYears = availableYears.filter(y => y !== selectedYear);
      const nextYear = remainingYears.includes(2026) ? 2026 : (remainingYears[0] || 2026);
      setSelectedYear(nextYear);
    } catch (e: any) {
      alert('Failed to delete year plan: ' + (e?.message || 'Unknown error'));
    }
  };

  const openAddCourseModal = () => {
    setEditingTargetId(null);
    setTargetFormCourseTitle(courses[0]?.title || '');
    setTargetFormRounds('2');
    setTargetFormTraineesPerRound('6');
    setTargetFormTrainees('12');
    setTargetFormAudience('engineers');
    setTargetFormQuarter('Q1');
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
  // Auto-Generate Training Plans from Historical Records Handler
  // -------------------------------------------------------------
  // Auto-Generate Training Plans from Historical Records Handler
  // -------------------------------------------------------------
  const handleAutoGeneratePlans = async (specificYears?: number[], forceOverwrite?: boolean) => {
    const yearsToRun = specificYears || selectedYearsToAutoGenerate;
    const shouldOverwrite = forceOverwrite !== undefined ? forceOverwrite : autoGenerateOverwriteExisting;
    if (yearsToRun.length === 0) return;
    setIsGeneratingPlans(true);
    try {
      for (const yr of yearsToRun) {
        const exists = annualPlans.some(p => p.year === yr && p.targets && p.targets.length > 0);
        if (exists && !shouldOverwrite) continue;

        // Group courses from allHistoricalRecords for yr
        const courseMap: Record<string, { count: number; dates: Set<string>; monthCounts: Record<number, number>; title: string }> = {};

        allHistoricalRecords.forEach(r => {
          const { year: recordYear, month } = extractRecordDateInfo(r);
          if (recordYear !== yr) return;

          const cName = (r.courseName || (r as any).courseTitle || '').trim();
          if (!cName || cName.length < 2) return;

          const key = cName.toLowerCase();
          if (!courseMap[key]) {
            courseMap[key] = { count: 0, dates: new Set<string>(), monthCounts: {}, title: cName };
          }
          courseMap[key].count += 1;
          courseMap[key].monthCounts[month] = (courseMap[key].monthCounts[month] || 0) + 1;
          const dKey = r.attendanceDate || r.date || r.raw?.['Date'] || r.raw?.['Attendance Date'];
          if (dKey) courseMap[key].dates.add(String(dKey).trim());
        });

        // Also check upcomingSessions in case some are scheduled or completed in that year
        (upcomingSessions || []).forEach(s => {
          let sYear: number | null = null;
          let sMonth = 0;
          if (s.startDate) {
            const info = extractRecordDateInfo({ date: s.startDate });
            sYear = info.year;
            sMonth = info.month;
          } else if (s.sessionDate) {
            const info = extractRecordDateInfo({ date: s.sessionDate });
            sYear = info.year;
            sMonth = info.month;
          }
          if (sYear !== yr) return;

          const sTitle = (s.courseTitle || '').trim();
          if (!sTitle) return;

          const key = sTitle.toLowerCase();
          if (!courseMap[key]) {
            courseMap[key] = { count: 0, dates: new Set<string>(), monthCounts: {}, title: sTitle };
          }
          courseMap[key].count += (s.registeredUsers?.length || 6);
          courseMap[key].monthCounts[sMonth] = (courseMap[key].monthCounts[sMonth] || 0) + 1;
          if (s.id) courseMap[key].dates.add(s.id);
        });

        const targets: AnnualPlanCourseTarget[] = Object.values(courseMap).map((entry, idx) => {
          let bestMonth = 0;
          let maxCount = -1;
          for (const [mStr, cnt] of Object.entries(entry.monthCounts)) {
            if (cnt > maxCount) {
              maxCount = cnt;
              bestMonth = parseInt(mStr, 10);
            }
          }
          const quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 
            bestMonth < 3 ? 'Q1' : bestMonth < 6 ? 'Q2' : bestMonth < 9 ? 'Q3' : 'Q4';

          const rounds = Math.max(entry.dates.size, Math.ceil(entry.count / 6), 1);

          return {
            id: `t_${yr}_${idx}_${Date.now()}`,
            courseTitle: entry.title,
            targetRounds: rounds,
            traineesPerRound: 6,
            targetTrainees: entry.count,
            targetAudience: 'engineers',
            quarter,
            durationDays: 5,
            notes: `Auto-generated from verified training records (${entry.count} trainees, ${rounds} rounds).`
          };
        });

        if (targets.length > 0) {
          const existingPlan = annualPlans.find(p => p.year === yr);
          const newPlan: AnnualYearPlan = {
            id: existingPlan?.id || String(yr),
            year: yr,
            title: `Annual Training Plan ${yr}`,
            status: yr < currentRealYear ? 'archived' : 'active',
            targets,
            notes: `Auto-generated from verified training attendance records (${targets.length} programs).`,
            createdAt: existingPlan?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await saveAnnualPlan(newPlan);
        }
      }
      setIsAutoGenerateModalOpen(false);
      if (yearsToRun.length > 0) {
        setSelectedYear(yearsToRun[0]);
      }
    } catch (err) {
      console.error('Failed to auto-generate plans:', err);
      alert('Failed to auto-generate plans. Check console for details.');
    } finally {
      setIsGeneratingPlans(false);
    }
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
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <CalendarRange size={16} className="text-[#002D62] dark:text-amber-400" />
              <span>Plan Year:</span>
            </div>

            {/* Year Dropdown Selector */}
            <div className="relative inline-flex items-center">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-[#002D62] dark:border-blue-700 text-[#002D62] dark:text-white text-sm font-black shadow-xs hover:border-blue-900 dark:hover:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-[#002D62] transition-all cursor-pointer min-w-[240px] sm:min-w-[270px]"
                title="Select training plan year"
              >
                {availableYears.map(yr => {
                  const isCurrentYear = yr === currentRealYear;
                  const yearTargetsCount = (annualPlans.find(p => p.year === yr)?.targets || (yr === 2026 ? DEFAULT_CERTIFIED_2026_TARGETS : [])).length;
                  const statusTag = isCurrentYear ? 'CURRENT' : yr > currentRealYear ? 'Upcoming' : 'Archived';
                  return (
                    <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold py-1">
                      {yr} — {statusTag} ({yearTargetsCount} {yearTargetsCount === 1 ? 'Program' : 'Programs'})
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-3 pointer-events-none text-[#002D62] dark:text-amber-400">
                <ChevronDown size={16} />
              </div>
            </div>

            {/* Active Year Status Tag */}
            <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-2xs ${
              selectedYear === currentRealYear
                ? 'bg-amber-400 text-slate-950 border border-amber-500/40'
                : selectedYear > currentRealYear
                ? 'bg-blue-100 text-blue-950 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                selectedYear === currentRealYear ? 'bg-slate-950 animate-pulse' : 'bg-current'
              }`} />
              <span>{selectedYear === currentRealYear ? 'Current Year' : selectedYear > currentRealYear ? 'Upcoming Year' : 'Archived Year'}</span>
              <span className="text-[11px] opacity-75 font-bold">
                • {targetsWithExecution.length} Programs
              </span>
            </span>

            {/* Edit and Delete Plan Buttons (Admin Only) */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 pl-1 sm:border-l sm:border-slate-200 dark:sm:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setEditYearTitle(currentPlan.title || `Annual Training Plan ${selectedYear}`);
                    setEditYearStatus(currentPlan.status || 'active');
                    setEditYearNotes(currentPlan.notes || '');
                    setIsEditYearModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title={`Edit Plan ${selectedYear} Details`}
                >
                  <Edit2 size={13} className="text-[#002D62] dark:text-amber-400" />
                  <span>Edit Plan</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteActiveYearPlan}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 border border-rose-200 dark:border-rose-800/60 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title={`Delete Annual Plan for ${selectedYear}`}
                >
                  <Trash2 size={13} className="text-rose-600 dark:text-rose-400" />
                  <span>Delete Plan</span>
                </button>
              </div>
            )}
          </div>

          {/* Prominent Action: Auto-Generate + Add New Year Plan + Import Plan (Excel) (Admin Only) */}
          {isAdmin && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const ungenerated = historicalYearsSummary.filter(y => !y.alreadyExists).map(y => y.year);
                  setSelectedYearsToAutoGenerate(ungenerated.length > 0 ? ungenerated : historicalYearsSummary.map(y => y.year));
                  setIsAutoGenerateModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs shrink-0"
                title="Auto-Generate Annual Plans from Historical Database"
              >
                <Wand2 size={16} className="text-slate-950" />
                <span>⚡ Auto-Generate from History</span>
              </button>

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

        {/* Database Sync / Re-Populate Alert Banner for Selected Year */}
        {selectedYearHistoricalInfo && selectedYearHistoricalInfo.canUpdateWithMore && isAdmin && (
          <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/5 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-slate-900/40 border-2 border-amber-400/60 dark:border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-2xs">
                <Sparkles size={18} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200">
                    Database contains {selectedYearHistoricalInfo.distinctCourses} completed courses for {selectedYear} ({selectedYearHistoricalInfo.totalTrainees} trainee attendances)
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    Sync Available
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Your current approved plan only has {selectedYearHistoricalInfo.currentPlanTargetsCount} course(s). Click to automatically populate all {selectedYearHistoricalInfo.distinctCourses} programs, rounds, and schedules from verified records.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleAutoGeneratePlans([selectedYear], true)}
              disabled={isGeneratingPlans}
              className="px-4 py-2.5 rounded-xl bg-[#002D62] hover:bg-blue-950 dark:bg-blue-800 dark:hover:bg-blue-700 text-amber-300 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 transition-all cursor-pointer shadow-xs active:scale-95 border border-amber-400/40"
            >
              {isGeneratingPlans ? (
                <>
                  <RefreshCw size={15} className="animate-spin text-amber-300" />
                  <span>Populating {selectedYear}...</span>
                </>
              ) : (
                <>
                  <Zap size={15} className="text-amber-300" />
                  <span>⚡ Auto-Fill {selectedYear} Plan ({selectedYearHistoricalInfo.distinctCourses} Courses)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Executive KPI Summary Strip: Dual Metric (Approved Plan vs Delivered vs On-Demand vs Gross Output) */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card 1: Approved Plan Target */}
          <div className="bg-slate-50 dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-colors">
            <div>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                <span>🎯</span>
                <span>Approved Plan Target</span>
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#002D62] dark:text-amber-300 mt-1.5 block">
                {totalTargetRounds} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Rounds</span>
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                {targetsWithExecution.length} Approved Programs ({selectedYear})
              </span>
            </div>
          </div>

          {/* Card 2: Delivered from Plan (Plan Adherence / Compliance) */}
          <div className="bg-blue-50/70 dark:bg-slate-800/90 rounded-xl p-3.5 border border-blue-200/80 dark:border-slate-700 flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-[#002D62] dark:text-slate-200 font-bold flex items-center gap-1">
                  <span>✅</span>
                  <span>Delivered from Plan</span>
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-[#002D62] dark:text-amber-300 border border-blue-200 dark:border-blue-700">
                  {overallCompletionRate}% Adherence
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-[#002D62] dark:text-white">
                  {totalCompletedRounds}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-300 font-medium">
                  / {totalTargetRounds} rounds
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <div className="w-full bg-blue-200/60 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#002D62] dark:bg-amber-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${overallCompletionRate}%` }} 
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                {countCompletedCourses} of {targetsWithExecution.length} targets fulfilled
              </span>
            </div>
          </div>

          {/* Card 3: On-Demand & Unplanned Deliveries (Executed Outside Initial Plan) */}
          <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-xl p-3.5 border border-amber-200/80 dark:border-amber-800/50 flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                  <Zap size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>On-Demand Executed</span>
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  Extra Output
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-300">
                  +{unplannedDeliveredRounds}
                </span>
                <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                  rounds ({unplannedCoursesCount} programs)
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-[10px] text-amber-700/80 dark:text-amber-400 block font-medium">
                {unplannedTraineesCount.toLocaleString()} Trainees (Emergent needs)
              </span>
            </div>
          </div>

          {/* Card 4: Gross Total Output (Plan + Emergent) */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl p-3.5 border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col justify-between transition-colors">
            <div>
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                <span>🏆</span>
                <span>Gross Delivered Output</span>
              </span>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-300">
                  {grossDeliveredRounds}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-300 font-medium">
                  Total Rounds
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">
                {grossTrainees.toLocaleString()} Trainees Trained Across {grossDeliveredCourses} Programs
              </span>
            </div>
          </div>

          {/* Card 5: Time-Paced Status or Remaining Plan Target */}
          <div className="bg-slate-50 dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                  <span>⏱️</span>
                  <span>{isCurrentYearPlan ? 'Time-Paced Progress' : 'Remaining Target'}</span>
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  isCurrentYearPlan ? paceStatus.badge : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                }`}>
                  {isCurrentYearPlan ? paceStatus.shortLabel : `${totalRemainingRounds} Left`}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {isCurrentYearPlan 
                    ? (pacedCompletionRate !== null ? `${pacedCompletionRate}%` : '---')
                    : totalRemainingRounds}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-300 font-medium">
                  {isCurrentYearPlan ? `(vs ${expectedRoundsYTD} paced)` : 'rounds remaining'}
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                {isCurrentYearPlan ? `Linear pace thru ${currentMonthName}` : `${totalScheduledRounds} Currently Scheduled`}
              </span>
            </div>
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
            onClick={() => setActiveMainTab('annualResults')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              activeMainTab === 'annualResults'
                ? 'bg-[#002D62] text-white shadow-md shadow-[#002D62]/25 dark:bg-blue-900 dark:text-white ring-1 ring-white/10'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Award size={16} className={activeMainTab === 'annualResults' ? 'text-amber-400' : 'text-slate-500 dark:text-slate-400'} />
            <span>Annual Results</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              activeMainTab === 'annualResults'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
            }`}>
              {annualResultsKPI.completedSessions}/{annualResultsKPI.totalSessions} Done
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('wallCalendar')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              activeMainTab === 'wallCalendar'
                ? 'bg-[#002D62] text-white shadow-md shadow-[#002D62]/25 dark:bg-blue-900 dark:text-white ring-1 ring-white/10'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <CalendarRange size={16} className={activeMainTab === 'wallCalendar' ? 'text-[#FFC000]' : 'text-slate-500 dark:text-slate-400'} />
            <span>Quarterly Schedule</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              activeMainTab === 'wallCalendar'
                ? 'bg-[#FFC000] text-[#001D42]'
                : 'bg-blue-50 dark:bg-blue-950/40 text-[#002D62] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60'
            }`}>
              12 Months
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
              placeholder="Search plan by course title, audience or notes..."
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

          {/* Annual Results Status Filter (Only when on annualResults tab) */}
          {activeMainTab === 'annualResults' && (
            <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-3 flex-wrap">
              {(['ALL', 'COMPLETED', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'PENDING'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAnnualResultsFilter(f)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    annualResultsFilter === f
                      ? 'bg-[#002D62] text-white dark:bg-blue-900 dark:text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f === 'ALL'
                    ? `All (${annualResultsKPI.totalSessions})`
                    : f === 'COMPLETED'
                    ? `🟢 Completed (${annualResultsKPI.completedSessions})`
                    : f === 'IN_PROGRESS'
                    ? `🟡 Active (${annualResultsKPI.inProgressSessions})`
                    : f === 'AWAITING_APPROVAL'
                    ? `🟠 Awaiting Approval (${annualResultsKPI.awaitingApprovalSessions})`
                    : `⚪ Planned (${annualResultsKPI.pendingSessions + annualResultsKPI.scheduledSessions})`}
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
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {t.durationDays || 5} Days
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

      {/* 5. TAB CONTENT: Annual Results — Line-Item per Session Scorecard */}
      {activeMainTab === 'annualResults' && (
        <div className="space-y-5">
          {/* Executive KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Card 1: Delivery Rate */}
            <div className="col-span-2 sm:col-span-1 bg-blue-50/70 dark:bg-slate-900 rounded-2xl p-4 border border-blue-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#002D62] dark:text-blue-300 block">
                  Delivery Rate
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#002D62] dark:text-amber-300 mt-1">
                  {annualResultsKPI.completionRate}%
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      annualResultsKPI.completionRate >= 100
                        ? 'bg-emerald-500'
                        : annualResultsKPI.completionRate > 0
                        ? 'bg-amber-400'
                        : 'bg-slate-300'
                    }`}
                    style={{ width: `${Math.min(100, annualResultsKPI.completionRate)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                  {annualResultsKPI.completedSessions} of {annualResultsKPI.totalSessions} Sessions Delivered
                </span>
              </div>
            </div>

            {/* Card 2: Completed Sessions */}
            <div className="bg-emerald-50/70 dark:bg-slate-900 rounded-2xl p-4 border border-emerald-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Completed</span>
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
                {annualResultsKPI.completedSessions}
              </div>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium block mt-1">
                {annualResultsKPI.actualTrainees} Trainees Attended
              </span>
            </div>

            {/* Card 3: Active Now (In Progress) */}
            <div className="bg-amber-50/70 dark:bg-slate-900 rounded-2xl p-4 border border-amber-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Active Now</span>
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-300 mt-1">
                {annualResultsKPI.inProgressSessions}
              </div>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-medium block mt-1">
                Running Today
              </span>
            </div>

            {/* Card 4: Awaiting Approval (Ended) */}
            <div className="bg-orange-50/70 dark:bg-slate-900 rounded-2xl p-4 border border-orange-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-orange-900 dark:text-orange-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span>Awaiting Approval</span>
              </span>
              <div className="text-2xl sm:text-3xl font-black text-orange-900 dark:text-orange-300 mt-1">
                {annualResultsKPI.awaitingApprovalSessions}
              </div>
              <span className="text-[11px] text-orange-800/80 dark:text-orange-400/80 font-medium block mt-1">
                Ended / Pending Sign-off
              </span>
            </div>

            {/* Card 5: Planned Sessions */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Planned</span>
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200 mt-1">
                {annualResultsKPI.pendingSessions + annualResultsKPI.scheduledSessions}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-1">
                Upcoming in Schedule
              </span>
            </div>
          </div>

          {/* Line-Item per Session Results Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#002D62] dark:text-white flex items-center gap-2">
                  <Award size={18} className="text-[#FFC000]" />
                  <span>{selectedYear} Annual Training Results & Session Delivery</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time status breakdown for every planned course round and live session.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMainTab('wallCalendar')}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-[#002D62] dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-blue-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                  title="Switch to Executive 12-Month Wall Calendar Poster"
                >
                  <CalendarRange size={14} className="text-[#FFC000]" />
                  <span>Quarterly Calendar View</span>
                </button>
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
                  Showing {filteredAnnualSessionLineItems.length} of {annualSessionLineItems.length} Sessions
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-20 shadow-md">
                  <tr className="bg-[#002D62] text-white">
                    <th className="sticky top-0 bg-[#002D62] text-white py-3.5 px-4 min-w-[240px] font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                      Course Title
                    </th>
                    <th className="sticky top-0 bg-[#002D62] text-white py-3.5 px-3 min-w-[120px] text-center font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                      Round
                    </th>
                    <th className="sticky top-0 bg-[#002D62] text-white py-3.5 px-3 min-w-[150px] font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                      Target Audience
                    </th>
                    <th className="sticky top-0 bg-[#002D62] text-white py-3.5 px-4 min-w-[240px] font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                      Scheduled Timing (Planned vs Actual)
                    </th>
                    <th className="sticky top-0 bg-[#002D62] text-white py-3.5 px-4 min-w-[160px] text-center font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                      Trainees (Planned vs Actual)
                    </th>
                    <th className="sticky top-0 bg-[#002D62] text-white py-3.5 px-4 min-w-[150px] text-center font-black uppercase tracking-wider text-[11px] border-b border-blue-950">
                      Delivery Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAnnualSessionLineItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <div className="space-y-2">
                          <BookOpen size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                          <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                            No session records found matching your filter criteria.
                          </p>
                          <p className="text-xs text-slate-400">
                            Try switching to "All" or adjusting the quarter selection.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAnnualSessionLineItems.map(item => {
                      // Row background tint based on status
                      const rowBg =
                        item.status === 'completed'
                          ? 'bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-950/15 dark:hover:bg-emerald-950/30'
                          : item.status === 'in_progress'
                          ? 'bg-amber-50/30 hover:bg-amber-50/60 dark:bg-amber-950/15 dark:hover:bg-amber-950/30'
                          : item.status === 'awaiting_approval'
                          ? 'bg-orange-50/40 hover:bg-orange-50/70 dark:bg-orange-950/20 dark:hover:bg-orange-950/40'
                          : item.status === 'scheduled'
                          ? 'bg-sky-50/30 hover:bg-sky-50/60 dark:bg-sky-950/15 dark:hover:bg-sky-950/30'
                          : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50';

                      return (
                        <tr key={item.id} className={`${rowBg} transition-colors`}>
                          {/* 1. Course Title */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm block">
                                {item.courseTitle}
                              </span>
                              {item.location && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] block">
                                  📍 {item.location}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Round */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-nowrap shadow-2xs">
                              {item.roundIndex <= item.totalPlannedRounds
                                ? `Round ${item.roundIndex} of ${item.totalPlannedRounds}`
                                : `Extra Round #${item.roundIndex}`}
                            </span>
                          </td>

                          {/* 3. Target Audience */}
                          <td className="py-3.5 px-3">
                            {item.targetAudience === 'engineers' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                Engineers
                              </span>
                            )}
                            {item.targetAudience === 'technicians_operators' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                                Techs & Operators
                              </span>
                            )}
                            {item.targetAudience === 'summer_training' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                                Summer Training
                              </span>
                            )}
                          </td>

                          {/* 4. Scheduled Timing (Planned vs Actual) */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              {item.actualDateRange ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-xs font-black text-[#002D62] dark:text-amber-300">
                                    <Calendar size={13} className="shrink-0" />
                                    <span>{item.actualDateRange}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                                    Planned: {item.plannedTimingNote || item.quarter}
                                    {item.isDateChanged && (
                                      <span className="ml-1 text-amber-600 dark:text-amber-400 font-bold">
                                        (Rescheduled)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                  <CalendarDays size={13} className="text-slate-400 shrink-0" />
                                  <span>Planned: {item.plannedTimingNote || item.quarter}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Trainees (Planned vs Actual) */}
                          <td className="py-3.5 px-4 text-center">
                            {item.status === 'completed' ? (
                              <div className="space-y-0.5">
                                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 block">
                                  {item.actualTrainees} Trainees
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                  Planned: {item.plannedTrainees} (Target Achieved)
                                </span>
                              </div>
                            ) : item.status === 'in_progress' ? (
                              <div className="space-y-0.5">
                                <span className="text-sm font-black text-amber-600 dark:text-amber-400 block">
                                  {item.actualTrainees} Registered
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                  Target: {item.plannedTrainees} Trainees
                                </span>
                              </div>
                            ) : item.status === 'awaiting_approval' ? (
                              <div className="space-y-0.5">
                                <span className="text-sm font-black text-orange-600 dark:text-orange-400 block">
                                  {item.actualTrainees} Attended
                                </span>
                                <span className="text-[10px] text-orange-700/80 dark:text-orange-400/80 font-bold block">
                                  Awaiting Sign-off ({item.plannedTrainees} Target)
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-sm font-black text-slate-600 dark:text-slate-300 block">
                                  0 / {item.plannedTrainees}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  Planned: {item.plannedTrainees} Trainees
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 6. Delivery Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {item.status === 'completed' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs whitespace-nowrap">
                                <CheckCircle2 size={13} />
                                <span>Completed</span>
                              </span>
                            )}
                            {item.status === 'in_progress' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs whitespace-nowrap">
                                <Clock size={13} className="animate-spin text-amber-600 dark:text-amber-400" />
                                <span>Active Now</span>
                              </span>
                            )}
                            {item.status === 'awaiting_approval' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-100 dark:bg-orange-900/40 text-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-800 shadow-2xs whitespace-nowrap" title="Session dates have ended. Awaiting administrator finalization.">
                                <AlertCircle size={13} className="text-orange-600 dark:text-orange-400" />
                                <span>Awaiting Approval</span>
                              </span>
                            )}
                            {item.status === 'scheduled' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs whitespace-nowrap">
                                <Calendar size={13} className="text-sky-500" />
                                <span>Scheduled</span>
                              </span>
                            )}
                            {item.status === 'pending' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs whitespace-nowrap">
                                <Calendar size={13} className="text-slate-400" />
                                <span>Planned</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* On-Demand & Unplanned Delivered Courses Section */}
            {unplannedExecutionItems.length > 0 && (
              <div className="p-4 sm:p-5 border-t-2 border-dashed border-slate-200 dark:border-slate-800 bg-amber-50/20 dark:bg-slate-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-700 dark:text-amber-400 shadow-2xs">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                        <span>On-Demand & Emergent Deliveries</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          Executed Outside Initial Plan
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {unplannedExecutionItems.length} programs ({unplannedDeliveredRounds} rounds) executed in {selectedYear} to address emergent operational needs.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
                    <span className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
                      +{unplannedDeliveredRounds} Extra Delivered Rounds
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                      {unplannedTraineesCount.toLocaleString()} Trainees Trained
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#002D62] text-white font-black uppercase text-[11px]">
                        <th className="py-3 px-4 min-w-[240px]">Course / Program Title</th>
                        <th className="py-3 px-3 min-w-[100px] text-center">Quarter</th>
                        <th className="py-3 px-3 min-w-[120px] text-center">Delivered Rounds</th>
                        <th className="py-3 px-3 min-w-[130px] text-center">Trainees Trained</th>
                        <th className="py-3 px-4 min-w-[150px] text-center">Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {unplannedExecutionItems.map(item => (
                        <tr key={item.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <span>{item.courseTitle}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Emergent
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-black">
                              {item.quarter}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                              {item.completedRounds} {item.completedRounds === 1 ? 'Round' : 'Rounds'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                            {item.traineesCount} Trainees
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <span>Operational Request</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5.5 TAB CONTENT: Wall Calendar — 12-Month Quarterly Schedule Poster */}
      {activeMainTab === 'wallCalendar' && (
        <div className="space-y-6">
          {/* Wall Calendar Outer Poster Canvas */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-[#002D62] dark:border-blue-900 shadow-xl overflow-hidden print:border-none print:shadow-none">
            
            {/* Poster Main Header Banner */}
            <div className="bg-[#002D62] text-white p-5 sm:p-6 border-b-2 border-blue-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FFC000]" />
                  <span className="text-xs font-black tracking-widest text-amber-300 uppercase">
                    Orascom Construction — Equipment Department (OED)
                  </span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-wide text-white uppercase drop-shadow-sm">
                  {selectedYear} Quarterly Schedule
                </h2>
                <p className="text-xs sm:text-sm text-blue-200 font-medium">
                  Official Master Operational Schedule & Session Delivery Matrix
                </p>
              </div>

              {/* Poster Header Action Controls */}
              <div className="flex items-center gap-2.5 print:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setHolidayModalInitialDate(undefined);
                    setIsHolidayModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 border border-purple-400 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Palmtree size={14} className="text-[#FFC000]" />
                  <span>Holidays & Vacations</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMainTab('annualResults')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 transition-all cursor-pointer backdrop-blur-xs"
                >
                  <Award size={14} className="text-[#FFC000]" />
                  <span>Annual Results Table</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-[#FFC000] hover:bg-amber-400 text-[#002D62] font-black text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Printer size={14} />
                  <span>Print Wall Poster</span>
                </button>
              </div>
            </div>

            {/* Poster Body: 12-Month Calendar Grid (Left 4 Columns) + Notes Panel (Right Column) */}
            <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                
                {/* 12-Month Quarterly Calendar Area (Spans 9 or 10 cols on xl) */}
                <div className="xl:col-span-9 2xl:col-span-10 space-y-6">
                  
                  {/* The 4 Quarters: Each Quarter contains a row of 3 months */}
                  {[1, 2, 3, 4].map(qNum => {
                    const quarterMonths = calendarMonthsData.filter(m => m.quarter === `Q${qNum}`);
                    const quarterTitles: Record<number, string> = {
                      1: '1st Quarter (Jan – Mar)',
                      2: '2nd Quarter (Apr – Jun)',
                      3: '3rd Quarter (Jul – Sep)',
                      4: '4th Quarter (Oct – Dec)'
                    };

                    return (
                      <div key={`quarter_${qNum}`} className="space-y-2">
                        {/* Quarter Header Strip */}
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#002D62] text-white rounded-xl shadow-2xs">
                          <span className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[11px] font-black">
                              Q{qNum}
                            </span>
                            <span>{quarterTitles[qNum]}</span>
                          </span>
                          <span className="text-[11px] text-blue-200 font-semibold">
                            {quarterMonths.reduce((acc, m) => acc + m.monthSessions.length, 0)} Sessions Assigned
                          </span>
                        </div>

                        {/* 3 Months Grid for this Quarter */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {quarterMonths.map(month => (
                            <div 
                              key={month.name} 
                              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col justify-between"
                            >
                              {/* Month Header Banner */}
                              <div className="bg-[#002D62] text-white py-2 px-3 flex items-center justify-between border-b border-blue-900">
                                <span className="font-serif font-black tracking-wider text-xs sm:text-sm uppercase text-white">
                                  {month.name}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-blue-100">
                                  {month.monthSessions.length} Sessions
                                </span>
                              </div>

                              {/* Days of Week Header */}
                              <div className="grid grid-cols-7 text-center bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 py-1 text-[10px] font-black text-slate-600 dark:text-slate-300">
                                <span className="text-rose-600 dark:text-rose-400">S</span>
                                <span>M</span>
                                <span>T</span>
                                <span>W</span>
                                <span>T</span>
                                <span className="text-amber-600 dark:text-amber-400">F</span>
                                <span className="text-amber-600 dark:text-amber-400">S</span>
                              </div>

                              {/* Calendar 7-Column Day Grid with Continuous Multi-Day Spanning Event Bars */}
                              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/50 text-[11px]">
                                {month.weekRows.map((wRow, wIdx) => (
                                  <div key={`w_${wIdx}`} className="relative">
                                    {/* 7 Day Slots */}
                                    <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800/50">
                                      {wRow.cells.map((day, dIdx) => {
                                        if (day.dayNumber === null) {
                                          return (
                                            <div 
                                              key={`empty_${wIdx}_${dIdx}`} 
                                              className="min-h-[72px] sm:min-h-[82px] bg-slate-50/40 dark:bg-slate-950/30 opacity-30" 
                                            />
                                          );
                                        }

                                        return (
                                          <div
                                            key={`day_${wIdx}_${day.dayNumber}`}
                                            onClick={() => {
                                              if (day.dateStr) {
                                                setHolidayModalInitialDate(day.dateStr);
                                                setIsHolidayModalOpen(true);
                                              }
                                            }}
                                            className={`min-h-[72px] sm:min-h-[82px] p-1 pb-7 flex flex-col justify-start transition-colors cursor-pointer relative ${
                                              day.hasPublicHoliday 
                                                ? 'bg-purple-50/90 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-300 dark:border-purple-800/70' 
                                                : day.hasPersonalVacation
                                                ? 'bg-rose-50/90 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-300 dark:border-rose-800/70'
                                                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                            }`}
                                            title={
                                              day.holidays && day.holidays.length > 0
                                                ? day.holidays.map((h: any) => `${h.type === 'public' ? 'Public Holiday' : 'Personal Vacation'}: ${h.title}`).join(' | ')
                                                : `Click to view or add vacation on ${day.dateStr}`
                                            }
                                          >
                                            <div className="flex items-center justify-between w-full">
                                              <span className={`text-[10px] font-bold ${
                                                day.hasPublicHoliday ? 'text-purple-800 dark:text-purple-300 font-black' :
                                                day.hasPersonalVacation ? 'text-rose-700 dark:text-rose-400 font-black' :
                                                'text-slate-500 dark:text-slate-400'
                                              }`}>
                                                {day.dayNumber}
                                              </span>
                                              {day.hasPublicHoliday && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400 shrink-0" title="Public Holiday" />
                                              )}
                                              {day.hasPersonalVacation && !day.hasPublicHoliday && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" title="Personal Vacation" />
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Continuous Multi-Day Spanning Holiday Bars Layer */}
                                    {wRow.holidayBars && wRow.holidayBars.length > 0 && (
                                      <div className="absolute left-0 right-0 top-[21px] px-0.5 pointer-events-auto space-y-0.5 z-15">
                                        {wRow.holidayBars.map((hBar, hIdx) => {
                                          const leftPct = (hBar.startCol / 7) * 100;
                                          const widthPct = (hBar.spanCols / 7) * 100;
                                          const isPublic = hBar.holiday.type === 'public';
                                          
                                          const barStyle = isPublic
                                            ? 'bg-purple-700 hover:bg-purple-800 text-white border border-purple-400/50 shadow-2xs'
                                            : 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-400/50 shadow-2xs';

                                          return (
                                            <div
                                              key={`hbar_${wIdx}_${hIdx}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setHolidayModalInitialDate(hBar.holiday.startDate);
                                                setIsHolidayModalOpen(true);
                                              }}
                                              style={{
                                                marginLeft: `${leftPct}%`,
                                                width: `calc(${widthPct}% - 2px)`
                                              }}
                                              className={`h-4.5 px-2 rounded-md flex items-center justify-center gap-1.5 text-[8px] sm:text-[8.5px] font-black cursor-pointer transition-all duration-150 transform hover:scale-[1.005] overflow-hidden ${barStyle}`}
                                              title={`${isPublic ? 'Official Public Holiday' : 'Personal Vacation'}: ${hBar.holiday.title} (${hBar.holiday.startDate} to ${hBar.holiday.endDate}) — Click to view details`}
                                            >
                                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPublic ? 'bg-[#FFC000]' : 'bg-white'}`} />
                                              <span className="truncate tracking-tight uppercase font-black text-center">
                                                {hBar.holiday.title}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Continuous Multi-Day Event Bars Layer */}
                                    {wRow.events.length > 0 && (
                                      <div className="absolute left-0 right-0 bottom-1 px-0.5 pointer-events-auto space-y-0.5 z-20">
                                        {wRow.events.slice(0, 2).map((ev, evIdx) => {
                                          const leftPct = (ev.startCol / 7) * 100;
                                          const widthPct = (ev.spanCols / 7) * 100;

                                          let barBg = 'bg-[#002D62] text-white hover:bg-blue-900 border-blue-950 shadow-xs';
                                          if (ev.session.status === 'completed') {
                                            barBg = 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-800 shadow-xs';
                                          } else if (ev.session.status === 'in_progress') {
                                            barBg = 'bg-amber-400 text-slate-950 hover:bg-amber-500 border-amber-600 shadow-xs font-black';
                                          } else if (ev.session.status === 'awaiting_approval') {
                                            barBg = 'bg-orange-500 text-white hover:bg-orange-600 border-orange-700 shadow-xs font-bold';
                                          } else if (ev.session.status === 'scheduled') {
                                            barBg = 'bg-sky-600 text-white hover:bg-sky-700 border-sky-800 shadow-xs font-medium';
                                          }

                                          return (
                                            <div
                                              key={`bar_${wIdx}_${evIdx}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCalendarSession(ev.session);
                                              }}
                                              style={{
                                                marginLeft: `${leftPct}%`,
                                                width: `calc(${widthPct}% - 2px)`
                                              }}
                                              className={`h-4.5 px-1.5 rounded flex items-center justify-between gap-1 text-[8.5px] font-black cursor-pointer border transition-all duration-150 transform hover:scale-[1.01] overflow-hidden ${barBg}`}
                                              title={`${ev.session.courseTitle} (${ev.session.status.replace('_', ' ')}) — Click for details`}
                                            >
                                              <span className="truncate tracking-tight uppercase">
                                                {ev.session.courseTitle}
                                              </span>
                                              <span className="text-[7.5px] opacity-90 shrink-0 font-bold">
                                                R{ev.session.roundIndex}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Month Bottom Legend / Course Summary */}
                              <div className="p-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 space-y-1">
                                {/* Official Holidays in this Month */}
                                {month.days.some((d: any) => d.hasPublicHoliday) && (
                                  <div className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800/60 text-[9px] font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5 shadow-2xs">
                                    <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                                    <span className="truncate">
                                      {Array.from(new Set(month.days.flatMap((d: any) => d.holidays?.filter((h: any) => h.type === 'public').map((h: any) => `${d.dayNumber} ${month.name.substring(0, 3)}: ${h.title}`) || []))).join(' • ')}
                                    </span>
                                  </div>
                                )}

                                {month.monthSessions.length === 0 ? (
                                  <span className="text-[10px] text-slate-400 italic block text-center py-0.5">
                                    No sessions scheduled
                                  </span>
                                ) : (
                                  month.monthSessions.slice(0, 2).map((ms, msIdx) => (
                                    <div 
                                      key={ms.id || msIdx}
                                      onClick={() => setSelectedCalendarSession(ms)}
                                      className="flex items-center justify-between gap-1 p-1 rounded bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:border-blue-400 transition-colors"
                                    >
                                      <span className="text-[10px] font-bold truncate text-slate-800 dark:text-slate-200 max-w-[150px]">
                                        {ms.courseTitle}
                                      </span>
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black shrink-0 ${
                                        ms.status === 'completed'
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                          : ms.status === 'in_progress'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                          : ms.status === 'awaiting_approval'
                                          ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/60 dark:text-orange-300'
                                          : ms.status === 'scheduled'
                                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300'
                                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                      }`}>
                                        {ms.status === 'completed' ? 'Done' : ms.status === 'in_progress' ? 'Active' : ms.status === 'awaiting_approval' ? 'Awaiting' : ms.status === 'scheduled' ? 'Sched' : 'Plan'}
                                      </span>
                                    </div>
                                  ))
                                )}
                                {month.monthSessions.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCalendarSession(month.monthSessions[2])}
                                    className="text-[9px] font-black text-[#002D62] dark:text-amber-300 hover:underline block text-center w-full"
                                  >
                                    + {month.monthSessions.length - 2} more sessions
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right-Hand Notes Column (Poster Replica) */}
                <div className="xl:col-span-3 2xl:col-span-2 space-y-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#002D62] dark:border-blue-900 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-5">
                    
                    {/* Notes Header with Lined Sheet Effect */}
                    <div>
                      <div className="bg-[#002D62] text-white p-2.5 rounded-xl text-center shadow-2xs">
                        <h3 className="font-serif font-black text-sm uppercase tracking-widest text-[#FFC000]">
                          Notes & Key Targets
                        </h3>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 text-center">
                        Executive Reference & Delivery Guidelines for {selectedYear}
                      </p>
                    </div>

                    {/* Color Code Legend Panel */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block border-b border-slate-200 dark:border-slate-700 pb-1">
                        🎨 Color Code Legend
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Completed Session
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                        Delivered with verified attendees.
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Active Now (In Progress)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                        Currently in session today.
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="w-3.5 h-3.5 rounded bg-orange-500 border border-orange-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Awaiting Approval
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                        Dates ended; awaiting admin sign-off.
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="w-3.5 h-3.5 rounded bg-sky-600 border border-sky-700 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Scheduled Session
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                        Assigned on upcoming calendar dates.
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="w-3.5 h-3.5 rounded bg-[#002D62] border border-blue-900 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Planned Course Target
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                        Targeted in annual operational plan.
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="w-3.5 h-3.5 rounded bg-purple-600 border border-purple-700 shrink-0" />
                        <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                          Official Public Holiday
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                        National or religious statutory holiday.
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="w-3.5 h-3.5 rounded bg-rose-500 border border-rose-600 shrink-0" />
                        <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                          Personal Vacation
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                        Approved annual, casual, or personal leave.
                      </p>
                    </div>



                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Quick Session Detail Modal / Popover on Calendar Day Click */}
          <AnimatePresence>
            {selectedCalendarSession && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#002D62] dark:border-blue-900 shadow-2xl p-6 max-w-lg w-full space-y-4"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black ${
                        selectedCalendarSession.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                          : selectedCalendarSession.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                          : selectedCalendarSession.status === 'awaiting_approval'
                          ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-300'
                          : selectedCalendarSession.status === 'scheduled'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {selectedCalendarSession.status === 'completed'
                          ? '🟢 Completed'
                          : selectedCalendarSession.status === 'in_progress'
                          ? '🟡 Active Now'
                          : selectedCalendarSession.status === 'awaiting_approval'
                          ? '🟠 Awaiting Approval (Ended)'
                          : selectedCalendarSession.status === 'scheduled'
                          ? '🔵 Scheduled'
                          : '⚪ Planned'}
                      </span>
                      <h3 className="text-lg font-black text-[#002D62] dark:text-white">
                        {selectedCalendarSession.courseTitle}
                      </h3>
                      {selectedCalendarSession.courseTitleEn && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedCalendarSession.courseTitleEn}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCalendarSession(null)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 font-bold block">Round Execution</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5 block">
                        Round {selectedCalendarSession.roundIndex} of {selectedCalendarSession.totalPlannedRounds}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 font-bold block">Scheduled Quarter</span>
                      <span className="text-sm font-black text-[#002D62] dark:text-amber-300 mt-0.5 block">
                        {selectedCalendarSession.quarter}
                      </span>
                    </div>

                    <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block">Timing & Dates</span>
                      <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Calendar size={13} className="text-[#002D62] dark:text-amber-400" />
                        <span>{selectedCalendarSession.actualDateRange || selectedCalendarSession.plannedTimingNote || 'Not specified'}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 font-bold block">Target Audience</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block capitalize">
                        {selectedCalendarSession.targetAudience?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 font-bold block">Trainees (Actual / Target)</span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                        {selectedCalendarSession.actualTrainees} / {selectedCalendarSession.plannedTrainees} Trainees
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCalendarSession(null)}
                      className="px-5 py-2 rounded-xl bg-[#002D62] hover:bg-blue-950 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* 6. TAB CONTENT 3: Progress & Achievements Tracker */}
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
                    <th className="py-3 px-4">Course / Program Title</th>
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
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                            <span>{t.courseTitle}</span>
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

      {/* Modal 1B: Edit Year Plan Details */}
      <AnimatePresence>
        {isEditYearModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="text-[#002D62] dark:text-amber-400" size={18} />
                  <span>Edit Annual Plan ({selectedYear})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditYearModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditYearPlan} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Plan Title
                  </label>
                  <input
                    type="text"
                    value={editYearTitle}
                    onChange={(e) => setEditYearTitle(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D62]"
                    placeholder={`Annual Training Plan ${selectedYear}`}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Operational Status
                  </label>
                  <select
                    value={editYearStatus}
                    onChange={(e) => setEditYearStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="active">Active (Official Operational Schedule)</option>
                    <option value="draft">Draft (Under Review / Planning Phase)</option>
                    <option value="archived">Archived (Closed Historical Records)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Executive Notes / Department Comments (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={editYearNotes}
                    onChange={(e) => setEditYearNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-white outline-none resize-none"
                    placeholder="Enter operational goals, priorities, or management notes for this year..."
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditYearModalOpen(false);
                      handleDeleteActiveYearPlan();
                    }}
                    className="text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:underline"
                  >
                    <Trash2 size={14} />
                    <span>Delete Plan</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditYearModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#002D62] text-white hover:bg-blue-950 dark:bg-blue-800 dark:hover:bg-blue-700 font-bold shadow-xs cursor-pointer active:scale-95"
                    >
                      Save Changes
                    </button>
                  </div>
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

                {/* Target Quarter & Duration */}
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
                </div>

                {/* Venue / Training Notes */}
                <div>
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

      {/* Auto-Generate Annual Plans from Historical Records Modal */}
      <AnimatePresence>
        {isAutoGenerateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-[#002D62] text-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFC000] text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Wand2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                      <span>Auto-Generate Plans from Historical Records</span>
                    </h2>
                    <p className="text-xs text-blue-200">
                      Reconstruct comprehensive annual plans from verified training attendance logs
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAutoGenerateModalOpen(false)}
                  className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
                  <Sparkles size={18} className="text-[#002D62] dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Detected {historicalYearsSummary.length} Distinct Training Years in Database
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      The automated engine calculates course targets, estimated delivery rounds, realistic trainee batch capacity, and quarter scheduling based on historical execution patterns.
                    </p>
                  </div>
                </div>

                {/* Years Selection List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                    <span>Select Years to Generate:</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedYearsToAutoGenerate(historicalYearsSummary.map(y => y.year))}
                        className="text-[#002D62] dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedYearsToAutoGenerate([])}
                        className="hover:underline cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {historicalYearsSummary.map(y => {
                      const isSelected = selectedYearsToAutoGenerate.includes(y.year);
                      return (
                        <div
                          key={y.year}
                          onClick={() => {
                            setSelectedYearsToAutoGenerate(prev =>
                              prev.includes(y.year) ? prev.filter(item => item !== y.year) : [...prev, y.year]
                            );
                            if (y.canUpdateWithMore) {
                              setAutoGenerateOverwriteExisting(true);
                            }
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-2xs'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-[#002D62] accent-[#002D62] cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                  {y.year}
                                </span>
                                {y.alreadyExists && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                    Plan Exists ({y.currentPlanTargetsCount} Courses)
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {y.distinctCourses} Programs in DB • {y.totalTrainees} Trainees • ~{y.estimatedRounds} Rounds
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                              y.canUpdateWithMore
                                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                : y.alreadyExists
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {y.canUpdateWithMore ? `Update Ready (${y.distinctCourses} vs ${y.currentPlanTargetsCount})` : y.alreadyExists ? 'Complete' : 'Ready to Create'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAutoGeneratePlans([y.year], true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#002D62] hover:bg-blue-950 text-amber-300 text-[11px] font-bold cursor-pointer transition-all shadow-2xs hover:scale-105"
                              title={`Populate all ${y.distinctCourses} courses for ${y.year}`}
                            >
                              ⚡ Auto-Fill
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overwrite Toggle */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoGenerateOverwriteExisting}
                      onChange={(e) => setAutoGenerateOverwriteExisting(e.target.checked)}
                      className="w-4 h-4 rounded text-[#002D62] accent-[#002D62] cursor-pointer"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Overwrite existing plans if they already contain course targets
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 ml-6 mt-0.5">
                    If unchecked, years that already have configured plans will be preserved.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAutoGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={selectedYearsToAutoGenerate.length === 0 || isGeneratingPlans}
                  onClick={handleAutoGeneratePlans}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                    selectedYearsToAutoGenerate.length === 0 || isGeneratingPlans
                      ? 'opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500'
                      : 'bg-[#002D62] hover:bg-blue-950 dark:bg-blue-800 dark:hover:bg-blue-700 text-white active:scale-95'
                  }`}
                >
                  {isGeneratingPlans ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-[#FFC000]" />
                      <span>Generating Plans...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={15} className="text-[#FFC000]" />
                      <span>Generate Plans ({selectedYearsToAutoGenerate.length} Selected)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Holidays & Vacations Management Modal */}
      {isHolidayModalOpen && (
        <HolidaysAndVacationsModal
          isOpen={isHolidayModalOpen}
          onClose={() => {
            setIsHolidayModalOpen(false);
            setHolidayModalInitialDate(undefined);
          }}
          selectedYear={selectedYear}
          initialDate={holidayModalInitialDate}
        />
      )}
    </div>
  );
};
