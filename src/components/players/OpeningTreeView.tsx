import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ColorBadge, EcoBadge } from "@/components/ui/Badge";
import { GamesTable } from "./GamesTable";
import type { ColorChoice, Game, GameResult, GameSource, OpeningStat, PaginatedResponse } from "@/types";

interface FamilyGroup {
  family: string;
  totalGames: number;
  weightedScore: number | null;
  variations: OpeningStat[];
}

function deriveFamily(name: string): string {
  const idx = name.indexOf(":");
  return idx !== -1 ? name.slice(0, idx).trim() : name.trim();
}

function groupByFamily(stats: OpeningStat[]): FamilyGroup[] {
  const map = new Map<string, FamilyGroup>();
  for (const stat of stats) {
    const family = deriveFamily(stat.opening_name);
    if (!map.has(family)) map.set(family, { family, totalGames: 0, weightedScore: null, variations: [] });
    const g = map.get(family)!;
    g.totalGames += stat.games_count;
    g.variations.push(stat);
    if (stat.score_percent !== null) {
      g.weightedScore = (g.weightedScore ?? 0) + Number(stat.score_percent) * stat.games_count;
    }
  }
  for (const g of map.values()) {
    const scored = g.variations.filter((v) => v.score_percent !== null);
    const scoreCount = scored.reduce((s, v) => s + v.games_count, 0);
    if (g.weightedScore !== null && scoreCount > 0) g.weightedScore = g.weightedScore / scoreCount;
  }
  return Array.from(map.values()).sort((a, b) => b.totalGames - a.totalGames);
}

function ScoreBar({ score }: { score: number }) {
  const t = useTheme();
  const pct = Math.round(score);
  const color = pct >= 60 ? t.success : pct >= 45 ? t.warning : t.danger;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={[st.track, { backgroundColor: t.elevated }]}>
        <View style={[st.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={{ fontSize: 11, color: t.textMuted }}>{pct}%</Text>
    </View>
  );
}

function VariationRow({
  stat,
  slug,
  sourceFilter,
  resultFilter,
  yearFilter,
}: {
  stat: OpeningStat;
  slug: string;
  sourceFilter: GameSource | "";
  resultFilter: GameResult | "";
  yearFilter: string;
}) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [games, setGames] = useState<Game[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  async function loadGames(p = 1) {
    setLoading(true);
    try {
      const data: PaginatedResponse<Game> = await api.getPlayerGames(slug, {
        eco_code: stat.eco_code,
        color_played: stat.color_choice,
        ...(sourceFilter ? { source: sourceFilter } : {}),
        ...(resultFilter ? { result: resultFilter } : {}),
        ...(yearFilter ? { year: yearFilter } : {}),
        page: p,
      });
      setGames((prev) => (p === 1 ? data.results : [...(prev ?? []), ...data.results]));
      setTotal(data.count);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    setExpanded((v) => !v);
    if (!expanded && games === null) loadGames(1);
  }

  const variationLabel = (() => {
    const idx = stat.opening_name.indexOf(":");
    return idx !== -1 ? stat.opening_name.slice(idx + 1).trim() : stat.opening_name.trim();
  })();

  return (
    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.border }}>
      <Pressable onPress={handleToggle} style={st.varRow}>
        <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={14} color={t.textFaint} />
        <EcoBadge code={stat.eco_code} />
        <Text style={{ flex: 1, fontSize: 12, color: t.textMuted }} numberOfLines={1}>{variationLabel || stat.opening_name}</Text>
        <ColorBadge color={stat.color_choice} />
        <Text style={{ fontSize: 11, color: t.textFaint, width: 42, textAlign: "right" }}>{stat.games_count}g</Text>
        {stat.score_percent !== null && <ScoreBar score={Number(stat.score_percent)} />}
      </Pressable>

      {expanded && (
        <View style={{ padding: 10, backgroundColor: t.elevated }}>
          {loading && games === null ? (
            <ActivityIndicator color={t.brand(600)} />
          ) : games && games.length > 0 ? (
            <>
              <GamesTable games={games} />
              {total > games.length && (
                <Button title={loading ? "Loading…" : `Show more (${total - games.length})`} size="sm" variant="ghost" onPress={() => loadGames(page + 1)} disabled={loading} style={{ marginTop: 10, alignSelf: "center" }} />
              )}
            </>
          ) : (
            <Text style={{ fontSize: 12, color: t.textFaint }}>No games found.</Text>
          )}
        </View>
      )}
    </View>
  );
}

