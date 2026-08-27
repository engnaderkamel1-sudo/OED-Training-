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
  jobRole?: string;
  profileImageUrl?: string;
  totalCourses?: number;
  totalSessions?: number;
  attendedDays?: number;
  avgScore?: number | null;
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
    { key: 'hrCode', labelAr: 'Ø§Ù„Ø±Ù‚Ù… Ø§Ù„ÙˆØ¸ÙŠÙÙŠ', labelEn: 'HR Code' },
    { key: 'name', labelAr: 'Ø§Ù„Ø§Ø³Ù…', labelEn: 'Name' },
    { key: 'role', labelAr: 'Ø§Ù„Ù…Ø³Ù…Ù‰ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ', labelEn: 'Role' },
    { key: 'department', labelAr: 'Ø§Ù„Ù‚Ø³Ù…', labelEn: 'Department' },
    { key: 'courseName', labelAr: 'Ø§Ø³Ù… Ø§Ù„Ø¯ÙˆØ±Ø©', labelEn: 'Course Name' },
    { key: 'duration', labelAr: 'Ù…Ø¯Ø© Ø§Ù„Ø¯ÙˆØ±Ø©', labelEn: 'Duration' },
    { key: 'attendedDays', labelAr: 'Ø£ÙŠØ§Ù… Ø§Ù„Ø­Ø¶ÙˆØ±', labelEn: 'Attended Days' },
    { key: 'score', labelAr: 'Ø§Ù„Ù†ØªÙŠØ¬Ø©', labelEn: 'Score' },
    { key: 'date', labelAr: 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø­Ø¶ÙˆØ±', labelEn: 'Date' },
  ];

  const cols = options.columns || (singleTrainee 
    ? defaultCols.filter(c => !['hrCode', 'name', 'department', 'role'].includes(c.key))
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
    <div class="logo-box" style="border: none; background: transparent; padding: 0; width: auto; height: auto; display: flex; align-items: center;">
      <img src="/orascom-logo.png" style="height: 48px; max-height: 48px; width: auto; object-fit: contain; display: block;" alt="Orascom Construction Equipment Department OED" />
    </div>
    <div class="dept-title">
      <h2>OED - Technical Training Department</h2>
      <p>${isAr ? 'إدارة المعدات' : 'Equipment Department'}</p>
    </div>
  </div>

  <div class="doc-title">${title}</div>
  <div class="doc-date">${isAr ? 'تم الإنشاء في:' : 'Generated on:'} ${currentDate}</div>

  ${singleTrainee ? `
    <div class="trainee-card" style="display: flex; flex-direction: column; gap: 14px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${singleTrainee.profileImageUrl ? `
            <div style="width: 62px; height: 62px; border-radius: 12px; overflow: hidden; border: 2px solid #FFC000; flex-shrink: 0; background: #fff;">
              <img src="${singleTrainee.profileImageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Trainee" />
            </div>
          ` : `
            <div style="width: 62px; height: 62px; border-radius: 12px; background: #002D62; color: #FFC000; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; flex-shrink: 0;">
              ${(singleTrainee.name || 'TR').substring(0, 2).toUpperCase()}
            </div>
          `}
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #002D62; margin-bottom: 3px; display: flex; align-items: center; gap: 8px;">
              <span>${singleTrainee.name}</span>
              <span style="font-size: 12px; font-family: monospace; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 9999px; border: 1px solid #bae6fd;">#${singleTrainee.hrCode}</span>
            </div>
            <div style="font-size: 12px; color: #64748b; font-weight: 600; display: flex; gap: 12px;">
              <span>🏢 ${singleTrainee.department}</span>
              ${singleTrainee.jobRole ? `<span>👷‍♂️ ${singleTrainee.jobRole}</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- 4 Executive KPI Badges in Print Report -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 8px; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">
            ${isAr ? 'إجمالي الدورات' : 'Total Courses'}
          </div>
          <div style="font-size: 18px; font-weight: 900; color: #002D62;">
            ${singleTrainee.totalCourses !== undefined ? singleTrainee.totalCourses : new Set(records.map(r => r.courseName || r.courseId)).size}
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 8px; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">
            ${isAr ? 'إجمالي الجلسات' : 'Total Sessions'}
          </div>
          <div style="font-size: 18px; font-weight: 900; color: #0284c7;">
            ${singleTrainee.totalSessions !== undefined ? singleTrainee.totalSessions : records.length}
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 8px; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">
            ${isAr ? 'أيام التدريب' : 'Training Days'}
          </div>
          <div style="font-size: 18px; font-weight: 900; color: #d97706;">
            ${singleTrainee.attendedDays !== undefined ? singleTrainee.attendedDays : records.reduce((acc, r) => acc + (parseInt(String(r.raw?.['Attended Days'] || r.attendedDays || 1), 10) || 1), 0)}
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 8px; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">
            ${isAr ? 'متوسط الدرجات' : 'Avg Score'}
          </div>
          <div style="font-size: 18px; font-weight: 900; color: #16a34a;">
            ${singleTrainee.avgScore !== undefined && singleTrainee.avgScore !== null ? `${singleTrainee.avgScore}%` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  ` : ''}

  <table class="data-table">
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
      <p class="auth-title">${isAr ? 'Ø§Ø¹ØªÙ…Ø§Ø¯ Ù…Ø¯ÙŠØ± Ø§Ù„ØªØ¯Ø±ÙŠØ¨ Ø§Ù„ÙÙ†ÙŠ' : 'Authorized by Technical Training Manager'}</p>
      <p class="auth-name">Nader Kamel</p>
    </div>
    <div class="footer-sys">
      OED Technical Training Management System
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
  const fileName = options.fileName || (options.language === 'ar' ? 'Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â±_Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¯Ã˜Â±Ã™Å Ã˜Â¨.pdf' : 'Training_Report.pdf');

  // Create temporary container element off-screen
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
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
        windowWidth: 1024,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0
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



export const downloadTrainingRegisterPDF = async (session: import("./types").UpcomingSession, allUsers: import("./types").User[], allRecords: import("./types").TrainingRecord[]) => {
  const isAr = false; // The form image is in English
  
  // Find registered users
  const attendees = allUsers.filter(u => (session.registeredUsers || []).includes(u.hrCode));
  
  // We need to map them to records if available
  const traineeData = attendees.map(u => {
    // find record
    const rec = allRecords.find(r => r.userId === u.hrCode && r.courseId === session.courseTitle && r.attendanceDate === session.startDate);
    return {
      name: u.name,
      department: u.department,
      id: u.hrCode,
      score: rec ? (rec.score !== "N/A" ? rec.score : "") : "",
      days: rec ? rec.daysAttended : ""
    };
  });

  // Calculate duration in days safely
  const start = new Date(session.startDate);
  const end = new Date(session.endDate);
  let durationDays = 1;
  if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // Generate 20 rows
  let rowsHTML = "";
  for (let i = 0; i < 20; i++) {
    const t = traineeData[i];
    if (t) {
      rowsHTML += `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td>${t.name}</td>
          <td>${t.department}</td>
          <td style="text-align: center;">${t.id}</td>
          <td style="text-align: center;">${t.score}</td>
          <td style="text-align: center;">${t.days}</td>
        </tr>
      `;
    } else {
      rowsHTML += `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    }
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #000;
          margin: 0;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .header h1 {
          color: #8c8c8c;
          font-size: 28px;
          margin: 0;
          font-weight: bold;
        }
        .header img {
          width: 250px;
          object-fit: contain;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          border: 2px solid #000;
        }
        .info-table th, .info-table td {
          border: 1px solid #000;
          padding: 8px;
          font-size: 12px;
          font-weight: bold;
          text-align: center;
        }
        .info-table th {
          background-color: #f0f0f0; /* Optional: light gray if needed */
        }
        .main-table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #000;
        }
        .main-table th {
          border: 1px solid #000;
          padding: 8px;
          font-size: 12px;
          font-weight: bold;
          text-align: center;
          background-color: #e6f2ff; /* Very light blue header */
        }
        .main-table td {
          border: 1px solid #000;
          padding: 8px;
          font-size: 11px;
          height: 20px; /* Force minimum height for empty rows */
        }
        .main-table tr:nth-child(even) {
          background-color: #e6f2ff; /* Alternating light blue */
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Training Register</h1>
        <img src="/orascom-logo.png" style="height: 48px; width: auto; object-fit: contain;" alt="Orascom Construction Equipment Department OED" />
      </div>

      <table class="info-table">
        <tr>
          <td>Course Title</td>
          <td style="font-weight: normal;">${session.courseTitle}</td>
          <td>Instructor</td>
          <td style="font-weight: normal;">Nader Reda</td>
          <td>Number Of<br/>Participants</td>
          <td style="font-weight: normal;">${attendees.length}</td>
        </tr>
        <tr>
          <td>Start Date</td>
          <td style="font-weight: normal;">${new Date(session.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td>End Date</td>
          <td style="font-weight: normal;">${new Date(session.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td>Duration<br/>(Days)</td>
          <td style="font-weight: normal;">${durationDays}</td>
        </tr>
      </table>

      <table class="main-table">
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Participant Name</th>
            <th>Department</th>
            <th>ID</th>
            <th>Post Test %</th>
            <th>Attendance Days</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const fileName = `Training_Register_Session_${session.sessionNumber || "New"}.pdf`;

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = '#ffffff';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const opt = {
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        windowWidth: 1024 
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error('PDF export error:', err);
    alert('Failed to generate PDF. Check console.');
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};


