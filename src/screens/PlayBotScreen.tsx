import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SvgUri } from "react-native-svg";

import { BotGame } from "@/components/bot/BotGame";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ELO_MIN } from "@/hooks/useBotEngine";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { avatarUrl, defaultAvatar } from "@/lib/avatars";
import { LevelBook } from "@/lib/bot/levelBook";
import type { RootStackParamList } from "@/navigation/types";
import { useAppSelector } from "@/redux/hooks";
import { useTheme } from "@/theme/ThemeContext";
import type { BotBookGame, PlayerDetail } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "PlayBot">;
type Color = "white" | "black";

/** The strength's top. The engine goes higher, but nobody we scout does. */
const ELO_MAX = 2900;
const ELO_STEP = 50;
/** An unrated player's bot starts here. */
const UNRATED_ELO = 1500;
/** Fewer games than this, and the bot leaves the book early: say so. */
const FEW_GAMES = 5;

const clampElo = (elo: number) => Math.min(ELO_MAX, Math.max(ELO_MIN, elo));
const other = (c: Color): Color => (c === "white" ? "black" : "white");
const cap = (c: Color) => c[0].toUpperCase() + c.slice(1);

/**
 * "Play <player> bot", as on the web (components/bot/PlayBotView there): pick
 * your colour and a strength (their rating to start), then play a bot that
 * opens the way they do in that colour.
 */
export function PlayBotScreen({ route }: Props) {
  const { slug } = route.params;
  const t = useTheme();
  const email = useAppSelector((s) => s.auth.email);
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [books, setBooks] = useState<Record<Color, BotBookGame[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The bot's colour.
  const [color, setColor] = useState<Color>("white");
  const [elo, setElo] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  // Off while a finger is on the board (BotGame's onBoardTouch).
  const [scrollable, setScrollable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getPlayerDetail(slug), api.getBotBook(slug, "white"), api.getBotBook(slug, "black")])
      .then(([p, white, black]) => {
        if (cancelled) return;
        setPlayer(p);
        setBooks({ white: white.games, black: black.games });
        // The bot starts on the colour they have more games in.
        setColor(black.games.length > white.games.length ? "black" : "white");
      })
      .catch((err) => !cancelled && setError(userMessage(err, "Couldn't load this player's games.")));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Each colour's book, built a slice at a time from the moment the games
  // arrive (lib/bot/levelBook.ts): while someone reads this screen and picks
  // a colour, the first levels are done, and the bot's first move does not
  // wait for them. The rest carries on during the game.
  const levelBooks = useMemo(() => (books ? { white: new LevelBook(books.white), black: new LevelBook(books.black) } : null), [books]);
  useEffect(() => {
    if (!levelBooks) return;
    const book = levelBooks[color];
    let timer: ReturnType<typeof setTimeout>;
    const slice = () => {
      if (book.work(15)) timer = setTimeout(slice, 30);
    };
    timer = setTimeout(slice, 0);
    return () => clearTimeout(timer);
  }, [levelBooks, color]);

  if (error) {
    return (
      <Screen>
        <Text style={{ color: t.danger, textAlign: "center", marginTop: 40 }}>{error}</Text>
      </Screen>
    );
  }
  if (!player || !books) {
    return (
      <Screen>
        <CardSkeleton />
      </Screen>
    );
  }

  const name = player.full_name;
  const rating = player.standard_rating ?? player.rapid_rating ?? player.blitz_rating ?? null;
  const defaultElo = clampElo(rating ?? UNRATED_ELO);
  const strength = elo ?? defaultElo;
  const games = books[color];
  const botAvatar = avatarUrl(defaultAvatar(player.public_id));
  const youAvatar = avatarUrl(defaultAvatar(email ?? "you"));

  if (playing) {
    // The page scrolls (the game is taller than a small phone), except while
    // a finger is on the board, so a dragged piece moves the piece.
    return (
      <Screen scroll={false}>
        <ScrollView scrollEnabled={scrollable} contentContainerStyle={{ paddingBottom: 24 }}>
        <BotGame
          // A new choice is a new game.
          key={`${color}-${strength}`}
          botName={name}
          botRating={rating}
          youName="You"
          botColor={color}
          games={games}
          book={levelBooks![color]}
          elo={strength}
          botAvatarUrl={botAvatar}
          youAvatarUrl={youAvatar}
          onBoardTouch={(touching) => setScrollable(!touching)}
        />
        <Button title="Change colour or strength" variant="ghost" size="sm" onPress={() => setPlaying(false)} style={{ marginTop: 8 }} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <View style={[st.avatar, { backgroundColor: t.elevated }]}>
          <SvgUri uri={botAvatar} width={56} height={56} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>Play {name} bot</Text>
          <Text style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>
            It opens the way {name} does, move for move from their games, then plays at the strength you choose.
          </Text>
        </View>
      </View>

      <Card style={{ padding: 16, gap: 16, marginTop: 12 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: t.text }}>You play</Text>
          <View style={[st.segment, { backgroundColor: t.elevated }]} accessibilityRole="radiogroup">
            {(["white", "black"] as Color[]).map((c) => {
              // The bot plays the other colour, so its book is that side's games.
              const active = color === other(c);
              return (
                <Pressable
                  key={c}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => setColor(other(c))}
                  style={[st.segmentItem, active ? { backgroundColor: t.surface } : null]}
                >
                  <View style={[st.swatch, { backgroundColor: c === "white" ? "#ffffff" : "#1f2937", borderColor: c === "white" ? "#d1d5db" : "#4b5563" }]} />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: active ? t.text : t.textMuted }}>{cap(c)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ fontSize: 12, color: t.textFaint }}>
            {games.length} of their games as {cap(color)}
          </Text>
        </View>

        {games.length === 0 ? (
          <Text style={{ fontSize: 13, color: t.textMuted }}>
            None of {name}'s games as {cap(color)} have moves we can read. Import games to build this side of the bot.
          </Text>
        ) : (
          <>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: t.text }}>Bot strength</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Button title="−" variant="secondary" disabled={strength <= ELO_MIN} onPress={() => setElo(clampElo(strength - ELO_STEP))} />
                <Text style={{ fontSize: 26, fontWeight: "800", color: t.text, minWidth: 80, textAlign: "center" }} accessibilityLabel={`Bot strength ${strength}`}>
                  {strength}
                </Text>
                <Button title="+" variant="secondary" disabled={strength >= ELO_MAX} onPress={() => setElo(clampElo(strength + ELO_STEP))} />
                {strength !== defaultElo && <Button title="Reset" variant="ghost" size="sm" onPress={() => setElo(null)} />}
              </View>
              <Text style={{ fontSize: 12, color: t.textFaint }}>
                {rating ? `${name}'s FIDE rating: ${rating}` : `${name} has no FIDE rating, so the bot starts at ${UNRATED_ELO}`}
                {rating !== null && rating < ELO_MIN ? `. The engine plays no weaker than ${ELO_MIN}.` : ""}
              </Text>
              {games.length < FEW_GAMES && (
                <Text style={{ fontSize: 12, color: t.warning }}>
                  Only {games.length} {games.length === 1 ? "game" : "games"} as {cap(color)}, so the bot will leave {name}'s moves early.
                </Text>
              )}
            </View>
            <Button title={`Play as ${cap(other(color))}`} onPress={() => setPlaying(true)} />
          </>
        )}
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  avatar: { width: 56, height: 56, borderRadius: 28, overflow: "hidden" },
  segment: { flexDirection: "row", borderRadius: 10, padding: 4, gap: 4, alignSelf: "flex-start" },
  segmentItem: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  swatch: { width: 12, height: 12, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
});
