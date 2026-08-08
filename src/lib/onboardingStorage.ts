import AsyncStorage from "@react-native-async-storage/async-storage";

const SCHEDULE_INTRO_KEY = "schedule_intro_seen";

/**
 * One-time UI hints that must never reappear once dismissed.
 *
 * Read straight from AsyncStorage rather than through a hydrated cache like themeStorage, because
 * nothing renders on the first frame from these - a hint that appears a moment late is fine, and
 * it keeps app startup off the critical path.
 */
export const onboardingStorage = {
  async hasSeenScheduleIntro(): Promise<boolean> {
    return (await AsyncStorage.getItem(SCHEDULE_INTRO_KEY)) === "1";
  },
  async markScheduleIntroSeen(): Promise<void> {
    await AsyncStorage.setItem(SCHEDULE_INTRO_KEY, "1");
  },
};
