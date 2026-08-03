import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

import { requestTracker } from "@/lib/request-tracker";
import { useTheme } from "@/theme/ThemeContext";

export function GlobalLoader() {
  const t = useTheme();
  const [active, setActive] = useState(false);
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const unsub = requestTracker.subscribe(setActive);
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (!active) return;
    translateX.setValue(-1);
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [active, translateX]);

  if (!active) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.bar,
        {
          backgroundColor: t.brand(500),
          transform: [{ translateX: translateX.interpolate({ inputRange: [-1, 1], outputRange: ["-100%", "100%"] }) }],
        },
      ]}
    />
  );
}

const st = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 999,
  },
});
