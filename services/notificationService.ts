import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { LocalCampusDB } from './localDb';
import { parseCalendarDate } from '@/utils/lectureUtils';

const CHANNEL_ID = 'survive_college_alerts';
const REMINDER_HOUR = 9;
const IMMEDIATE_DELAY_SECONDS = 5;

/**
 * Configure foreground and background presentation handler for push notifications
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

/**
 * Initialize notification permissions on device
 */
export const initNotifications = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Notification permissions not granted.');
      return false;
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Survive College Academic Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#7A3CFF',
          sound: 'default',
        });
      } catch (channelErr) {
        // Suppress Expo Go NullPointerException on notification channel manager
      }

      // Android 12+ requires the exact alarm permission for precise reminders
      try {
        const exact = await Notifications.getExactAlarmPermissionsAsync?.();
        if (exact && exact.status !== 'granted') {
          await Notifications.requestExactAlarmPermissionsAsync?.();
        }
      } catch {
        // Permission may not exist on older Android / Expo Go
      }
    }

    return true;
  } catch (err) {
    console.warn('[Notifications] Error initializing permissions:', err);
    return false;
  }
};

type PendingReminder = {
  key: string;
  fireAt: Date;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

/**
 * Build a reminder Date that is `daysBefore` days ahead of the target at 9 AM.
 */
function buildReminderDate(target: Date, daysBefore: number): Date {
  return new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate() - daysBefore,
    REMINDER_HOUR,
    0,
    0,
    0
  );
}

/**
 * Resolve a usable trigger date: keep the 9 AM reminder when it is still in the
 * future, otherwise fire a single catch-up alert shortly from now if the exam /
 * deadline itself has not passed yet.
 */
function resolveFireDate(
  target: Date,
  daysBefore: number,
  now: Date
): { date: Date; isCatchUp: boolean } | null {
  const reminder = buildReminderDate(target, daysBefore);
  if (reminder.getTime() > now.getTime()) return { date: reminder, isCatchUp: false };

  const endOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    23,
    59,
    59,
    999
  );
  if (endOfTarget.getTime() < now.getTime()) return null;

  return {
    date: new Date(now.getTime() + IMMEDIATE_DELAY_SECONDS * 1000),
    isCatchUp: true,
  };
}

/**
 * Stable signature token: catch-up alerts keep a single identity so refreshing
 * the app never fires the same reminder repeatedly.
 */
function reminderKey(prefix: string, id: string, fire: { date: Date; isCatchUp: boolean }, extra: string) {
  return `${prefix}:${id}:${fire.isCatchUp ? 'catchup' : fire.date.getTime()}:${extra}`;
}

function isInternalExam(evt: { title?: string; description?: string }): boolean {
  const text = `${evt.title || ''} ${evt.description || ''}`;
  return /\b(internal|internals|cie|mid[- ]?term|mid[- ]?sem|test|assessment)\b/i.test(text);
}

function isExternalExam(evt: { title?: string; description?: string }): boolean {
  const text = `${evt.title || ''} ${evt.description || ''}`;
  return /\b(external|externals|see|semester end|end sem|final)\b/i.test(text);
}

/**
 * Requirement #9: Schedule academic push notifications from the academic calendar
 * 1. CIE / internal assessments -> 5 days before the exam date
 * 2. SEE / external assessments -> 10 days before the exam date
 * 3. Assignments -> 1 day before the due date
 *
 * Uses DATE triggers so alerts fire reliably in a standalone Expo APK, and keeps
 * a persisted signature so repeated refreshes never duplicate reminders.
 */
export const scheduleAcademicPushNotifications = async (): Promise<{
  scheduledCount: number;
}> => {
  if (Platform.OS === 'web') return { scheduledCount: 0 };

  try {
    const hasPermission = await initNotifications();
    if (!hasPermission) return { scheduledCount: 0 };

    const now = new Date();

    const [calendarEvents, assignments] = await Promise.all([
      LocalCampusDB.getCalendarEvents(),
      LocalCampusDB.getAssignments(),
    ]);

    const reminders: PendingReminder[] = [];

    for (const evt of calendarEvents) {
      if (!evt.date) continue;
      if (evt.type !== 'Exam') continue;

      const eventDate = parseCalendarDate(evt.date);
      if (!eventDate) continue;

      if (isInternalExam(evt)) {
        const fire = resolveFireDate(eventDate, 5, now);
        if (fire) {
          reminders.push({
            key: reminderKey('cie', evt.id, fire, evt.title || ''),
            fireAt: fire.date,
            title: 'Upcoming Internal Assessment',
            body: `${evt.title} is approaching. Check Study Materials for previous papers and revise your CIE modules.`,
            data: { eventId: evt.id, type: 'internal_exam' },
          });
        }
      }

      if (isExternalExam(evt)) {
        const fire = resolveFireDate(eventDate, 10, now);
        if (fire) {
          reminders.push({
            key: reminderKey('see', evt.id, fire, evt.title || ''),
            fireAt: fire.date,
            title: 'Final Semester Examination',
            body: `${evt.title} begins soon. Ensure you meet the 75% attendance rule and download your hall ticket.`,
            data: { eventId: evt.id, type: 'external_exam' },
          });
        }
      }
    }

    for (const asg of assignments) {
      if (asg.status === 'submitted' || asg.status === 'graded') continue;

      const dueDate = parseCalendarDate(asg.dueDate);
      if (!dueDate) continue;

      const fire = resolveFireDate(dueDate, 1, now);
      if (!fire) continue;

      reminders.push({
        key: reminderKey('asg', asg.id, fire, `${asg.dueDate}:${asg.title}`),
        fireAt: fire.date,
        title: 'Assignment Due Tomorrow',
        body: `"${asg.title}" for ${asg.courseCode} is due soon. Submit via the Academics tab.`,
        data: { assignmentId: asg.id, type: 'assignment_due' },
      });
    }

    reminders.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());

    const signature = reminders.map((r) => r.key).join('|');
    const previousSignature = await LocalCampusDB.getNotificationScheduleSignature();
    if (signature === previousSignature) {
      return { scheduledCount: reminders.length };
    }

    // Replace previous reminders so edits never leave stale or duplicate alerts
    await Notifications.cancelAllScheduledNotificationsAsync();

    let scheduledCount = 0;
    for (const reminder of reminders) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.title,
            body: reminder.body,
            data: reminder.data,
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminder.fireAt,
            channelId: CHANNEL_ID,
          },
        });
        scheduledCount++;
      } catch (scheduleErr) {
        console.warn('[Notifications] Failed to schedule reminder:', scheduleErr);
      }
    }

    await LocalCampusDB.setNotificationScheduleSignature(signature);
    return { scheduledCount };
  } catch (err) {
    console.warn('[Notifications] Error scheduling notifications:', err);
    return { scheduledCount: 0 };
  }
};

/**
 * Immediate test notification helper
 */
export const triggerTestPushNotification = async (): Promise<void> => {
  await initNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Survive College Alert',
      body: 'Push notifications are active! You will be reminded 5 days before CIE, 10 days before SEE, and 1 day before assignments.',
      sound: 'default',
    },
    trigger: null,
  });
};
