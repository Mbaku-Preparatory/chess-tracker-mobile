import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, StyleSheet, Switch, Text, View } from "react-native";

import { RetroProgress } from "@/components/books/RetroProgress";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { deleteBook, isConverting, myBooks, type Book } from "@/lib/books";
import { bookOnWebUrl } from "@/lib/links";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";

const POLL_MS = 3000;

const n = (x: number) => x.toLocaleString("en");

function status(book: Book): string {
  if (book.status === "failed") return book.error || "This book could not be converted.";
  if (book.kind === "reader") {
    const part = book.readInPart ? ` · first ${n(book.pageCount)} of ${n(book.pdfPageCount)} pages` : "";
    return `Reader${part} · ${n(book.diagramCount)} diagrams · ${n(book.moveCount)} moves`;
  }
  return `${n(book.exerciseCount)} exercises · ${n(book.verifiedCount)} verified`;
}

function progressLabel(book: Book): string {
  if (book.progress === null) return "Opening the book…";
  if (book.pagesDone >= book.pageCount) return "Linking every move to its position…";
  return `Reading page ${n(book.pagesDone + 1)} of ${n(book.pageCount)}…`;
}

/**
 * Books, as on the web (/books): a chess book PDF in. A book of exercises
 * comes out as positions to solve here; any other book (a scan, usually)
 * becomes a reader, read on the website over the owner's own PDF. Private
 * to the account that uploaded it.
 */
export function BooksScreen() {
  const t = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // The same file uploaded again: not an error, but worth a word.
  const [already, setAlready] = useState<{ publicId: string; title: string; ready: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  // The upload in flight, so it can be cancelled (a 50 MB scan on a slow line).
  const uploadRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    try {
      setBooks(await myBooks());
      setError(null);
    } catch (err) {
      setError(userMessage(err));
    }
  }, []);

  // Fresh each time the tab is opened: a book may have finished meanwhile,
  // or been uploaded on the website.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // While a book converts, ask again every few seconds.
  const converting = books?.some(isConverting) ?? false;
  useEffect(() => {
    if (!converting) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [converting, load]);

  async function upload() {
    const picked = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    const file = picked.canceled ? null : picked.assets?.[0];
    if (!file) return;
    const controller = new AbortController();
    uploadRef.current = controller;
    setUploading(true);
    setError(null);
    setAlready(null);
    try {
      const result = await api.uploadBook(file, { notifyEmail }, controller.signal);
      if (result.duplicate) setAlready({ publicId: result.public_id, title: result.title, ready: result.status === "succeeded" });
      await load();
    } catch (err) {
      if (!controller.signal.aborted) setError(userMessage(err));
    } finally {
      uploadRef.current = null;
      setUploading(false);
      // The picker's copy, in the app's cache: a 50 MB scan need not stay there.
      try {
        new File(file.uri).delete();
      } catch {
        // already gone
      }
    }
  }

  function remove(book: Book) {
    // Cancelling a book still being read is deleting it: the worker stops
    // within a page (books/services/processing.py).
    const stopping = isConverting(book);
    Alert.alert(
      stopping ? `Stop reading “${book.title}”?` : `Delete “${book.title}”?`,
      stopping ? "What has been read so far is thrown away." : "Its exercises go with it. This can't be undone.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: stopping ? "Stop" : "Delete",
          style: "destructive",
          onPress: () => {
            deleteBook(book.publicId)
              .then(load)
              .catch((err) => setError(userMessage(err)));
          },
        },
      ],
    );
  }

  function open(book: Pick<Book, "publicId" | "kind">) {
    if (book.kind === "reader") void Linking.openURL(bookOnWebUrl(book.publicId));
    else navigation.navigate("Book", { publicId: book.publicId });
  }

  return (
    <Screen
      onRefresh={() => {
        setRefreshing(true);
        void load().finally(() => setRefreshing(false));
      }}
      refreshing={refreshing}
    >
      <Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>Books</Text>
      <Text style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
        Upload a chess book as a PDF. A book of exercises becomes positions to solve, with the book's solutions and notes.
        Any other book, scanned ones too, becomes a reader on the website, where every move opens on the board. Your books
        are private to you.
      </Text>

      <Card style={{ padding: 16, gap: 12, marginTop: 16 }}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Button title={uploading ? "Uploading…" : "Upload a PDF"} loading={uploading} onPress={() => void upload()} />
          {uploading && <Button title="Cancel" variant="secondary" onPress={() => uploadRef.current?.abort()} />}
        </View>
        <Text style={{ fontSize: 12, color: t.textFaint }}>Up to 50 MB.</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Switch
            value={notifyEmail}
            onValueChange={setNotifyEmail}
            trackColor={{ true: t.brand(600), false: t.border }}
            accessibilityLabel="Email me when it's ready"
          />
          <Text style={{ flex: 1, fontSize: 13, color: t.textMuted }}>
            Email me when it's ready. A scanned book takes a few minutes to read.
          </Text>
        </View>
        {error && <Text style={{ fontSize: 13, color: t.danger }}>{error}</Text>}
        {already && (
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: t.textMuted }}>
              You already have this book as “{already.title}”.{already.ready ? "" : " It is still being converted."}
            </Text>
            {already.ready && books?.some((b) => b.publicId === already.publicId) && (
              <Button
                title="Open it"
                variant="ghost"
                size="sm"
                onPress={() => open(books.find((b) => b.publicId === already.publicId)!)}
              />
            )}
          </View>
        )}
      </Card>

      <View style={{ marginTop: 16, gap: 12 }}>
        {books === null ? (
          error ? null : <CardSkeleton />
        ) : books.length === 0 ? (
          <Text style={{ fontSize: 13, color: t.textFaint }}>No books yet.</Text>
        ) : (
          books.map((book) => (
            <Card key={book.publicId} style={{ padding: 16, gap: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: t.text }}>{book.title}</Text>
              {isConverting(book) ? (
                <View style={{ gap: 4 }}>
                  <RetroProgress value={book.progress} label={progressLabel(book)} />
                  {book.progress !== null && (
                    <Text style={{ fontSize: 12, color: t.textFaint }}>
                      {book.notifyEmail
                        ? "You can leave this screen: we'll email you when it's done."
                        : "You can leave this screen and come back."}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={{ fontSize: 13, color: book.status === "failed" ? t.danger : t.textMuted }}>{status(book)}</Text>
              )}
              <View style={st.actions}>
                {book.status === "succeeded" && (
                  <>
                    <Button title={book.kind === "reader" ? "Read on the website" : "Open"} size="sm" onPress={() => open(book)} />
                    {book.kind === "exercises" && (
                      <Button
                        title="Download PGN"
                        variant="secondary"
                        size="sm"
                        onPress={() => void api.downloadBookPgn(book.publicId).catch((err) => setError(userMessage(err)))}
                      />
                    )}
                  </>
                )}
                <Button title={isConverting(book) ? "Cancel" : "Delete"} variant="ghost" size="sm" onPress={() => remove(book)} />
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
