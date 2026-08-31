import { UpcomingSession, TrainingRecord } from '../types';

/**
 * Parses a session number string/number into a valid positive integer or null.
 */
export const parseSessionNumber = (val?: string | number | null): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).trim();
  const digits = str.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
};

/**
 * Returns a sorted unique array of all numerical session numbers currently occupied.
 */
export const getOccupiedSessionNumbers = (
  sessions: UpcomingSession[] = [],
  records: TrainingRecord[] = []
): number[] => {
  const numSet = new Set<number>();

  // 1. From Upcoming Sessions (Active, Completed, Cancelled with valid numbers)
  sessions.forEach(s => {
    if (!s.isDeleted) {
      const n = parseSessionNumber(s.sessionNumber);
      if (n !== null) numSet.add(n);
    }
  });

  // 2. From Legacy Training Records (if sessionNumber or courseId contains serial)
  records.forEach(r => {
    const rawNum = r.raw?.['Session No'] || r.raw?.['Session Number'] || r.raw?.['Session'];
    const n = parseSessionNumber(rawNum);
    if (n !== null) numSet.add(n);
  });

  return Array.from(numSet).sort((a, b) => a - b);
};

/**
 * Calculates the next highest global session number (Max + 1).
 */
export const getNextGlobalSessionNumber = (
  sessions: UpcomingSession[] = [],
  records: TrainingRecord[] = []
): string => {
  const occupied = getOccupiedSessionNumbers(sessions, records);
  if (occupied.length === 0) return '1';
  const max = Math.max(...occupied);
  return String(max + 1);
};

/**
 * Finds all vacant/gap numbers between 1 and the maximum occupied number.
 */
export const getVacantSessionNumbers = (
  sessions: UpcomingSession[] = [],
  records: TrainingRecord[] = [],
  limitCount: number = 5
): number[] => {
  const occupied = getOccupiedSessionNumbers(sessions, records);
  if (occupied.length === 0) return [];

  const max = Math.max(...occupied);
  const occupiedSet = new Set(occupied);
  const gaps: number[] = [];

  for (let i = 1; i < max; i++) {
    if (!occupiedSet.has(i)) {
      gaps.push(i);
      if (gaps.length >= limitCount) break;
    }
  }

  return gaps;
};

/**
 * Checks if a session number conflicts with an existing active session.
 */
export const findConflictingSession = (
  targetNumber: string | number,
  currentSessionId?: string,
  sessions: UpcomingSession[] = []
): UpcomingSession | undefined => {
  const parsed = parseSessionNumber(targetNumber);
  if (parsed === null) return undefined;

  return sessions.find(s => {
    if (s.id === currentSessionId) return false;
    if (s.status === 'Cancelled' || s.isDeleted) return false;
    const sNum = parseSessionNumber(s.sessionNumber);
    return sNum === parsed;
  });
};

/**
 * Shifts down subsequent session numbers after a session cancellation/deletion.
 */
export const calculateReindexedSessions = (
  deletedSessionNumber: number,
  sessions: UpcomingSession[]
): UpcomingSession[] => {
  const updatedList: UpcomingSession[] = [];

  sessions.forEach(s => {
    if (s.status !== 'Cancelled' && !s.isDeleted) {
      const currentNum = parseSessionNumber(s.sessionNumber);
      if (currentNum !== null && currentNum > deletedSessionNumber) {
        updatedList.push({
          ...s,
          sessionNumber: String(currentNum - 1)
        });
      }
    }
  });

  return updatedList;
};
