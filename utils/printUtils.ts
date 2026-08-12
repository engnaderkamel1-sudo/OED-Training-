import html2pdf from 'html2pdf.js';
import { formatScore, formatDateToStandard } from './formatters';

export interface ReportRecord {
  id?: string;
  hrCode?: string;
  name?: string;
  role?: string;
  department?: string;
  courseName?: string;
  courseId?: string;
  duration?: string | number;
  daysAttended?: string | number;
  attendedDays?: string | number;
  score?: string | number;
  date?: string;
  attendanceDate?: string;
  totalDays?: string | number;
  raw?: any;
}

export interface SingleTraineeInfo {
  name: string;
  hrCode: string;
  department: string;
}

export interface ReportOptions {
  title: string;
  subtitle?: string;
  language: 'ar' | 'en';
  records: ReportRecord[];
  singleTrainee?: SingleTraineeInfo | null;
  columns?: Array<{ key: string; labelAr: string; labelEn: string }>;
  fileName?: string;
}

export const generateReportHTML = (options: ReportOptions): string => {
  const { title, language, records, singleTrainee } = options;
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const currentDate = formatDateToStandard(new Date());

  const defaultCols = [
    { key: 'hrCode', labelAr: 'الرقم الوظيفي', labelEn: 'HR Code' },
    { key: 'name', labelAr: 'الاسم', labelEn: 'Name' },
    { key: 'role', labelAr: 'المسمى الوظيفي', labelEn: 'Role' },
    { key: 'department', labelAr: 'القسم', labelEn: 'Department' },
    { key: 'courseName', labelAr: 'اسم الدورة', labelEn: 'Course Name' },
    { key: 'duration', labelAr: 'مدة الدورة', labelEn: 'Duration' },
    { key: 'attendedDays', labelAr: 'أيام الحضور', labelEn: 'Attended Days' },
    { key: 'score', labelAr: 'النتيجة', labelEn: 'Score' },
    { key: 'date', labelAr: 'تاريخ الحضور', labelEn: 'Date' },
  ];

  const cols = options.columns || (singleTrainee 
    ? defaultCols.filter(c => !['hrCode', 'name', 'department'].includes(c.key))
    : defaultCols);

  const getRecordValue = (r: ReportRecord, key: string) => {
    switch (key) {
      case 'hrCode':
        return r.hrCode || r.raw?.['HR Code'] || r.raw?.['ID'] || '';
      case 'name':
        return r.name || r.raw?.['Trainee Name'] || r.raw?.['Name'] || '';
      case 'role':
        return r.role || r.raw?.['Role'] || r.raw?.['Job Title'] || '';
      case 'department':
        return r.department || r.raw?.['Department'] || '';
      case 'courseName':
        return r.courseName || r.raw?.['Course Name'] || r.raw?.['Course'] || '';
      case 'duration':
        return r.raw?.['Course Duration'] || r.duration || r.totalDays || 'N/A';
      case 'attendedDays':
        return r.raw?.['Attended Days'] || r.attendedDays || r.daysAttended || 'N/A';
      case 'score':
        return formatScore(r.raw?.['Score'] || r.score);
      case 'date':
        return formatDateToStandard(r.date || r.attendanceDate || r.raw?.['Date'] || r.raw?.['Attendance Date']);
      default:
        return '';
    }
  };

  const rowsHTML = records.map(r => `
    <tr>
      ${cols.map(c => `<td>${getRecordValue(r, c.key)}</td>`).join('')}
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #1a202c;
      background: #ffffff;
      direction: ${dir};
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 3px solid #002D62;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .logo-box {
      width: 70px;
      height: 70px;
      background-color: #f3f4f6;
      border: 2px solid #d1d5db;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 11px;
      color: #6b7280;
      text-align: center;
      line-height: 1.2;
    }
    .dept-title {
      text-align: ${isAr ? 'left' : 'right'};
    }
    .dept-title h2 {
      margin: 0;
      font-size: 20px;
      color: #002D62;
      font-weight: 800;
    }
    .dept-title p {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #4b5563;
    }
    .doc-title {
      text-align: center;
      font-size: 22px;
      font-weight: 800;
      color: #1f2937;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-date {
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 20px;
    }
    .trainee-card {
      background-color: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: space-between;
    }
    .trainee-field {
      flex: 1;
      min-width: 150px;
    }
    .trainee-field label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .trainee-field span {
      font-size: 15px;
      font-weight: 700;
      color: #002D62;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 12px;
    }
    th {
      background-color: #f3f4f6;
      color: #111827;
      font-weight: 700;
      text-align: ${isAr ? 'right' : 'left'};
      padding: 10px;
      border-bottom: 2px solid #111827;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      text-align: ${isAr ? 'right' : 'left'};
      color: #1f2937;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 2px solid #d1d5db;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-auth p {
      margin: 0;
    }
    .footer-auth .auth-title {
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .footer-auth .auth-name {
      color: #002D62;
      font-weight: bold;
      font-size: 16px;
    }
    .footer-sys {
      font-size: 11px;
      color: #9ca3af;
      text-align: ${isAr ? 'left' : 'right'};
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box">
      OED<br/>Logo
    </div>
    <div class="dept-title">
      <h2>OED - Technical Training Department</h2>
      <p>${isAr ? 'إدارة المعدات' : 'Equipment Department'}</p>
    </div>
  </div>

  <div class="doc-title">${title}</div>
  <div class="doc-date">${isAr ? 'تم الإنشاء في:' : 'Generated on:'} ${currentDate}</div>

  ${singleTrainee ? `
    <div class="trainee-card">
      <div class="trainee-field">
        <label>${isAr ? 'الاسم' : 'Name'}</label>
        <span>${singleTrainee.name}</span>
      </div>
      <div class="trainee-field">
        <label>${isAr ? 'الرقم الوظيفي' : 'HR Code'}</label>
        <span style="color: #1f2937">${singleTrainee.hrCode}</span>
      </div>
      <div class="trainee-field">
        <label>${isAr ? 'القسم' : 'Department'}</label>
        <span style="color: #1f2937; font-weight: 500">${singleTrainee.department}</span>
      </div>
    </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        ${cols.map(c => `<th>${isAr ? c.labelAr : c.labelEn}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>

  <div class="footer">
    <div class="footer-auth">
      <p class="auth-title">${isAr ? 'اعتماد مدير التدريب الفني' : 'Authorized by Technical Training Manager'}</p>
      <p class="auth-name">Nader Kamel</p>
    </div>
    <div class="footer-sys">
      OED Training Management System
    </div>
  </div>
</body>
</html>`;
};

/**
 * Mobile & iFrame safe print handler
 */
export const safePrintReport = (options: ReportOptions) => {
  const htmlContent = generateReportHTML(options);

  try {
    // Attempt 1: Try opening a clean window / tab (best for popup or iframe break out)
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to render, then print
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          console.warn('Window print failed:', e);
          fallbackIframePrint(htmlContent);
        }
      }, 300);
      return;
    }
  } catch (err) {
    console.warn('window.open blocked:', err);
  }

  // Attempt 2: Fallback to hidden iframe in the current document
  fallbackIframePrint(htmlContent);
};

