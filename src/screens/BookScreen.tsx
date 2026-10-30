import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { getBook, type BookDetail, type BookExerciseSummary } from "@/lib/books";
import { bookOnWebUrl } from "@/lib/links";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";

type Props = NativeStackScreenProps<RootStackParamList, "Book">;

const TILE = 52;
const GAP = 6;
const PADDING = 16;

const n = (x: number) => x.toLocaleString("en");

/**
 * An exercise book, as on the web (components/books/BookExercises.tsx there):
 * what came out of it, what the book itself got wrong, and every exercise to
 * open. A reader book is read on the website.
 */
export function BookScreen({ route, navigation }: Props) {
  const { publicId } = route.params;
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [book, setBook] = useState<BookDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBook(publicId)
      .then((b) => !cancelled && setBook(b))
      .catch((err) => !cancelled && setError(userMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  if (error || book === null || (book && book.status !== "succeeded")) {
    return (
      <Screen>
        <Text style={{ color: error ? t.danger : t.textMuted, textAlign: "center", marginTop: 40 }}>
          {error ?? "This book is not ready yet."}
        </Text>
      </Screen>
    );
  }
  if (book === undefined) {
    return (
      <Screen>
        <CardSkeleton />
      </Screen>
    );
  }

  if (book.kind === "reader") {
    return (
      <Screen>
        <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>{book.title}</Text>
        <Text style={{ fontSize: 14, color: t.textMuted, marginTop: 8 }}>
          This book is read on the website, over your own copy of the PDF: every move in it opens on the board.
        </Text>
        <Button title="Read on the website" onPress={() => void Linking.openURL(bookOnWebUrl(book.publicId))} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const columns = Math.max(1, Math.floor((width - 2 * PADDING + GAP) / (TILE + GAP)));
  const stopped = book.exercises.filter((e) => !e.verified);
  const first = book.exercises[0]?.number;
  const openExercise = (number: number) => navigation.navigate("BookExercise", { publicId, number });

  const header = (
    <View style={{ gap: 12, marginBottom: 16 }}>
      <View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>{book.title}</Text>
        <Text style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>
          {n(book.exerciseCount)} exercises · {n(book.verifiedCount)} verified
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {first !== undefined && <Button title="Start solving" onPress={() => openExercise(first)} />}
        <Button
          title="Download PGN"
          variant="secondary"
          onPress={() => void api.downloadBookPgn(publicId).catch((err) => setError(userMessage(err)))}
        />
      </View>

      {/* What the conversion found in the book itself, said plainly: a reader
          who meets exercise 11 should know it is the book, not us. */}
      {(book.renumbered.length > 0 || stopped.length > 0 || book.missingSolutions.length > 0) && (
        <View style={[st.notes, { backgroundColor: t.warningBg }]}>
          {book.renumbered.length > 0 && (
            <Text style={[st.note, { color: t.text }]}>
              • The book misprints {book.renumbered.length === 1 ? "an exercise number" : `${book.renumbered.length} exercise numbers`};
              corrected from the numbering: {book.renumbered.map(([printed, actual]) => `${printed} → ${actual}`).join(", ")}.
            </Text>
          )}
          {stopped.length > 0 && (
            <Text style={[st.note, { color: t.text }]}>
              • In {stopped.length === 1 ? "one exercise" : `${stopped.length} exercises`} the book's solution has a move its own diagram does
              not allow, so the solution stops there and the rest is kept as a note: {stopped.map((e) => `#${e.number}`).join(", ")}.
            </Text>
          )}
          {book.missingSolutions.length > 0 && (
            <Text style={[st.note, { color: t.text }]}>
              • No solution was found for: {book.missingSolutions.map((x) => `#${x}`).join(", ")}.
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const tile = ({ item: e }: { item: BookExerciseSummary }) => (
    <Pressable
      onPress={() => openExercise(e.number)}
      accessibilityLabel={[`Exercise ${e.number}`, e.white && e.black ? `${e.white} – ${e.black}` : "", e.verified ? "" : "solution stops early"]
        .filter(Boolean)
        .join(", ")}
      style={({ pressed }) => [
        st.tile,
        { backgroundColor: e.verified ? t.elevated : t.warningBg, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={{ fontSize: 14, color: e.verified ? t.text : t.warning, fontVariant: ["tabular-nums"] }}>{e.number}</Text>
    </Pressable>
  );

  // A list, not a page of views: a book can hold over a thousand exercises.
  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        key={columns}
        data={book.exercises}
        keyExtractor={(e) => String(e.number)}
        numColumns={columns}
        renderItem={tile}
        ListHeaderComponent={header}
        columnWrapperStyle={columns > 1 ? { gap: GAP } : undefined}
        contentContainerStyle={{ padding: PADDING, paddingBottom: 40, gap: GAP }}
        initialNumToRender={columns * 14}
      />
    </Screen>
  );
}

const st = StyleSheet.create({
  notes: { borderRadius: 12, padding: 12, gap: 6 },
  note: { fontSize: 13, lineHeight: 19 },
  tile: { width: TILE, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
