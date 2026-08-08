import { NativeModule, requireNativeModule } from "expo";
import { Platform } from "react-native";

export interface PickedRingtone {
  uri: string;
  title: string;
}

declare class RingtonePickerNativeModule extends NativeModule<Record<string, never>> {
  pickRingtone(): Promise<PickedRingtone | null>;
  ensureNotificationChannel(channelId: string, name: string, soundUri: string): Promise<null>;
}

// Android-only: no iOS implementation exists (see expo-module.config.json), and a static
// requireNativeModule() call throws immediately if the native module isn't registered - so this
// must be guarded exactly like the datetimepicker web-crash fix in SessionNewScreen.tsx.
const RingtonePicker: RingtonePickerNativeModule | null =
  Platform.OS === "android" ? requireNativeModule<RingtonePickerNativeModule>("RingtonePicker") : null;

export default RingtonePicker;
