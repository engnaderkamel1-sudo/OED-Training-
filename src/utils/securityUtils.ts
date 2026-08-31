/**
 * Security & Data Validation Utilities
 * Defense-in-Depth against XSS (Cross-Site Scripting) and Data Tampering
 */

/**
 * Escapes special HTML characters to prevent XSS when injecting strings into HTML/DOM.
 */
export const escapeHtml = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#x60;');
};

/**
 * Validates and sanitizes URLs to ensure they only use safe protocols (http, https, mailto, tel).
 * Prevents javascript: and data: URI XSS injection.
 */
export const sanitizeUrl = (url?: string, defaultUrl: string = '#'): string => {
  if (!url || typeof url !== 'string') return defaultUrl;
  const trimmed = url.trim();
  // Allow only http, https, mailto, tel, and relative paths starting with /
  if (/^(https?:\/\/|mailto:|tel:|\/[a-zA-Z0-9_\-\.\/]+)/i.test(trimmed)) {
    return trimmed;
  }
  return defaultUrl;
};

/**
 * Trims and sanitizes plain text inputs.
 */
export const sanitizePlainText = (input?: string, maxLength: number = 500): string => {
  if (!input || typeof input !== 'string') return '';
  // Remove control characters (except newline and tab)
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  return cleaned.slice(0, maxLength);
};

/**
 * Validates HR Code format (letters, digits, dashes, 2-20 characters).
 */
export const validateHrCode = (hrCode?: string): boolean => {
  if (!hrCode || typeof hrCode !== 'string') return false;
  const clean = hrCode.trim();
  return /^[a-zA-Z0-9\-_]{2,20}$/.test(clean);
};

/**
 * Validates Egyptian phone number format (e.g. 01012345678, +201012345678, 011..., 012..., 015...).
 */
export const validatePhone = (phone?: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.replace(/[\s\-\(\)]/g, '').trim();
  return /^(\+?20|0)?1[0125]\d{8}$/.test(clean);
};

/**
 * Validates email RFC pattern.
 */
export const validateEmail = (email?: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean);
};

/**
 * Validates start and end date range.
 */
export const validateDateRange = (startDate?: string, endDate?: string): { isValid: boolean; error?: string } => {
  if (!startDate || !endDate) return { isValid: false, error: 'Start date and end date are required.' };
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return { isValid: false, error: 'Invalid date format.' };
  }
  if (d1.getTime() > d2.getTime()) {
    return { isValid: false, error: 'Start date cannot be after end date.' };
  }
  return { isValid: true };
};