function FamilyRow({ group, slug, sourceFilter, resultFilter, yearFilter }: { group: FamilyGroup; slug: string; sourceFilter: GameSource | ""; resultFilter: GameResult | ""; yearFilter: string }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Card style={{ overflow: "hidden" }}>
      <Pressable onPress={() => setOpen((v) => !v)} style={st.familyHeader}>
        <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={16} color={t.textFaint} />
        <Text style={{ flex: 1, fontWeight: "700", color: t.text, fontSize: 14 }}>{group.family}</Text>
        <View style={[st.countPill, { backgroundColor: t.elevated }]}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: t.textMuted }}>{group.totalGames}g</Text>
        </View>
        {group.weightedScore !== null && <ScoreBar score={group.weightedScore} />}
      </Pressable>
      {open && group.variations.map((stat, idx) => (
        <VariationRow key={`${stat.color_choice}-${stat.eco_code}-${idx}`} stat={stat} slug={slug} sourceFilter={sourceFilter} resultFilter={resultFilter} yearFilter={yearFilter} />
      ))}
    </Card>
  );
}

const SOURCE_OPTIONS: { value: GameSource | ""; label: string }[] = [
  { value: "", label: "All sources" },
  { value: "chess_results", label: "OTB" },
  { value: "chess_com", label: "Chess.com" },
  { value: "lichess", label: "Lichess" },
  { value: "pgn_import", label: "PGN import" },
  { value: "manual", label: "Manual" },
];
const RESULT_OPTIONS: { value: GameResult | ""; label: string }[] = [
  { value: "", label: "All results" },
  { value: "win", label: "Wins" },
  { value: "draw", label: "Draws" },
  { value: "loss", label: "Losses" },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[st.chip, { backgroundColor: active ? t.brand(600) : t.elevated }]}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: active ? "#fff" : t.textMuted }}>{label}</Text>
    </Pressable>
  );
}

export function OpeningTreeView({ slug }: { slug: string }) {
  const t = useTheme();
  const [families, setFamilies] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorFilter, setColorFilter] = useState<"" | ColorChoice>("");
  const [sourceFilter, setSourceFilter] = useState<GameSource | "">("");
  const [resultFilter, setResultFilter] = useState<GameResult | "">("");
  const [openingSearch, setOpeningSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .getPlayerOpenings(slug, sourceFilter || undefined, resultFilter || undefined)
      .then((data) => setFamilies(groupByFamily(data)))
      .catch(() => setError("Could not load opening data."))
      .finally(() => setLoading(false));
  }, [slug, sourceFilter, resultFilter]);

  const needle = openingSearch.trim().toLowerCase();
  const filtered = families
    .map((f) => {
      let vars = f.variations;
      if (colorFilter) vars = vars.filter((v) => v.color_choice === colorFilter);
      if (needle) vars = vars.filter((v) => v.opening_name.toLowerCase().includes(needle) || v.eco_code.toLowerCase().includes(needle) || f.family.toLowerCase().includes(needle));
      return { ...f, variations: vars };
    })
    .filter((f) => f.variations.length > 0);

  const hasActiveFilters = Boolean(colorFilter || sourceFilter || resultFilter || openingSearch);

  return (
    <View>
      <TextInput
        value={openingSearch}
        onChangeText={setOpeningSearch}
        placeholder="Search openings… e.g. Sicilian, B12"
        placeholderTextColor={t.textFaint}
        style={[st.search, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
        {(["", "white", "black"] as const).map((c) => (
          <Chip key={c} label={c === "" ? "All colors" : c === "white" ? "As White" : "As Black"} active={colorFilter === c} onPress={() => setColorFilter(c)} />
        ))}
        <View style={[st.sep, { backgroundColor: t.border }]} />
        {RESULT_OPTIONS.map((r) => (
          <Chip key={r.value} label={r.label} active={resultFilter === r.value} onPress={() => setResultFilter(r.value)} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 12 }}>
        {SOURCE_OPTIONS.map((o) => (
          <Chip key={o.value} label={o.label} active={sourceFilter === o.value} onPress={() => setSourceFilter(o.value)} />
        ))}
      </ScrollView>

      {!loading && <Text style={{ fontSize: 11, color: t.textFaint, marginBottom: 10 }}>{filtered.length} opening family{filtered.length !== 1 ? "ies" : ""}</Text>}

      {error ? (
        <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
      ) : loading ? (
        <ActivityIndicator color={t.brand(600)} style={{ marginTop: 20 }} />
      ) : filtered.length > 0 ? (
        <View style={{ gap: 10 }}>
          {filtered.map((group) => (
            <FamilyRow key={group.family} group={group} slug={slug} sourceFilter={sourceFilter} resultFilter={resultFilter} yearFilter="" />
          ))}
        </View>
      ) : (
        <Text style={{ textAlign: "center", color: t.textFaint, fontSize: 13, paddingVertical: 40 }}>
          {hasActiveFilters ? "No opening data matches the current filters." : "No opening data yet. Import some games first."}
        </Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  search: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13 },
  chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  sep: { width: StyleSheet.hairlineWidth, height: 20, alignSelf: "center", marginHorizontal: 2 },
  track: { width: 50, height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  varRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  familyHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  countPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
