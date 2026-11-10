import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";

import { usePreferences } from "@/components/PreferencesProvider";
import { useTheme } from "@/theme/ThemeContext";

/**
 * "Email me when it's done", for work that runs on the server: book reading,
 * big imports. Offered next to the button, because the decision belongs with
 * the tap that starts it.
 */
export function NotifyMeSwitch({
  value,
  onValueChange,
  label,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label: string;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: t.brand(600), false: t.border }}
        accessibilityLabel="Email me when it's done"
      />
      <Text style={{ flex: 1, fontSize: 13, color: t.textMuted }}>{label}</Text>
    </View>
  );
}

/**
 * The switch's state for an import. Starts as Settings says ("Email me when
 * an import finishes"); flipping it changes only this import. Same as the
 * web's useNotifyMe.
 */
export function useNotifyMe() {
  const { preferences, loaded } = usePreferences();
  const [value, setValue] = useState(preferences.import_emails);
  useEffect(() => {
    if (loaded) setValue(preferences.import_emails);
  }, [loaded, preferences.import_emails]);
  return [value, setValue] as const;
}
