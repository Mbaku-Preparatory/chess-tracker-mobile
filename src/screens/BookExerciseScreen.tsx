import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { GameReplay } from "@/components/chess/GameReplay";
import { userMessage } from "@/lib/apiError";
import { getBookExercise, type ExerciseWithBook } from "@/lib/books";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";

type Props = NativeStackScreenProps<RootStackParamList, "BookExercise">;

const safe = (s: string) => s.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

/**
 * One exercise of a book, to solve, as on the web (components/books/
 * BookExerciseView.tsx there): the position from the diagram, the side to move
 * at the bottom, and the book's solution and notes once it is solved or given
 * up. Previous and next swap the exercise in place, so Back returns to the
 * book rather than through every exercise seen.
 */
export function BookExerciseScreen({ route, navigation }: Props) {
  const { publicId, number } = route.params;
  const t = useTheme();
  const [data, setData] = useState<ExerciseWithBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    getBookExercise(publicId, number)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(userMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [publicId, number]);

  const e = data?.exercise;
  if (!data || !e) {
    return (
      <View style={[st.center, { backgroundColor: t.bg }]}>
        {error || data ? (
          <Text style={{ color: error ? t.danger : t.textMuted, textAlign: "center" }}>{error ?? "This exercise was not found."}</Text>
        ) : (
          <ActivityIndicator color={t.brand(600)} />
        )}
      </View>
    );
  }

  const at = data.numbers.indexOf(e.number);
  const go = (i: number) => (i >= 0 && i < data.numbers.length ? () => navigation.setParams({ number: data.numbers[i] }) : null);
  const prev = go(at - 1);
  const next = go(at + 1);
  const toMove = e.fen.split(" ")[1] === "b" ? "black" : "white";
  const year = e.date.slice(0, 4).replace(/\?/g, "");
  const details = [data.title, e.white && e.black ? `${e.white} – ${e.black}` : null, e.event !== "?" ? e.event : null, year || null].filter(Boolean);

  return (
    <GameReplay
      // A fresh board, line and solve state for each exercise.
      key={e.number}
      pgn={e.pgn}
      orientation={toMove}
      solve
      players={{ white: { name: e.white || "White", rating: null }, black: { name: e.black || "Black", rating: null } }}
      filename={`${safe(e.white || "White")}_vs_${safe(e.black || "Black")}_${year || "unknown"}_exercise-${e.number}.pgn`}
      header={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: t.text, fontSize: 16 }}>Exercise {e.number}</Text>
            <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }} numberOfLines={2}>
              {details.join(" · ")}
            </Text>
            {!e.verified && <Text style={{ fontSize: 11, color: t.warning, marginTop: 2 }}>The book's solution stops early here</Text>}
          </View>
          <Pager icon="chevron-back" label="Previous exercise" onPress={prev} />
          <Text style={{ fontSize: 12, color: t.textFaint, fontVariant: ["tabular-nums"] }}>
            {at + 1} of {data.numbers.length}
          </Text>
          <Pager icon="chevron-forward" label="Next exercise" onPress={next} />
        </View>
      }
    />
  );
}

function Pager({ icon, label, onPress }: { icon: "chevron-back" | "chevron-forward"; label: string; onPress: (() => void) | null }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress ?? undefined}
      disabled={!onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={[st.pager, { borderColor: t.border, opacity: onPress ? 1 : 0.3 }]}
    >
      <Ionicons name={icon} size={18} color={t.textMuted} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  pager: { height: 36, width: 36, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
});
