import React, { useState, useMemo, useEffect } from 'react';
import { UploadCloud, XCircle, Calendar, Users, HardHat, Wrench, Settings, RefreshCw, Printer, Download } from 'lucide-react';
import { formatScore, formatDateToStandard } from '../utils/formatters';
import { safePrintReport, downloadReportPDF } from '../utils/printUtils';
import { DataField } from './DataField';
import { useAppContext } from '../context';
import { CleanedRecord } from '../types';

declare const XLSX: any;

export const AnalyticsDashboardTab = () => {
  const { language, cleanedData, setCleanedData, cleanedFileName, setCleanedFileName } = useAppContext();
  
  const [courseFilter, setCourseFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCleanedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const ab = evt.target?.result;
        const wb = XLSX.read(ab, { type: 'array', cellDates: true });
        
        const sheetName = "Cleaned Data";
        if (!wb.SheetNames.includes(sheetName)) {
          alert(language === 'ar' ? 'لم يتم العثور على ورقة عمل باسم "Cleaned Data"' : 'Sheet "Cleaned Data" not found in the uploaded file.');
          return;
        }

        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];

        const parsedData: CleanedRecord[] = rows.map((row, idx) => {
            const getVal = (possibleKeys: string[]) => {
                const key = Object.keys(row).find(k => possibleKeys.some(pk => k.toLowerCase().includes(pk.toLowerCase())));
                return key ? row[key]?.toString().trim() || '' : '';
            };

            let formattedDate = getVal(['Date', 'Attendance']);
            if (formattedDate && !isNaN(Date.parse(formattedDate))) {
                formattedDate = new Date(formattedDate).toISOString().split('T')[0];
            }
            
            let rawScore = getVal(['Score', 'Result', 'Grade']);
            if (rawScore && !isNaN(Number(rawScore)) && Number(rawScore) <= 1 && Number(rawScore) > 0) {
                rawScore = `${Math.round(Number(rawScore) * 100)}%`;
            } else if (rawScore && !isNaN(Number(rawScore)) && Number(rawScore) > 1 && !rawScore.includes('%')) {
                rawScore = `${rawScore}%`;
            }

            return {
                id: `record_${idx}`,
                courseName: getVal(['Course Name', 'Course', 'Training']),
                department: getVal(['Department', 'Dept']),
                role: getVal(['Role', 'Job Title', 'Job Role', 'Position']),
                date: formattedDate,
                hrCode: getVal(['HR Code', 'ID', 'Code', 'HR_Code']),
                name: getVal(['Trainee Name', 'Name', 'Trainee', 'Employee']),
                score: rawScore || 'N/A',
                duration: getVal(['Course Duration', 'Duration', 'Time', 'Hours']),
                attendedDays: getVal(['Attended Days', 'Attended', 'Days']),
                raw: row
            };
        });

        setCleanedData(parsedData);
      } catch (err) {
        console.error(err);
        alert(language === 'ar' ? 'فشل في قراءة الملف.' : 'Failed to parse file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredData = useMemo(() => {
    return cleanedData.filter(r => {
      if (courseFilter && r.courseName !== courseFilter) return false;
      if (deptFilter && r.department !== deptFilter) return false;
      if (roleFilter && r.role !== roleFilter) return false;

      if (fromDateFilter || toDateFilter) {
        const recordDateStr = r.date || r.raw?.['Date'] || r.raw?.['Attendance Date'];
        if (!recordDateStr) return false;
        const recordDate = new Date(recordDateStr).getTime();
        if (isNaN(recordDate)) return false;
        
        if (fromDateFilter) {
          const fromDate = new Date(fromDateFilter).getTime();
          if (recordDate < fromDate) return false;
        }
        if (toDateFilter) {
          const toDate = new Date(toDateFilter);
          toDate.setHours(23, 59, 59, 999);
          if (recordDate > toDate.getTime()) return false;
        }
      }

      return true;
    });
  }, [cleanedData, courseFilter, deptFilter, roleFilter, fromDateFilter, toDateFilter]);

  const uniqueCourses = useMemo(() => Array.from(new Set(cleanedData.map(d => d.courseName).filter(Boolean))).sort(), [cleanedData]);
  const uniqueDepts = useMemo(() => Array.from(new Set(cleanedData.map(d => d.department).filter(Boolean))).sort(), [cleanedData]);
  const uniqueRoles = useMemo(() => Array.from(new Set(cleanedData.map(d => d.role).filter(Boolean))).sort(), [cleanedData]);

  const kpis = useMemo(() => {
    const courseSet = new Set<string>();
    const sessionSet = new Set<string>();
    let engineersCount = 0;
    let techniciansCount = 0;
    let operatorsCount = 0;

    filteredData.forEach(r => {
      if (r.courseName) courseSet.add(r.courseName);
      if (r.courseName || r.date) sessionSet.add(`${r.courseName}-${r.date}`);
      
      const rLower = r.role.toLowerCase();
      if (rLower.includes('eng') || rLower.includes('مهندس')) engineersCount++;
      if (rLower.includes('tech') || rLower.includes('فني')) techniciansCount++;
      if (rLower.includes('op') || rLower.includes('مشغل')) operatorsCount++;
    });

    return {
      totalCourses: courseSet.size,
      totalSessions: sessionSet.size,
      totalParticipants: filteredData.length, // Corrected logic: count the number of rows/records directly
      totalEngineers: engineersCount,
      totalTechnicians: techniciansCount,
      totalOperators: operatorsCount
    };
  }, [filteredData]);

  const clearFilters = () => {
    setCourseFilter('');
    setDeptFilter('');
    setRoleFilter('');
    setFromDateFilter('');
    setToDateFilter('');
  };

  const getAnalyticsReportOptions = () => ({
    title: language === 'ar' ? 'تقرير تحليلات التدريب الفني' : 'Technical Training Analytics Report',
    language: (language === 'ar' ? 'ar' : 'en') as 'ar' | 'en',
    records: filteredData,
    fileName: 'OED_Analytics_Training_Report.pdf',
  });

  const handlePrint = () => {
    safePrintReport(getAnalyticsReportOptions());
  };

  const handleDownloadPDF = async () => {
    await downloadReportPDF(getAnalyticsReportOptions());
  };

  const clearData = () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من مسح البيانات المحملة؟' : 'Are you sure you want to clear the loaded data?')) {
      setCleanedData([]);
      setCleanedFileName('');
      clearFilters();
      // Remove from localStorage directly as a fallback
      localStorage.removeItem('oed_training_data');
      localStorage.removeItem('oed_training_filename');
    }
  };

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  return (
    <div className="space-y-6">
      {/* Dynamic KPI Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 print:hidden">
        <div className="bg-white dark:bg-[#193158] p-5 rounded-xl border border-gray-200 dark:border-white/[0.12] shadow-sm flex flex-col items-center justify-center text-center">
          <Calendar className="text-[#FFC000] mb-2" size={28} />
          <span className="text-xs text-gray-500 dark:text-[#9BB8DF] font-semibold mb-1 uppercase tracking-wider">{t('إجمالي انعقاد الدورات', 'Total Sessions')}</span>
          <span className="text-2xl font-bold text-[#002D62] dark:text-[#FFFFFF]">{kpis.totalSessions}</span>
        </div>
        <div className="bg-white dark:bg-[#193158] p-5 rounded-xl border border-gray-200 dark:border-white/[0.12] shadow-sm flex flex-col items-center justify-center text-center">
          <Users className="text-green-600 dark:text-green-400 mb-2" size={28} />
          <span className="text-xs text-gray-500 dark:text-[#9BB8DF] font-semibold mb-1 uppercase tracking-wider">{t('إجمالي المتدربين', 'Total Participants')}</span>
          <span className="text-2xl font-bold text-[#002D62] dark:text-[#FFFFFF]">{kpis.totalParticipants}</span>
        </div>
        <div className="bg-white dark:bg-[#193158] p-5 rounded-xl border border-gray-200 dark:border-white/[0.12] shadow-sm flex flex-col items-center justify-center text-center">
          <HardHat className="text-blue-500 dark:text-blue-400 mb-2" size={28} />
          <span className="text-xs text-gray-500 dark:text-[#9BB8DF] font-semibold mb-1 uppercase tracking-wider">{t('إجمالي المهندسين', 'Total Engineers')}</span>
          <span className="text-2xl font-bold text-[#002D62] dark:text-[#FFFFFF]">{kpis.totalEngineers}</span>
        </div>
        <div className="bg-white dark:bg-[#193158] p-5 rounded-xl border border-gray-200 dark:border-white/[0.12] shadow-sm flex flex-col items-center justify-center text-center">
          <Wrench className="text-amber-500 dark:text-amber-400 mb-2" size={28} />
          <span className="text-xs text-gray-500 dark:text-[#9BB8DF] font-semibold mb-1 uppercase tracking-wider">{t('إجمالي الفنيين', 'Total Technicians')}</span>
          <span className="text-2xl font-bold text-[#002D62] dark:text-[#FFFFFF]">{kpis.totalTechnicians}</span>
        </div>
        <div className="bg-white dark:bg-[#193158] p-5 rounded-xl border border-gray-200 dark:border-white/[0.12] shadow-sm flex flex-col items-center justify-center text-center">
          <Settings className="text-gray-500 dark:text-gray-400 mb-2" size={28} />
          <span className="text-xs text-gray-500 dark:text-[#9BB8DF] font-semibold mb-1 uppercase tracking-wider">{t('إجمالي المشغلين', 'Total Operators')}</span>
          <span className="text-2xl font-bold text-[#002D62] dark:text-[#FFFFFF]">{kpis.totalOperators}</span>
        </div>
      </div>

          {/* Dynamic KPI Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 print:hidden">
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <Calendar className="text-[#FFC000] mb-2" size={28} />
              <span className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">{t('إجمالي انعقاد الدورات', 'Total Sessions')}</span>
              <span className="text-2xl font-bold text-[#002D62]">{kpis.totalSessions}</span>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <Users className="text-green-600 mb-2" size={28} />
              <span className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">{t('إجمالي المتدربين', 'Total Participants')}</span>
              <span className="text-2xl font-bold text-[#002D62]">{kpis.totalParticipants}</span>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <HardHat className="text-blue-500 mb-2" size={28} />
              <span className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">{t('إجمالي المهندسين', 'Total Engineers')}</span>
              <span className="text-2xl font-bold text-[#002D62]">{kpis.totalEngineers}</span>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <Wrench className="text-purple-500 mb-2" size={28} />
              <span className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">{t('إجمالي الفنيين', 'Total Technicians')}</span>
              <span className="text-2xl font-bold text-[#002D62]">{kpis.totalTechnicians}</span>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <Settings className="text-gray-500 mb-2" size={28} />
              <span className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">{t('إجمالي المشغلين', 'Total Operators')}</span>
              <span className="text-2xl font-bold text-[#002D62]">{kpis.totalOperators}</span>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-[#13223F] rounded-xl shadow-sm border border-gray-200 dark:border-white/[0.12] overflow-hidden print:hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0E1A32] flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('البيانات', 'Filtered Data')}</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#002D62] dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-700/50">
                  {filteredData.length} {t('سجل', 'records')}
                </span>
                <button 
                  onClick={handlePrint} 
                  className="bg-[#002D62] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow hover:bg-blue-900 transition-colors text-sm font-medium"
                >
                  <Printer size={16} />
                  {language === 'ar' ? 'طباعة التقرير' : 'Print Report'}
                </button>
                <button 
                  onClick={handleDownloadPDF} 
                  className="bg-emerald-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow hover:bg-emerald-800 transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  {language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-gray-100 dark:bg-[#0A1324] shadow-sm z-10">
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                    <th className="p-3 font-semibold">{t('الرقم الوظيفي', 'HR Code')}</th>
                    <th className="p-3 font-semibold">{t('الاسم', 'Name')}</th>
                    <th className="p-3 font-semibold">{t('المسمى الوظيفي', 'Role')}</th>
                    <th className="p-3 font-semibold">{t('القسم', 'Department')}</th>
                    <th className="p-3 font-semibold">{t('اسم الدورة', 'Course Name')}</th>
                    <th className="p-3 font-semibold">{t('مدة الدورة', 'Duration')}</th>
                    <th className="p-3 font-semibold">{t('أيام الحضور', 'Attended Days')}</th>
                    <th className="p-3 font-semibold">{t('النتيجة', 'Score')}</th>
                    <th className="p-3 font-semibold">{t('تاريخ الحضور', 'Date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(r => {
                    return (
                      <tr key={r.id} className="border-b dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                        <td className="p-3 font-medium text-gray-800 dark:text-gray-100"><DataField>{r.hrCode}</DataField></td>
                        <td className="p-3 font-medium text-[#002D62] dark:text-[#70B2FF]"><DataField>{r.name}</DataField></td>
                        <td className="p-3 text-gray-600 dark:text-gray-300"><DataField>{r.role}</DataField></td>
                        <td className="p-3 text-gray-600 dark:text-gray-300"><DataField>{r.department}</DataField></td>
                        <td className="p-3 text-gray-800 dark:text-gray-100"><DataField>{r.courseName}</DataField></td>
                        <td className="p-3 text-gray-600 dark:text-gray-300"><DataField>{r.duration}</DataField></td>
                        <td className="p-3 text-gray-600 dark:text-gray-300"><DataField>{r.attendedDays}</DataField></td>
                        <td className="p-3 font-bold text-gray-800 dark:text-gray-100"><DataField>{formatScore(r.score)}</DataField></td>
                        <td className="p-3 text-gray-600 dark:text-gray-300"><DataField>{formatDateToStandard(r.date)}</DataField></td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                        {t('لا توجد بيانات مطابقة للبحث.', 'No data matches the current filters.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Print View Layout */}
          <div className="hidden print:block text-black bg-white">
            {/* Header */}
            <div className="flex justify-between items-end border-b-2 border-[#002D62] pb-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-100 border-2 border-gray-300 flex items-center justify-center text-xs text-gray-500 font-bold uppercase text-center rounded-lg">
                  OED<br/>Logo
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-[#002D62] mb-1">OED - Technical Training Department</h2>
                <p className="text-gray-600 text-sm">{language === 'ar' ? 'إدارة المعدات' : 'Equipment Department'}</p>
              </div>
            </div>

            {/* Title & Summary */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-center uppercase tracking-wider mb-2 text-gray-800">
                {language === 'ar' ? 'تقرير التدريب الفني' : 'Technical Training Report'}
              </h1>
              <p className="text-center text-sm text-gray-500 mb-8">
                {language === 'ar' ? 'تم الإنشاء في:' : 'Generated on:'} {formatDateToStandard(new Date())}
              </p>
            </div>

            {/* Table */}
            <table className="w-full text-left border-collapse text-sm print:table mb-12">
              <thead className="print:table-header-group">
                <tr className="border-b-2 border-gray-800 bg-gray-100 text-gray-800">
                  <th className="p-3 font-bold">{t('الرقم الوظيفي', 'HR Code')}</th>
                  <th className="p-3 font-bold">{t('الاسم', 'Name')}</th>
                  <th className="p-3 font-bold">{t('القسم', 'Department')}</th>
                  <th className="p-3 font-bold">{t('اسم الدورة', 'Course Name')}</th>
                  <th className="p-3 font-bold">{t('مدة الدورة', 'Duration')}</th>
                  <th className="p-3 font-bold">{t('أيام الحضور', 'Attended Days')}</th>
                  <th className="p-3 font-bold">{t('النتيجة', 'Score')}</th>
                  <th className="p-3 font-bold">{t('تاريخ الحضور', 'Date')}</th>
                </tr>
              </thead>
              <tbody className="print:table-row-group">
                {filteredData.map((r, idx) => (
                  <tr key={r.id} className="border-b border-gray-300 break-inside-avoid">
                    <td className="p-3 font-medium text-gray-900">{r.hrCode}</td>
                    <td className="p-3 font-medium text-gray-900">{r.name}</td>
                    <td className="p-3 text-gray-700">{r.department}</td>
                    <td className="p-3 text-gray-900">{r.courseName}</td>
                    <td className="p-3 text-gray-700">{r.raw?.['Course Duration'] || r.duration || 'N/A'}</td>
                    <td className="p-3 text-gray-700">{r.raw?.['Attended Days'] || r.attendedDays}</td>
                    <td className="p-3 font-bold text-gray-900">{formatScore(r.raw?.['Score'] || r.score)}</td>
                    <td className="p-3 text-gray-700">{formatDateToStandard(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-16 pt-4 border-t-2 border-gray-300 flex justify-between items-end print:fixed print:bottom-0 print:left-0 print:w-full bg-white print:pb-8">
              <div>
                <p className="font-bold text-gray-800 mb-8">{language === 'ar' ? 'اعتماد مدير التدريب الفني' : 'Authorized by Technical Training Manager'}</p>
                <p className="text-[#002D62] font-medium text-lg">Nader Kamel</p>
              </div>
              <div className="text-right text-gray-400 text-xs">
                OED Training Management System
              </div>
            </div>
          </div>
    </div>
  );
};
