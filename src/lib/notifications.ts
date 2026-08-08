import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import RingtonePicker from "ringtone-picker";
import type { PrepSession } from "@/types";

const DEFAULT_CHANNEL_ID = "prep-session-default";
const REMINDER_MINUTES_BEFORE = 30;
const SOURCE_TAG = "prepSession";

/**
 * When a session has a date but no time, remind at this hour on the day itself.
 *
 * Sessions without a time were previously skipped outright, so scheduling one and waiting produced
 * no notification at all. Treating them like an all-day task and notifying in the morning matches
 * what Todoist and Google Tasks do with undated-time items.
 */
const ALL_DAY_REMINDER_HOUR = 9;

/** Short, stable channel id derived from a picked sound's URI (Android channel ids can't be arbitrary). */
function customChannelId(uri: string): string {
  let hash = 0;
  for (let i = 0; i < uri.length; i++) {
    hash = (hash * 31 + uri.charCodeAt(i)) | 0;
  }
  return `prep-session-sound-${Math.abs(hash)}`;
}

function combineDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

/**
 * Makes a notification actually appear while the app is in the foreground.
 *
 * expo-notifications defaults to *suppressing* delivery when the app is open — without a handler
 * registered, a correctly scheduled notification fires and is silently swallowed, which looks
 * exactly like "reminders don't work" during testing, since the obvious way to test a reminder is
 * to sit and watch the app until it's due.
 *
 * Registered at module scope so it is in place before any screen mounts.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests the notification permission and reports whether it was actually granted.
 *
 * On Android 13+ POST_NOTIFICATIONS is a runtime permission: scheduling still resolves
 * successfully when it's denied, and nothing is ever delivered. Callers need the answer so they
 * can tell the user, rather than scheduling into a void.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function hasNotificationPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

export async function ensureDefaultChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  // Omitting `sound` entirely (rather than passing "default") is what makes this channel use the
  // system default notification sound - the native module treats any string here as a bundled
  // sound filename to resolve, and fails loudly if a file with that name doesn't exist.
  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: "Prep session reminders",
    importance: Notifications.AndroidImportance.MAX,
  });
}

async function resolveChannelId(session: PrepSession): Promise<string> {
  if (Platform.OS === "android" && session.reminder_sound_uri && RingtonePicker) {
    const channelId = customChannelId(session.reminder_sound_uri);
    await RingtonePicker.ensureNotificationChannel(
      channelId,
      session.reminder_sound_name || "Prep session sound",
      session.reminder_sound_uri
    );
    return channelId;
  }
  return DEFAULT_CHANNEL_ID;
}

export interface ReminderReconcileResult {
  /** False when the OS permission is missing, in which case nothing was scheduled. */
  permitted: boolean;
  /** How many notifications are now queued. Zero with permitted:true means every session is
   *  completed or already in the past — a normal state, not a failure. */
  scheduled: number;
}

/**
 * Cancels every reminder this app previously scheduled, then reschedules a fresh set from the
 * current session list. Re-running this after any create/complete/delete keeps reminders correct
 * without needing to track notification-id-to-session mappings across edits.
 */
export async function reconcilePrepSessionReminders(
  sessions: PrepSession[]
): Promise<ReminderReconcileResult> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.source === SOURCE_TAG)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  // Checked after cancelling, not before: if the user has revoked the permission we still want the
  // stale queue cleared, rather than leaving previously-scheduled reminders to fire.
  if (!(await hasNotificationPermission())) {
    return { permitted: false, scheduled: 0 };
  }

  const now = Date.now();
  let count = 0;

  for (const session of sessions) {
    if (session.completed_at) continue;

    // A session with no time is an all-day item: one reminder in the morning, and no
    // "starting in 30 minutes", which would be meaningless without a start time.
    const hasTime = Boolean(session.scheduled_time);
    const startAt = hasTime
      ? combineDateTime(session.scheduled_for, session.scheduled_time as string)
      : combineDateTime(session.scheduled_for, `${String(ALL_DAY_REMINDER_HOUR).padStart(2, "0")}:00`);

    if (startAt.getTime() <= now) continue;

    const channelId = await resolveChannelId(session);

    if (hasTime) {
      const reminderAt = new Date(startAt.getTime() - REMINDER_MINUTES_BEFORE * 60 * 1000);
      if (reminderAt.getTime() > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: session.title,
            body: `Starting in ${REMINDER_MINUTES_BEFORE} minutes`,
            data: { source: SOURCE_TAG, sessionId: session.id, kind: "reminder" },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderAt, channelId },
        });
        count++;
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: session.title,
        body: hasTime ? "Starting now" : "Scheduled for today",
        data: { source: SOURCE_TAG, sessionId: session.id, kind: "start" },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: startAt, channelId },
    });
    count++;
  }

  return { permitted: true, scheduled: count };
}

/**
 * Fires a notification a few seconds out, through the same channel real reminders use.
 *
 * Reminders are inherently hard to verify — you schedule one and wait — so the Account screen
 * exposes this to prove the whole path (permission, channel, handler, delivery) end to end
 * without waiting for a real session to come due.
 */
export async function sendTestNotification(): Promise<boolean> {
  if (!(await requestNotificationPermissions())) return false;
  await ensureDefaultChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Reminders are working",
      body: "This is what a prep session reminder will look like.",
      data: { source: SOURCE_TAG, kind: "test" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: DEFAULT_CHANNEL_ID,
    },
  });
  return true;
}