const fallbackIframePrint = (htmlContent: string) => {
  try {
    let iframe = document.getElementById('print-sandbox-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-sandbox-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Iframe print failed:', e);
          alert(
            'Printing was blocked by your browser or iFrame security settings.\n\nPlease use the "Download PDF" button to save the report directly, or open the app in a new browser tab.'
          );
        }
      }, 300);
    } else {
      throw new Error('Iframe document inaccessible');
    }
  } catch (err) {
    console.error('Print error:', err);
    alert(
      'Printing was blocked by your browser.\n\nPlease use the "Download PDF" button to save the report directly, or open the app in a new tab.'
    );
  }
};

/**
 * Mobile-friendly HTML to PDF Download
 */
export const downloadReportPDF = async (options: ReportOptions) => {
  const htmlContent = generateReportHTML(options);
  const fileName = options.fileName || (options.language === 'ar' ? 'تقرير_التدريب.pdf' : 'Training_Report.pdf');

  // Create temporary container element off-screen
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm'; // A4 width
  container.style.background = '#ffffff';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const opt = {
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        windowWidth: 1024 
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    // Trigger PDF download via html2pdf.js
    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error('PDF export error:', err);
    // Fallback Blob HTML download if html2pdf fails on mobile
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace('.pdf', '.html');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert('The PDF generator encountered an issue. An HTML report file has been downloaded instead.');
    } catch (e) {
      alert('Failed to generate report download. Please open the application in a full browser tab.');
    }
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};
