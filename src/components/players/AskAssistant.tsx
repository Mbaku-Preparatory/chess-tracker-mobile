import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { shuffledFacts, type ChessFact } from "@/lib/chessFacts";

/**
 * Ask Mbaku about one opponent, answered from the games we hold on them.
 *
 * The thread is held server-side: we send a conversation id and the backend
 * replays the earlier turns, so a follow-up like "why did you say that?" has
 * something to refer back to. The client never tells the server what Mbaku said
 * last turn, which is what stops a forged assistant turn steering the answer.
 *
 * The suggested questions are the categories from AI-ASSISTANT-EVALS.md, and
 * the last one is deliberately unanswerable — we store no rating history, so
 * "what's their rating trend" should come back as a polite refusal. Keeping it
 * one tap away makes that easy to re-check as the prompt gets tuned.
 */

const BRAND = "#1a3a6b";

// Provisional — the backend carries the same name in ASSISTANT_NAME.
const ASSISTANT_NAME = "Mbaku";

const SUGGESTED = [
  "Which openings do they play most?",
  "Where do they score worst?",
  "Record against stronger opponents?",
  "How should I prepare against them?",
  "Rating trend over the last three years?",
];

// Matches QUESTION_MAX_LENGTH in players/services/assistant.py.
const MAX_QUESTION = 500;

// How long each fact stays up while Mbaku is thinking. Ten seconds reads
// comfortably — most answers arrive before the second fact, so a swap mid-read
// is the exception rather than something you fight.
const FACT_INTERVAL_MS = 10000;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Something to read while Mbaku thinks.
 *
 * A fifteen-second spinner reads as broken; the same wait with a fact reads as
 * work being done. Mounted only while a request is in flight, so the interval
 * is created and cleared with the wait rather than running all the time.
 */
function ThinkingFacts({ playerName }: { playerName?: string }) {
  const t = useTheme();
  // Shuffled once per wait, not per render — a new order each time you ask,
  // but stable while this particular answer is coming back.
  const facts = useRef<ChessFact[]>(shuffledFacts()).current;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % facts.length),
      FACT_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [facts.length]);

  return (
    <View style={[st.thinking, { backgroundColor: t.elevated }]}>
      <View style={st.thinkingHead}>
        <ActivityIndicator size="small" color={BRAND} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.textMuted }}>
          Reading {playerName ? `${playerName}'s` : "their"} games…
        </Text>
      </View>
      <View style={st.factDivider} />
      <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1, color: BRAND }}>
        DID YOU KNOW
      </Text>
      <Text style={{ fontSize: 13, lineHeight: 19, color: t.text }}>
        {facts[index].text}
      </Text>
    </View>
  );
}

interface AskAssistantProps {
  slug: string;
  playerName?: string;
}

export function AskAssistant({ slug, playerName }: AskAssistantProps) {
  const t = useTheme();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setQuestion("");
    setTurns((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const result = await api.askAboutPlayer(slug, trimmed, conversationId);
      setConversationId(result.conversation_id);
      setTurns((prev) => [...prev, { role: "assistant", content: result.answer }]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setTurns([]);
    setConversationId(null);
    setError(null);
  }

  const canSend = !loading && question.trim().length > 0;

  return (
    <View style={[st.card, { borderColor: t.border, backgroundColor: t.surface }]}>
      <View style={st.header}>
        <View style={st.headerIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.headerLabel}>ASK {ASSISTANT_NAME.toUpperCase()}</Text>
          <Text style={st.headerTitle} numberOfLines={1}>
            {playerName
              ? `${ASSISTANT_NAME} on ${playerName}`
              : `Ask ${ASSISTANT_NAME} about this player`}
          </Text>
        </View>
        {turns.length > 0 && (
          <Pressable onPress={reset} hitSlop={8}>
            <Text style={st.newChat}>New chat</Text>
          </Pressable>
        )}
      </View>

      <View style={st.body}>
        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <View key={i} style={st.userBubble}>
              <Text style={st.userText}>{turn.content}</Text>
            </View>
          ) : (
            <View key={i} style={[st.answer, { backgroundColor: t.elevated }]}>
              {/* Mbaku writes prose with blank lines between paragraphs. */}
              {turn.content
                .split(/\n{2,}/)
                .filter((p) => p.trim())
                .map((para, j) => (
                  <Text key={j} style={{ fontSize: 14, lineHeight: 21, color: t.text }}>
                    {para.trim()}
                  </Text>
                ))}
            </View>
          ),
        )}

        {loading && <ThinkingFacts playerName={playerName} />}

        {error && !loading && (
          <View style={[st.status, { backgroundColor: t.dangerBg }]}>
            <Text style={{ fontSize: 13, color: t.danger }}>{error}</Text>
          </View>
        )}

        {/* Locked while an answer is coming back. A second question sent
            mid-flight would race the first into the same thread and arrive in
            whichever order the two requests happened to finish — so the input
            says why it is closed rather than just ignoring the keystrokes. */}
        <TextInput
          value={question}
          onChangeText={(v) => setQuestion(v.slice(0, MAX_QUESTION))}
          placeholder={
            loading
              ? `${ASSISTANT_NAME} is thinking…`
              : turns.length
                ? "Ask a follow-up…"
                : `Ask ${ASSISTANT_NAME} — e.g. where do they score worst?`
          }
          placeholderTextColor={t.textMuted}
          // Multiline so a long question wraps and stays readable, but Enter
          // sends rather than inserting a newline — nobody writing a question
          // to a chatbot wants a second paragraph, and hunting for a send
          // button after every question gets old fast.
          multiline
          submitBehavior="submit"
          returnKeyType="send"
          onSubmitEditing={() => ask(question)}
          editable={!loading}
          style={[
            st.input,
            { borderColor: t.border, color: t.text, backgroundColor: t.elevated },
            loading && { opacity: 0.55 },
          ]}
        />

        <View style={st.actions}>
          <Text style={{ fontSize: 11, color: t.textMuted }}>
            {question.length}/{MAX_QUESTION}
          </Text>
          <Pressable
            onPress={() => ask(question)}
            disabled={!canSend}
            style={[st.submit, { opacity: canSend ? 1 : 0.5 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={st.submitText}>Ask</Text>
            )}
          </Pressable>
        </View>

        {turns.length === 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.chips}
          >
            {SUGGESTED.map((s) => (
              <Pressable
                key={s}
                onPress={() => ask(s)}
                disabled={loading}
                style={[
                  st.chip,
                  {
                    borderColor: t.border,
                    backgroundColor: t.elevated,
                    opacity: loading ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 12, color: t.textMuted }}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Text style={{ fontSize: 11, color: t.textMuted }}>
          Answered only from the games imported for this player.
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerIcon: {
    height: 36,
    width: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.7)",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  newChat: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  body: { padding: 16, gap: 12 },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    backgroundColor: BRAND,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  submit: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  chips: { gap: 8, paddingRight: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  status: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, padding: 14 },
  thinking: { borderRadius: 12, padding: 14, gap: 8 },
  thinkingHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  factDivider: { height: 1, backgroundColor: "rgba(127,127,127,0.18)", marginVertical: 2 },
  answer: {
    alignSelf: "flex-start",
    maxWidth: "95%",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 14,
    gap: 10,
  },
});
