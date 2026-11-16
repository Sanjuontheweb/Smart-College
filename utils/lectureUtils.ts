import { TimetableSlot } from '@/constants/CampusData';
import { CalendarEventItem } from '@/services/localDb';

export interface NextLectureInfo {
  status: 'holiday' | 'weekend' | 'no-class' | 'in-progress' | 'upcoming' | 'completed';
  message: string;
  class?: TimetableSlot;
  timeInfo?: {
    label: string;
    value: string;
    isCountdown?: boolean;
  };
  occasion?: string;
  room?: string;
}

/**
 * Parse time string (e.g., "09:00 AM", "9:00 AM", "09:00AM", "14:00", "2:00") to Date object for today
 */
export function parseTimeToDate(timeStr: string, baseDate = new Date()): Date {
  const date = new Date(baseDate);
  if (!timeStr) return date;

  const cleanStr = timeStr.trim();
  const match = cleanStr.match(/(\d{1,2})[:.](\d{2})(?:\s*([AaPp]\.?[Mm]\.?))?/i);
  if (!match) return date;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  // Look for AM/PM in the match or anywhere in the string
  let period = match[3]?.toUpperCase().replace(/\./g, '');
  if (!period) {
    if (/pm/i.test(cleanStr)) period = 'PM';
    else if (/am/i.test(cleanStr)) period = 'AM';
  }

  // Convert to 24-hour format
  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  } else if (!period) {
    // In college schedules, classes with hours 1..6 are PM (1 PM - 6 PM)
    if (hours >= 1 && hours <= 6) {
      hours += 12;
    }
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Format time difference to human-readable string
 */
export function formatTimeDifference(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes <= 0) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Normalize a faculty name for comparisons: lowercase, strip common titles,
 * punctuation and extra whitespace.
 */
export function normalizeFacultyName(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(dr|prof|mr|mrs|ms|miss)\.?\s+/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compare two faculty names tolerantly (titles, punctuation, partial names).
 */
export function isSameFacultyName(a?: string, b?: string): boolean {
  const left = normalizeFacultyName(a);
  const right = normalizeFacultyName(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Normalize a timetable day value ("monday" -> "Monday").
 */
export function normalizeDayName(day?: string): string {
  if (!day) return '';
  const cleaned = day.trim().toLowerCase();
  const match = DAY_NAMES.find(
    (name) => name.toLowerCase() === cleaned || name.toLowerCase().startsWith(cleaned.slice(0, 3))
  );
  return match || day.trim();
}

function parseSingleCalendarDate(raw?: string): Date | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const parsed = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function splitDateRange(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .trim()
    .split(/\s+(?:-|–|—|to)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Parse calendar dates stored as ISO ("2026-11-18"), display strings
 * ("Nov 18, 2026") or ranges ("2026-11-18 - 2026-11-20"). Returns the start.
 */
export function parseCalendarDate(raw?: string): Date | null {
  const parts = splitDateRange(raw);
  if (parts.length === 0) return parseSingleCalendarDate(raw);
  return parseSingleCalendarDate(parts[0]);
}

/**
 * Parse the end of a calendar date range, if present.
 */
export function parseCalendarRangeEnd(raw?: string): Date | null {
  const parts = splitDateRange(raw);
  if (parts.length < 2) return null;
  return parseSingleCalendarDate(parts[parts.length - 1]);
}

/**
 * Check if current date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Check if current date is a holiday based on calendar events
 */
export function isHoliday(
  date: Date,
  calendarEvents: CalendarEventItem[]
): { isHoliday: boolean; occasion?: string } {
  // Format local date as YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const localDateStr = `${year}-${month}-${day}`;
  const isoDateStr = date.toISOString().split('T')[0];

  for (const event of calendarEvents) {
    if (!event.date && !event.startDate) continue;

    let inRange = false;

    // 0. Flexible parse first (ISO, display strings, ranges)
    const parsedStart = parseCalendarDate(event.startDate || event.date);
    const parsedEnd = event.endDate
      ? parseCalendarDate(event.endDate)
      : parseCalendarRangeEnd(event.date) || parsedStart;
    if (parsedStart && parsedEnd) {
      const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const startDay = new Date(
        parsedStart.getFullYear(),
        parsedStart.getMonth(),
        parsedStart.getDate()
      ).getTime();
      const endDay = new Date(
        parsedEnd.getFullYear(),
        parsedEnd.getMonth(),
        parsedEnd.getDate()
      ).getTime();
      if (targetDay >= startDay && targetDay <= endDay) {
        inRange = true;
      }
    }

    // 1. Direct match on startDate / endDate
    if (event.startDate && event.endDate) {
      if (localDateStr >= event.startDate && localDateStr <= event.endDate) {
        inRange = true;
      }
    }

    // 2. Range inside date string: "2026-11-08 - 2026-11-10" or "2026-11-08 to 2026-11-10"
    if (!inRange && event.date) {
      const evDate = event.date.trim();
      const rangeParts = evDate.split(/\s*[-–—to]\s*(?=\d{4}|\d{2}\/)/i);
      if (rangeParts.length === 2) {
        const start = rangeParts[0].trim();
        const end = rangeParts[1].trim();
        if (localDateStr >= start && localDateStr <= end) {
          inRange = true;
        }
      } else {
        // Single date match
        if (
          evDate === localDateStr ||
          evDate === isoDateStr ||
          evDate.includes(localDateStr) ||
          evDate.includes(isoDateStr)
        ) {
          inRange = true;
        }
      }
    }

    if (inRange) {
      const isTypeHoliday = event.type?.toLowerCase() === 'holiday';
      const isTextHoliday =
        /holiday|vacation|diwali|deepavali|recess|festival|jayanti/i.test(event.title || '') ||
        /holiday|suspended|vacation|closed/i.test(event.description || '');

      if (isTypeHoliday || isTextHoliday) {
        const spanText = event.dateSpan ? ` • ${event.dateSpan}` : '';
        return {
          isHoliday: true,
          occasion: `${event.title || 'Holiday'}${spanText}`,
        };
      }
    }
  }

  return { isHoliday: false };
}

/**
 * Get default room based on class type
 */
export function getDefaultRoom(classType: string): string {
  return classType?.toLowerCase() === 'lab' ? 'L111' : 'L207';
}

/**
 * Get room display with fallback to default
 */
export function getRoomDisplay(slot: TimetableSlot): string {
  return slot.room || getDefaultRoom(slot.type);
}

/**
 * Calculate time status for a class
 */
export function calculateTimeStatus(
  classStart: Date,
  classEnd: Date,
  currentTime: Date
): 'upcoming' | 'in-progress' | 'completed' {
  if (currentTime < classStart) {
    return 'upcoming';
  } else if (currentTime >= classStart && currentTime <= classEnd) {
    return 'in-progress';
  } else {
    return 'completed';
  }
}

/**
 * Get the next lecture information based on current time and timetable.
 * Optionally filter by facultyName for faculty-specific view.
 */
export function getNextLectureInfo(
  timetable: TimetableSlot[],
  calendarEvents: CalendarEventItem[],
  currentTime = new Date(),
  facultyNameFilter?: string
): NextLectureInfo {
  // 1. Check for campus holidays first
  const holidayCheck = isHoliday(currentTime, calendarEvents);
  if (holidayCheck.isHoliday) {
    return {
      status: 'holiday',
      message: holidayCheck.occasion || 'Campus Holiday - No Lectures',
      occasion: holidayCheck.occasion,
    };
  }

  const currentDay = currentTime.getDay();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysOfWeek[currentDay];

  // Filter timetable: for faculty, only include their classes; for student, all classes
  let candidateSlots = timetable;
  if (facultyNameFilter && facultyNameFilter.trim().length > 0) {
    candidateSlots = timetable.filter((s) => isSameFacultyName(s.facultyName, facultyNameFilter));
  }

  // Get today's classes sorted by start time
  const todayClasses = candidateSlots
    .filter((slot) => normalizeDayName(slot.day) === todayName)
    .map((slot) => {
      const startDate = parseTimeToDate(slot.startTime, currentTime);
      let endDate = parseTimeToDate(slot.endTime, currentTime);
      // If end time is before or equal to start time, it rolled into PM or lasts 1 hour
      if (endDate.getTime() <= startDate.getTime()) {
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      }
      return {
        ...slot,
        startDate,
        endDate,
      };
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  // Check if it's a weekend (unless there are classes scheduled for today)
  if (todayClasses.length === 0 && isWeekend(currentTime)) {
    return {
      status: 'weekend',
      message: 'Weekend Holiday - Enjoy your break!',
    };
  }

  if (todayClasses.length === 0) {
    return {
      status: 'no-class',
      message: facultyNameFilter
        ? 'No lectures scheduled to conduct today'
        : 'No lectures scheduled for today',
    };
  }

  // Priority 1: Check if ANY class is currently active / in-progress right now
  let currentOrNextClass = todayClasses.find(
    (c) => currentTime >= c.startDate && currentTime <= c.endDate
  );
  let timeStatus: 'upcoming' | 'in-progress' | 'completed' = 'completed';

  if (currentOrNextClass) {
    timeStatus = 'in-progress';
  } else {
    // Priority 2: Find the earliest upcoming class that hasn't started yet
    currentOrNextClass = todayClasses.find((c) => currentTime < c.startDate);
    if (currentOrNextClass) {
      timeStatus = 'upcoming';
    } else if (todayClasses.length > 0) {
      // Priority 3: All classes for today have ended
      currentOrNextClass = todayClasses[todayClasses.length - 1];
      timeStatus = 'completed';
    }
  }

  if (!currentOrNextClass) {
    return {
      status: 'completed',
      message: facultyNameFilter
        ? 'All lectures to conduct are completed for today'
        : 'All lectures completed for today',
    };
  }

  // Prepare the response
  const room = getRoomDisplay(currentOrNextClass);
  const { startDate, endDate, ...classInfo } = currentOrNextClass;

  if (timeStatus === 'in-progress') {
    const timeRemaining = formatTimeDifference(currentTime, endDate);
    return {
      status: 'in-progress',
      message: `${classInfo.courseCode}: ${classInfo.courseTitle}${facultyNameFilter ? ' (In Session)' : ''}`,
      class: classInfo,
      timeInfo: {
        label: 'Ends in',
        value: timeRemaining,
        isCountdown: true,
      },
      room,
    };
  } else if (timeStatus === 'upcoming') {
    const timeUntil = formatTimeDifference(currentTime, startDate);
    return {
      status: 'upcoming',
      message: `${classInfo.courseCode}: ${classInfo.courseTitle}${facultyNameFilter ? ' (Next to Conduct)' : ''}`,
      class: classInfo,
      timeInfo: {
        label: 'Starts in',
        value: timeUntil,
        isCountdown: true,
      },
      room,
    };
  } else {
    // All classes completed for today - do not attach class details or room
    return {
      status: 'completed',
      message: facultyNameFilter
        ? 'All lectures to conduct are completed for today'
        : 'All lectures completed for today',
    };
  }
}

/**
 * Get a human-readable status label
 */
export function getStatusLabel(status: NextLectureInfo['status']): string {
  switch (status) {
    case 'holiday': return 'Holiday';
    case 'weekend': return 'Weekend';
    case 'no-class': return 'No Classes';
    case 'in-progress': return 'In Progress';
    case 'upcoming': return 'Upcoming';
    case 'completed': return 'Completed';
    default: return 'Unknown';
  }
}

/**
 * Get status badge variant for UI
 */
export function getStatusVariant(status: NextLectureInfo['status']): 
  'primary' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'holiday': return 'success';
    case 'weekend': return 'success';
    case 'no-class': return 'neutral';
    case 'in-progress': return 'warning';
    case 'upcoming': return 'primary';
    case 'completed': return 'neutral';
    default: return 'neutral';
  }
}

/**
 * Get icon name for status
 */
export function getStatusIcon(status: NextLectureInfo['status']): string {
  switch (status) {
    case 'holiday': return 'beach-outline';
    case 'weekend': return 'sparkles-outline';
    case 'no-class': return 'library-outline';
    case 'in-progress': return 'time-outline';
    case 'upcoming': return 'alarm-outline';
    case 'completed': return 'checkmark-done-outline';
    default: return 'time-outline';
  }
}

/**
 * Returns dynamic status for an individual lecture slot relative to current time:
 * 'in-progress' | 'upcoming' | 'completed'
 */
export function getSlotLiveStatus(
  startTimeStr: string,
  endTimeStr: string,
  currentTime = new Date()
): { status: 'in-progress' | 'upcoming' | 'completed'; label: string; variant: 'success' | 'warning' | 'neutral' } {
  const start = parseTimeToDate(startTimeStr, currentTime);
  let end = parseTimeToDate(endTimeStr, currentTime);
  if (end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }

  if (currentTime >= start && currentTime <= end) {
    return { status: 'in-progress', label: 'In Progress', variant: 'warning' };
  } else if (currentTime < start) {
    return { status: 'upcoming', label: 'Upcoming', variant: 'success' };
  } else {
    return { status: 'completed', label: 'Completed', variant: 'neutral' };
  }
}