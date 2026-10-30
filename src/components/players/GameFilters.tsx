import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SearchInput } from "@/components/ui/SearchInput";
import { GAME_SOURCES } from "@/lib/games";
import { useTheme } from "@/theme/ThemeContext";
import type { ColorChoice, GameResult, GameSource } from "@/types";

/**
 * The filter chips over a player's games: colour, result, source, and (where
 * the list supports them) year and opponent rating, with a search box. The
 * games list and the opening tree both use it, so a filter added here appears
 * in both, as in the web app's GameFilters.
 */

export interface GameFilterValues {
  color: ColorChoice | "";
  result: GameResult | "";
  source: GameSource | "";
  year: string;
  /** An opponent-rating band, "<min>-<max>"; either side may be blank. */
  rating: string;
  search: string;
}

export const NO_FILTERS: GameFilterValues = { color: "", result: "", source: "", year: "", rating: "", search: "" };

export const hasFilters = (f: GameFilterValues) => Object.values(f).some(Boolean);

/** The rating band as the games endpoint's min_rating / max_rating. */
export function ratingParams(band: string): { min_rating?: string; max_rating?: string } {
  if (!band) return {};
  const [min, max] = band.split("-");
  return { ...(min ? { min_rating: min } : {}), ...(max ? { max_rating: max } : {}) };
}

const RESULT_OPTIONS: { value: GameResult | ""; label: string }[] = [
  { value: "", label: "All results" },
  { value: "win", label: "Wins" },
  { value: "draw", label: "Draws" },
  { value: "loss", label: "Losses" },
];

const SOURCE_OPTIONS: { value: GameSource | ""; label: string }[] = [
  { value: "", label: "All sources" },
  ...(Object.keys(GAME_SOURCES) as GameSource[]).map((s) => ({ value: s, label: GAME_SOURCES[s].label })),
];

const CURRENT_YEAR = new Date().getFullYear();
// The last few years: a phone has room for chips, not a long menu.
const YEAR_OPTIONS = [
  { value: "", label: "All years" },
  ...Array.from({ length: 7 }, (_, i) => String(CURRENT_YEAR - i)).map((y) => ({ value: y, label: y })),
];

const RATING_OPTIONS = [
  { value: "", label: "All ratings" },
  { value: "-1599", label: "<1600" },
  { value: "1600-1799", label: "1600–1799" },
  { value: "1800-1999", label: "1800–1999" },
  { value: "2000-2199", label: "2000–2199" },
  { value: "2200-2399", label: "2200–2399" },
  { value: "2400-", label: "2400+" },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[st.chip, { backgroundColor: active ? t.brand(600) : t.elevated }]}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: active ? "#fff" : t.textMuted }}>{label}</Text>
    </Pressable>
  );
}

function Row({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: first ? 10 : 0, paddingBottom: 10 }}>
      {children}
    </ScrollView>
  );
}

export function GameFilters({
  value,
  onChange,
  showYear = false,
  showRating = false,
  searchPlaceholder,
  count,
}: {
  value: GameFilterValues;
  onChange: (next: GameFilterValues) => void;
  /** Year and opponent-rating chips, for lists the server can filter that way. */
  showYear?: boolean;
  showRating?: boolean;
  searchPlaceholder: string;
  /** "12 games", under the chips; left out while loading. */
  count?: string;
}) {
  const t = useTheme();
  const set = <K extends keyof GameFilterValues>(key: K, v: GameFilterValues[K]) => onChange({ ...value, [key]: v });
  const sep = <View style={[st.sep, { backgroundColor: t.border }]} />;

  return (
    <View>
      <SearchInput placeholder={searchPlaceholder} defaultValue={value.search} onSearch={(q) => set("search", q)} />

      <Row first>
        {(["", "white", "black"] as const).map((c) => (
          <Chip key={c} label={c === "" ? "All colors" : c === "white" ? "As White" : "As Black"} active={value.color === c} onPress={() => set("color", c)} />
        ))}
        {sep}
        {RESULT_OPTIONS.map((r) => (
          <Chip key={r.value} label={r.label} active={value.result === r.value} onPress={() => set("result", r.value)} />
        ))}
      </Row>

      <Row>
        {SOURCE_OPTIONS.map((o) => (
          <Chip key={o.value} label={o.label} active={value.source === o.value} onPress={() => set("source", o.value)} />
        ))}
        {showYear && sep}
        {showYear &&
          YEAR_OPTIONS.map((o) => <Chip key={o.value} label={o.label} active={value.year === o.value} onPress={() => set("year", o.value)} />)}
      </Row>

      {showRating && (
        <Row>
          {RATING_OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} active={value.rating === o.value} onPress={() => set("rating", o.value)} />
          ))}
        </Row>
      )}

      {count !== undefined && <Text style={{ fontSize: 11, color: t.textFaint, marginBottom: 10 }}>{count}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  sep: { width: StyleSheet.hairlineWidth, height: 20, alignSelf: "center", marginHorizontal: 2 },
});
