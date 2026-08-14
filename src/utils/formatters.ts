export const formatScore = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return 'N/A';
  const num = Number(val);
  if (!isNaN(num)) {
    if (num <= 1 && num > 0) {
      return `${Math.round(num * 100)}%`;
    }
    if (num > 1 && !String(val).includes('%')) {
      return `${num}%`;
    }
    if (num === 0) return '0%';
  }
  if (typeof val === 'string' && val.includes('%')) {
    return val;
  }
  return String(val);
};

export const parseScore = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  const num = Number(val);
  if (!isNaN(num)) {
    if (num <= 1 && num > 0) return num * 100;
    return num;
  }
  if (typeof val === 'string' && val.includes('%')) {
    return Number(val.replace('%', '')) || 0;
  }
  return 0;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Universal date formatting helper (DD-MMM-YYYY, e.g., 12-Mar-2026)
 */
export const formatDateToStandard = (dateValue: any): string => {
  if (dateValue === null || dateValue === undefined || dateValue === '' || dateValue === 'N/A' || dateValue === '--') {
    return '--';
  }

  try {
    // If it's a Date instance
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return '--';
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = MONTHS[dateValue.getMonth()];
      const year = dateValue.getFullYear();
      return `${day}-${month}-${year}`;
    }

    // If numeric (e.g. timestamp or Excel serial number like 44000)
    if (typeof dateValue === 'number') {
      if (isNaN(dateValue)) return '--';
      let d: Date;
      if (dateValue > 20000 && dateValue < 60000) {
        // Excel date serial number
        d = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
      } else {
        d = new Date(dateValue);
      }
      if (isNaN(d.getTime())) return '--';
      const day = String(d.getDate()).padStart(2, '0');
      const month = MONTHS[d.getMonth()];
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }

    if (typeof dateValue === 'string') {
      const str = dateValue.trim();
      if (!str) return '--';

      // If string is pure Excel serial numeric string (e.g. "44000")
      if (/^\d{5,6}$/.test(str)) {
        const num = Number(str);
        if (!isNaN(num) && num > 20000 && num < 60000) {
          const d = new Date(Math.round((num - 25569) * 86400 * 1000));
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = MONTHS[d.getMonth()];
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
          }
        }
      }

      // Check if already in DD-MMM-YYYY format (e.g. "12-Mar-2026", "05-Jan-2025")
      const ddMmmYyyyMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{4})$/);
      if (ddMmmYyyyMatch) {
        const day = ddMmmYyyyMatch[1].padStart(2, '0');
        const monthRaw = ddMmmYyyyMatch[2].toLowerCase();
        const monthIndex = MONTHS.findIndex(m => m.toLowerCase() === monthRaw);
        const year = ddMmmYyyyMatch[3];
        if (monthIndex !== -1) {
          return `${day}-${MONTHS[monthIndex]}-${year}`;
        }
      }

      // YYYY-MM-DD or YYYY/MM/DD or YYYY-MM-DDT...
      const yyyyMmDdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (yyyyMmDdMatch) {
        const year = yyyyMmDdMatch[1];
        const monthNum = parseInt(yyyyMmDdMatch[2], 10);
        const dayNum = parseInt(yyyyMmDdMatch[3], 10);
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          const day = String(dayNum).padStart(2, '0');
          const month = MONTHS[monthNum - 1];
          return `${day}-${month}-${year}`;
        }
      }

      // DD-MM-YYYY or DD/MM/YYYY
      const ddMmYyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (ddMmYyyyMatch) {
        const p1 = parseInt(ddMmYyyyMatch[1], 10);
        const p2 = parseInt(ddMmYyyyMatch[2], 10);
        const year = ddMmYyyyMatch[3];
        if (p1 <= 31 && p2 <= 12 && p2 >= 1) {
          const day = String(p1).padStart(2, '0');
          const month = MONTHS[p2 - 1];
          return `${day}-${month}-${year}`;
        }
      }

      // Standard JavaScript Date parsing as fallback
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = MONTHS[parsed.getMonth()];
        const year = parsed.getFullYear();
        return `${day}-${month}-${year}`;
      }
    }
  } catch (e) {
    return '--';
  }

  return '--';
};

