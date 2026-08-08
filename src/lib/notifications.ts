import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import RingtonePicker from "ringtone-picker";
import type { PrepSession } from "@/types";

const DEFAULT_CHANNEL_ID = "prep-session-default";
const REMINDER_MINUTES_BEFORE = 30;
const SOURCE_TAG = "prepSession";

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

export async function requestNotificationPermissions(): Promise<void> {
  await Notifications.requestPermissionsAsync();
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

/**
 * Cancels every reminder this app previously scheduled, then reschedules a fresh set from the
 * current session list. Re-running this after any create/complete/delete keeps reminders correct
 * without needing to track notification-id-to-session mappings across edits.
 */
export async function reconcilePrepSessionReminders(sessions: PrepSession[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.source === SOURCE_TAG)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const now = Date.now();

  for (const session of sessions) {
    if (session.completed_at || !session.scheduled_time) continue;

    const startAt = combineDateTime(session.scheduled_for, session.scheduled_time);
    if (startAt.getTime() <= now) continue;

    const channelId = await resolveChannelId(session);
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
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: session.title,
        body: "Starting now",
        data: { source: SOURCE_TAG, sessionId: session.id, kind: "start" },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: startAt, channelId },
    });
  }
}
