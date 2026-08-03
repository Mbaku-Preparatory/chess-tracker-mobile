import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { OpeningExplorer } from "./OpeningExplorer";
import type { OpeningStudySuggestion } from "@/types";

type ColorTab = "all" | "white" | "black";
const DEFAULT_VISIBLE = 5;

function scoreTier(score: number): "low" | "mid" | "high" {
  if (score < 40) return "low";
  if (score <= 55) return "mid";
  return "high";
}

function SuggestionRow({
  item,
  isOpen,
  onToggle,
}: {
  item: OpeningStudySuggestion;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const t = useTheme();
  const tier = scoreTier(item.score_percent);
  const barColor = tier === "low" ? t.danger : tier === "mid" ? t.warning : t.success;
  const badgeLabel = tier === "low" ? "Focus" : tier === "mid" ? "Improve" : "Solid";

  return (
    <View style={[st.row, { borderColor: t.border, backgroundColor: t.surface }, isOpen ? { borderBottomWidth: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8 } : { borderRadius: 8 }]}>
      <View style={[st.ecoBox, { backgroundColor: t.elevated }]}>
        <Text style={{ fontSize: 11, fontWeight: "800", color: t.textMuted }}>{item.eco_code}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.text }} numberOfLines={1}>{item.opening_name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Text style={{ fontSize: 11, color: t.textMuted }}>{item.color === "white" ? "White" : "Black"} · {item.games}g</Text>
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: t.elevated, overflow: "hidden" }}>
            <View style={{ width: `${Math.min(100, Math.max(0, item.score_percent))}%`, height: "100%", backgroundColor: barColor }} />
          </View>
          <Text style={{ fontSize: 10, color: t.textFaint }}>{Math.round(item.score_percent)}%</Text>
        </View>
      </View>
      <View style={[st.badge, { backgroundColor: tier === "low" ? t.dangerBg : tier === "mid" ? t.warningBg : t.successBg }]}>
        <Text style={{ fontSize: 9, fontWeight: "700", color: barColor }}>{badgeLabel}</Text>
      </View>
      <Pressable onPress={onToggle} style={[st.iconBtn, { borderColor: isOpen ? t.brand(300) : t.border }]}>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={14} color={isOpen ? t.brand(600) : t.textMuted} />
      </Pressable>
    </View>
  );
}

export function OpeningStudyPlan({ slug }: { slug: string }) {
  const t = useTheme();
  const [suggestions, setSuggestions] = useState<OpeningStudySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ColorTab>("all");
  const [expanded, setExpanded] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getOpeningStudies(slug, 50)
      .then((res) => setSuggestions(res.suggestions))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const filtered = tab === "all" ? suggestions : suggestions.filter((s) => s.color === tab);
  if (!loading && suggestions.length === 0) return null;
  const visible = expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE);

  return (
    <Card style={{ overflow: "hidden" }}>
      <View style={[st.header, { borderColor: t.border }]}>
        <View style={[st.headerIcon, { backgroundColor: t.brand(50) }]}>
          <Ionicons name="book-outline" size={16} color={t.brand(600)} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: t.text }}>Opening Studies</Text>
          <Text style={{ fontSize: 11, color: t.textMuted }}>Ranked by games played × room to improve</Text>
        </View>
      </View>

      <View style={[st.tabBar, { borderColor: t.border }]}>
        {(["all", "white", "black"] as ColorTab[]).map((tb) => {
          const count = tb === "all" ? suggestions.length : suggestions.filter((s) => s.color === tb).length;
          return (
            <Pressable key={tb} onPress={() => { setTab(tb); setExpanded(false); setOpenKey(null); }} style={[st.tabChip, tab === tb ? { backgroundColor: t.elevated } : null]}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: tab === tb ? t.text : t.textMuted }}>
                {tb.charAt(0).toUpperCase() + tb.slice(1)} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ padding: 12, gap: 6 }}>
        {loading ? (
          <ActivityIndicator color={t.brand(600)} />
        ) : filtered.length === 0 ? (
          <Text style={{ textAlign: "center", fontSize: 12, color: t.textFaint, paddingVertical: 16 }}>No suggestions for {tab === "all" ? "any color" : tab}.</Text>
        ) : (
          <>
            {visible.map((item, i) => {
              const key = `${item.eco_code}-${item.color}-${i}`;
              const isOpen = openKey === key;
              return (
                <View key={key}>
                  <SuggestionRow item={item} isOpen={isOpen} onToggle={() => setOpenKey(isOpen ? null : key)} />
                  {isOpen && (
                    <View style={[st.explorerWrap, { borderColor: t.brand(200), backgroundColor: t.elevated }]}>
                      <OpeningExplorer slug={slug} ecoCode={item.eco_code} openingName={item.opening_name} playerColor={item.color} />
                    </View>
                  )}
                </View>
              );
            })}
            {filtered.length > DEFAULT_VISIBLE && (
              <Pressable onPress={() => setExpanded((v) => !v)} style={[st.showMore, { borderColor: t.border }]}>
                <Text style={{ fontSize: 11, color: t.textMuted }}>{expanded ? "Show less" : `Show all ${filtered.length}`}</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerIcon: { height: 28, width: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  tabBar: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  tabChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, padding: 10 },
  ecoBox: { width: 38, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  badge: { borderRadius: 999, paddingHorizontal: 6, paddingVertical: 3 },
  iconBtn: { height: 26, width: 26, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  explorerWrap: { borderWidth: StyleSheet.hairlineWidth, borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  showMore: { borderWidth: StyleSheet.hairlineWidth, borderStyle: "dashed", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
});
