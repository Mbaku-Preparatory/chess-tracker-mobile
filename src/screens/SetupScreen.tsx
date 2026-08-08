import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { addOpening, completeOnboarding, removeOpening, saveRepertoire, type RepertoireOpening, type RepertoireSection } from "@/redux/actions/repertoire";
import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { RootStackParamList } from "@/navigation/types";
import type { OpeningResult } from "@/types";
import Logo from "../components/ui/Logo";

type Props = NativeStackScreenProps<RootStackParamList, "Setup">;

const SECTIONS: { key: RepertoireSection; label: string; hint: string }[] = [
  { key: "white", label: "As White", hint: "Your preferred openings with the white pieces" },
  { key: "black", label: "As Black", hint: "Your preferred openings with the black pieces" },
];

function OpeningChip({ opening, onRemove }: { opening: RepertoireOpening; onRemove: () => void }) {
  const t = useTheme();
  return (
    <View style={[st.chip, { borderColor: t.brand(200), backgroundColor: t.brand(50) }]}>
      <Text style={{ fontSize: 10, fontFamily: "monospace", color: t.brand(500) }}>{opening.eco_code}</Text>
      <Text style={{ fontSize: 12, fontWeight: "600", color: t.brand(700), maxWidth: 140 }} numberOfLines={1}>{opening.name}</Text>
      <Pressable onPress={onRemove}>
        <Ionicons name="close" size={13} color={t.brand(400)} />
      </Pressable>
    </View>
  );
}

function OpeningSearchSection({ section, label, hint, selected }: { section: RepertoireSection; label: string; hint: string; selected: RepertoireOpening[] }) {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpeningResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(v: string) {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v.trim() || v.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchOpenings(v, 15);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleSelect(result: OpeningResult) {
    dispatch(addOpening({ section, opening: result as RepertoireOpening }));
    setQuery("");
    setResults([]);
  }

  const isSelected = (slug: string) => selected.some((o) => o.slug === slug);

  return (
    <Card style={{ padding: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: t.text }}>{label}</Text>
      <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{hint}</Text>

      {selected.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {selected.map((o) => (
            <OpeningChip key={o.slug} opening={o} onRemove={() => dispatch(removeOpening({ section, slug: o.slug }))} />
          ))}
        </View>
      )}

      {selected.length >= 5 && (
        <Text style={{ fontSize: 11, color: t.warning, marginTop: 8 }}>Keep it focused — 2–3 main openings per colour gives the best prep quality.</Text>
      )}

      <View style={{ marginTop: 12 }}>
        <TextInput
          value={query}
          onChangeText={handleChange}
          placeholder={`Search openings — e.g. "Sicilian"`}
          placeholderTextColor={t.textFaint}
          style={[st.input, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
        />
        {loading && <ActivityIndicator size="small" color={t.brand(600)} style={{ marginTop: 8 }} />}
        {!loading && results.length > 0 && (
          <View style={[st.results, { borderColor: t.border, backgroundColor: t.surface }]}>
            {results.map((r) => {
              const picked = isSelected(r.slug);
              return (
                <Pressable key={r.slug} onPress={() => !picked && handleSelect(r)} disabled={picked} style={[st.resultRow, { borderColor: t.border }]}>
                  <Text style={{ fontFamily: "monospace", fontSize: 10, color: t.textMuted, width: 34 }}>{r.eco_code}</Text>
                  <Text style={{ fontSize: 12, color: picked ? t.textFaint : t.text, flex: 1 }} numberOfLines={1}>{r.name}</Text>
                  {picked && <Text style={{ fontSize: 10, color: t.brand(500) }}>Selected</Text>}
                </Pressable>
              );
            })}
          </View>
        )}
        {!loading && results.length === 0 && query.trim().length >= 2 && (
          <Text style={{ fontSize: 12, color: t.textFaint, marginTop: 8 }}>No openings found for &quot;{query}&quot;</Text>
        )}
      </View>
    </Card>
  );
}

export function SetupScreen({ navigation }: Props) {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const { white, black, onboardingComplete: isEditing, saving } = useAppSelector((s) => s.repertoire);
  const totalSelected = white.length + black.length;

  async function handleContinue() {
    dispatch(completeOnboarding());
    await dispatch(saveRepertoire());
    if (isEditing) navigation.goBack();
    else navigation.replace("MainTabs");
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: 60 }}>
      <View style={{ alignItems: "center", marginBottom: 20, paddingHorizontal: 20 }}>
        <Logo size={48} style={{ marginBottom: 12 }} />
        <Text style={{ fontSize: 20, fontWeight: "800", color: t.text, textAlign: "center" }}>Build your repertoire</Text>
        <Text style={{ fontSize: 13, color: t.textMuted, marginTop: 6, textAlign: "center" }}>
          Pick 2–3 main openings per colour. This personalises your scouting reports.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, flex: 1 }}>
        <View style={[st.counter, { backgroundColor: t.elevated }]}>
          <Text style={{ fontSize: 12, color: t.textMuted }}>
            {totalSelected === 0 ? "Select at least one opening to continue" : `${totalSelected} opening${totalSelected !== 1 ? "s" : ""} selected`}
          </Text>
        </View>

        <View style={{ gap: 14, marginTop: 14 }}>
          {SECTIONS.map(({ key, label, hint }) => (
            <OpeningSearchSection key={key} section={key} label={label} hint={hint} selected={key === "white" ? white : black} />
          ))}
        </View>

        <Button
          title={saving ? "Saving…" : totalSelected > 0 ? (isEditing ? "Save repertoire" : "Continue to Mbaku Preparatory") : "Select at least one opening"}
          onPress={handleContinue}
          disabled={totalSelected === 0 || saving}
          loading={saving}
          fullWidth
          style={{ marginTop: 20, marginBottom: 30 }}
        />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  counter: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13 },
  results: { marginTop: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, maxHeight: 240, overflow: "hidden" },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
});
