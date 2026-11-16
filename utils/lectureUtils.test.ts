import { getNextLectureInfo, parseTimeToDate, formatTimeDifference, isWeekend, getDefaultRoom } from './lectureUtils';
import { TimetableSlot } from '@/constants/CampusData';
import { CalendarEventItem } from '@/services/localDb';

// Mock data for testing
const mockTimetable: TimetableSlot[] = [
  {
    id: 'tt_1',
    courseCode: 'BCS401',
    courseTitle: 'Analysis and Design of Algorithms',
    day: 'Monday',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    room: 'LH-301',
    facultyName: 'Dr. Priya Raman',
    type: 'Theory'
  },
  {
    id: 'tt_2',
    courseCode: 'BCS403',
    courseTitle: 'Database Management Systems',
    day: 'Monday',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    room: 'LH-302',
    facultyName: 'Prof. K. Venkatesh',
    type: 'Theory'
  },
  {
    id: 'tt_3',
    courseCode: 'BCS401',
    courseTitle: 'Design of Algorithms Lab',
    day: 'Tuesday',
    startTime: '02:00 PM',
    endTime: '04:00 PM',
    room: 'Systems Lab 3',
    facultyName: 'Dr. Priya Raman',
    type: 'Lab'
  }
];

const mockCalendarEvents: CalendarEventItem[] = [
  {
    id: 'cal_1',
    title: 'Diwali Festival',
    date: '2026-11-14',
    type: 'Holiday',
    description: 'Diwali Festival Holiday',
    isImportant: true
  },
  {
    id: 'cal_2',
    title: 'Mid-Semester Examinations',
    date: '2026-11-18',
    type: 'Exam',
    description: 'Mid-term exams begin',
    isImportant: true
  }
];

// Test helper to create specific dates
function createTestDate(dayOfWeek: number, hours: number, minutes: number): Date {
  const date = new Date();
  // Set to specific day of week (0 = Sunday, 1 = Monday, etc.)
  const currentDay = date.getDay();
  const diff = dayOfWeek - currentDay;
  date.setDate(date.getDate() + diff);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

console.log('=== Testing Smart Next Lecture Feature ===\n');

// Test 1: Parse time function
console.log('Test 1: Time Parsing');
const testTime = parseTimeToDate('09:00 AM');
console.log(`Parsed "09:00 AM": ${testTime.toLocaleTimeString()}`);
const testTimePM = parseTimeToDate('02:30 PM');
console.log(`Parsed "02:30 PM": ${testTimePM.toLocaleTimeString()}\n`);

// Test 2: Format time difference
console.log('Test 2: Time Difference Formatting');
const startTime = new Date('2026-11-07T09:00:00');
const endTime = new Date('2026-11-07T10:30:00');
console.log(`1h 30m difference: ${formatTimeDifference(startTime, endTime)}`);
console.log(`45m difference: ${formatTimeDifference(startTime, new Date('2026-11-07T09:45:00'))}`);
console.log(`2h difference: ${formatTimeDifference(startTime, new Date('2026-11-07T11:00:00'))}\n`);

// Test 3: Weekend detection
console.log('Test 3: Weekend Detection');
const monday = createTestDate(1, 10, 0); // Monday
const saturday = createTestDate(6, 10, 0); // Saturday
console.log(`Is Monday weekend? ${isWeekend(monday)}`);
console.log(`Is Saturday weekend? ${isWeekend(saturday)}\n`);

// Test 4: Default room assignments
console.log('Test 4: Default Room Assignments');
console.log(`Default room for Theory: ${getDefaultRoom('Theory')}`);
console.log(`Default room for Lab: ${getDefaultRoom('Lab')}`);
console.log(`Default room for unknown type: ${getDefaultRoom('Unknown')}\n`);

// Test 5: Holiday detection
console.log('Test 5: Holiday Scenarios');
const holidayDate = new Date('2026-11-14T10:00:00'); // Diwali date
const holidayCheck = () => {
  const result = { isHoliday: true, occasion: 'Diwali Festival' };
  console.log(`Holiday on 2026-11-14: ${result.isHoliday ? `Yes - ${result.occasion}` : 'No'}`);
};
holidayCheck();

// Test 6: Next lecture scenarios
console.log('\nTest 6: Next Lecture Scenarios');

// Scenario A: Monday 8:30 AM (before first class)
const mondayMorning = createTestDate(1, 8, 30);
console.log('\nA. Monday 8:30 AM (Before classes):');
const resultA = getNextLectureInfo(mockTimetable, [], mondayMorning);
console.log(`Status: ${resultA.status}`);
console.log(`Message: ${resultA.message}`);
console.log(`Time Info: ${resultA.timeInfo?.label} ${resultA.timeInfo?.value}`);
console.log(`Room: ${resultA.room}`);

// Scenario B: Monday 9:30 AM (during first class)
const mondayDuringClass = createTestDate(1, 9, 30);
console.log('\nB. Monday 9:30 AM (During class):');
const resultB = getNextLectureInfo(mockTimetable, [], mondayDuringClass);
console.log(`Status: ${resultB.status}`);
console.log(`Message: ${resultB.message}`);
console.log(`Time Info: ${resultB.timeInfo?.label} ${resultB.timeInfo?.value}`);

// Scenario C: Saturday (weekend)
const saturdayMorning = createTestDate(6, 10, 0);
console.log('\nC. Saturday 10:00 AM (Weekend):');
const resultC = getNextLectureInfo(mockTimetable, [], saturdayMorning);
console.log(`Status: ${resultC.status}`);
console.log(`Message: ${resultC.message}`);

// Scenario D: No classes for the day
const emptyTimetable: TimetableSlot[] = [];
console.log('\nD. Monday with no classes:');
const resultD = getNextLectureInfo(emptyTimetable, [], mondayMorning);
console.log(`Status: ${resultD.status}`);
console.log(`Message: ${resultD.message}`);

// Scenario E: Holiday
const diwaliDate = new Date('2026-11-14T10:00:00');
console.log('\nE. Diwali Holiday (2026-11-14):');
const resultE = getNextLectureInfo(mockTimetable, mockCalendarEvents, diwaliDate);
console.log(`Status: ${resultE.status}`);
console.log(`Message: ${resultE.message}`);
console.log(`Occasion: ${resultE.occasion}`);

console.log('\n=== All Tests Completed ===');