import { useState } from "react";
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

/**
 * Ask a question about one opponent, answered from the games we hold on them.
 *
 * The suggested questions are the categories from AI-ASSISTANT-EVALS.md, and
 * the last one is deliberately unanswerable — we store no rating history, so
 * "what's their rating trend" should come back as a polite refusal. Keeping it
 * one tap away makes that easy to re-check as the prompt gets tuned.
 */

const BRAND = "#1a3a6b";

const SUGGESTED = [
  "Which openings do they play most?",
  "Where do they score worst?",
  "Record against stronger opponents?",
  "How should I prepare against them?",
  "Rating trend over the last three years?",
];

// Matches QUESTION_MAX_LENGTH in players/services/assistant.py.
const MAX_QUESTION = 500;

interface AskAssistantProps {
  slug: string;
  playerName?: string;
}

export function AskAssistant({ slug, playerName }: AskAssistantProps) {
  const t = useTheme();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setAsked(trimmed);

    try {
      const result = await api.askAboutPlayer(slug, trimmed);
      setAnswer(result.answer);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const canSend = !loading && question.trim().length > 0;

  return (
    <View style={[st.card, { borderColor: t.border, backgroundColor: t.surface }]}>
      <View style={st.header}>
        <View style={st.headerIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.headerLabel}>ASK THE ASSISTANT</Text>
          <Text style={st.headerTitle} numberOfLines={1}>
            {playerName ? `Questions about ${playerName}` : "Ask about this player"}
          </Text>
        </View>
      </View>

      <View style={st.body}>
        <TextInput
          value={question}
          onChangeText={(v) => setQuestion(v.slice(0, MAX_QUESTION))}
          placeholder="e.g. which opening do they score worst with?"
          placeholderTextColor={t.textMuted}
          multiline
          editable={!loading}
          style={[
            st.input,
            { borderColor: t.border, color: t.text, backgroundColor: t.elevated },
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.chips}
        >
          {SUGGESTED.map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setQuestion(s);
                ask(s);
              }}
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

        {loading && (
          <View style={[st.status, { backgroundColor: t.elevated }]}>
            <ActivityIndicator size="small" color={BRAND} />
            <Text style={{ fontSize: 13, color: t.textMuted }}>
              Reading {playerName ? `${playerName}'s` : "their"} games…
            </Text>
          </View>
        )}

        {error && !loading && (
          <View style={[st.status, { backgroundColor: t.dangerBg }]}>
            <Text style={{ fontSize: 13, color: t.danger }}>{error}</Text>
          </View>
        )}

        {answer && !loading && (
          <View style={{ gap: 8 }}>
            {asked && (
              <Text style={{ fontSize: 13, fontWeight: "700", color: t.text }}>
                {asked}
              </Text>
            )}
            {/* The model separates paragraphs with blank lines; render them as
                paragraphs rather than one unbroken block. */}
            <View style={[st.answer, { backgroundColor: t.elevated }]}>
              {answer
                .split(/\n{2,}/)
                .filter((p) => p.trim())
                .map((para, i) => (
                  <Text key={i} style={{ fontSize: 14, lineHeight: 21, color: t.text }}>
                    {para.trim()}
                  </Text>
                ))}
            </View>
            <Text style={{ fontSize: 11, color: t.textMuted }}>
              Answered only from the games imported for this player.
            </Text>
          </View>
        )}
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
  body: { padding: 16, gap: 12 },
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
  answer: { borderRadius: 12, padding: 14, gap: 10 },
});
