import { UpcomingSession } from '../types';

/**
 * Checks if a session is actively running right now:
 * 1. Must not be deleted, completed, or cancelled.
 * 2. Today's local date must fall strictly between session startDate and endDate.
 * 3. Current local time must be between session startTime (e.g. 08:00 or 09:00 AM) and 16:00 (4:00 PM).
 */
export const isSessionActiveNow = (session?: UpcomingSession | null): boolean => {
  if (!session || session.isDeleted || session.status === 'Cancelled' || session.status === 'Completed') {
    return false;
  }
  if (!session.startDate) return false;

  // Local date in YYYY-MM-DD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const normalizeDate = (dStr?: string): string => {
    if (!dStr) return '';
    const trimmed = String(dStr).trim();
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    
    // Handle DD/MM/YYYY or DD-MM-YYYY
    const parts = trimmed.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return trimmed;
  };

  const sStart = normalizeDate(session.startDate);
  const sEnd = normalizeDate(session.endDate) || sStart;

  // Strictly check if today is within course calendar range
  if (!sStart || todayStr < sStart || todayStr > sEnd) {
    return false;
  }

  // Parse start hour (default 08:30 AM if unspecified)
  let startHour = 8;
  let startMinute = 30;
  if (session.startTime) {
    const timeMatch = String(session.startTime).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const meridiem = timeMatch[3]?.toUpperCase();
      if (meridiem === 'PM' && h < 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      startHour = h;
      startMinute = m;
    }
  }

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = 16 * 60; // 16:00 = 4:00 PM (960 mins)

  return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
};

/**
 * Checks if today falls strictly within the session start and end dates (all-day check)
 */
export const isDateInSessionRange = (session?: UpcomingSession | null): boolean => {
  if (!session || session.isDeleted || session.status === 'Cancelled') return false;
  if (!session.startDate) return false;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const normalizeDate = (dStr?: string): string => {
    if (!dStr) return '';
    const trimmed = String(dStr).trim();
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parts = trimmed.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return trimmed;
  };

  const sStart = normalizeDate(session.startDate);
  const sEnd = normalizeDate(session.endDate) || sStart;

  return Boolean(sStart && todayStr >= sStart && todayStr <= sEnd);
};

/**
 * Sends a native browser push notification when session becomes active
 */
export const sendNativePushNotification = (title: string, body: string, iconUrl = '/app-icon.png') => {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: iconUrl,
        badge: iconUrl,
        tag: 'oed-active-session',
      });
    }
  } catch (err) {
    console.warn('Native notification error:', err);
  }
};
