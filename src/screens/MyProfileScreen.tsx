/**
 * My profile — the signed-in user as a player, rather than as an account.
 *
 * Deliberately not a second copy of PlayerDetailScreen. Everything statistical
 * already lives there and works on this record unchanged, because a user's own
 * profile *is* an ordinary player row. What this screen adds is the three
 * things only true of yourself: getting your FIDE ID in, watching your first
 * import arrive, and asking Mbaku about your own play.
 *
 * The deep screens (games, prep) are pushes, not duplicates.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader, SectionContainer } from "@/components/ui/SectionContainer";
import { StatStrip } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { AskAssistant } from "@/components/players/AskAssistant";
import type { ImportJob, MyPlayer } from "@/types";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "MyProfile">;

/** Statuses in which the worker still has something to do for us. */
const IN_FLIGHT = ["pending", "running"];

function isInFlight(job: ImportJob | null): boolean {
  return !!job && IN_FLIGHT.includes(job.status);
}

export default function MyProfileScreen({ navigation }: Props) {
  const t = useTheme();

  const [me, setMe] = useState<MyPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fideInput, setFideInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setMe(await api.getMyPlayer());
      setError(null);
    } catch (err) {
      setError(userMessage(err, "Couldn't load your profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll only while the worker is actually working. An interval left running
  // after the job finished is a battery cost nobody asked for, on a device
  // where that is felt.
  const job = me?.import_job ?? null;
  const inFlight = isInFlight(job);
  const jobIdRef = useRef<string | null>(null);
  jobIdRef.current = job?.id ?? null;

  useEffect(() => {
    if (!inFlight) return;
    const timer = setInterval(async () => {
      const id = jobIdRef.current;
      if (!id) return;
      try {
        const fresh = await api.getImportJob(id);
        setMe((prev) => (prev ? { ...prev, import_job: fresh } : prev));
        if (!isInFlight(fresh)) load();
      } catch {
        // The next tick retries; the job is safe in the database either way.
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [inFlight, load]);

  async function saveFideId() {
    const value = fideInput.trim();
    if (!value || saving) return;
    setSaving(true);
    setError(null);
    try {
      setMe(await api.setMyFideId(value));
      setFideInput("");
    } catch (err) {
      setError(userMessage(err, "Couldn't save that FIDE ID."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <CardSkeleton />
      </Screen>
    );
  }

  if (!me) {
    return (
      <Screen>
        <Text style={{ color: t.danger, fontSize: 13 }}>
          {error ?? "Couldn't load your profile."}
        </Text>
      </Screen>
    );
  }

  const player = me.player;
  const gamesCount = player.games_count ?? 0;

  return (
    <Screen scroll>
      <PageHeader
        title={player.full_name}
        subtitle={
          [player.title, player.federation].filter(Boolean).join(" · ") ||
          "Your profile"
        }
      />

      {error && (
        <Text style={{ color: t.danger, fontSize: 13, marginBottom: 12 }}>{error}</Text>
      )}

      <StatStrip
        items={[
          { label: "Standard", value: player.standard_rating ?? "—" },
          { label: "Rapid", value: player.rapid_rating ?? "—" },
          { label: "Blitz", value: player.blitz_rating ?? "—" },
          { label: "Games", value: gamesCount },
        ]}
      />

      {!player.fide_id && (
        <SectionContainer title="Connect your FIDE ID">
          <Text style={{ color: t.textMuted, fontSize: 13, marginBottom: 10 }}>
            Add it and we&apos;ll pull in your rating and your recent tournament
            games. Mbaku can only talk about play it can see.
          </Text>
          <TextField
            label="FIDE ID"
            value={fideInput}
            onChangeText={setFideInput}
            placeholder="1503014"
            keyboardType="number-pad"
            autoCorrect={false}
          />
          <Button
            title={saving ? "Saving…" : "Find my games"}
            onPress={saveFideId}
            disabled={saving}
            style={{ marginTop: 10 }}
          />
        </SectionContainer>
      )}

      {inFlight && job && (
        <SectionContainer title="Fetching your games">
          <Text style={{ color: t.textMuted, fontSize: 13 }}>
            {job.total > 0
              ? `Tournament ${job.completed} of ${job.total} — ${job.games_imported} games so far.`
              : "Looking you up on chess-results…"}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 4 }}>
            You can close the app. We&apos;ll email you when it&apos;s done.
          </Text>
        </SectionContainer>
      )}

      {/* Finished, but found nothing. Saying so is the whole reason the payload
          carries the most recent job rather than only a running one. */}
      {!inFlight && job && job.total === 0 && !!player.fide_id && (
        <SectionContainer title="No games found">
          <Text style={{ color: t.textMuted, fontSize: 13 }}>
            We couldn&apos;t find tournaments for FIDE ID {player.fide_id} on
            chess-results. That usually means your events aren&apos;t published
            there — your rating above is still from FIDE.
          </Text>
          <Button
            title="Try again"
            variant="secondary"
            onPress={() => {
              if (player.fide_id) {
                api.setMyFideId(player.fide_id).then(setMe).catch(() => {});
              }
            }}
            style={{ marginTop: 10 }}
          />
        </SectionContainer>
      )}

      {/* The signup import takes the 20 most recent events. Anyone with a
          longer career needs a way to ask for the rest, and this is the only
          place they would look for it. */}
      {!!player.fide_id && !inFlight && gamesCount > 0 && (
        <SectionContainer title="Older games">
          <Text style={{ color: t.textMuted, fontSize: 13 }}>
            Signing up imported your 20 most recent tournaments. If you have
            played longer than that, pull in the rest.
          </Text>
          <Button
            title={saving ? "Starting…" : "Import my full history"}
            variant="secondary"
            disabled={saving}
            onPress={async () => {
              if (!player.fide_id) return;
              setSaving(true);
              try {
                setMe(await api.setMyFideId(player.fide_id, true));
              } catch (err) {
                setError(userMessage(err, "Couldn't start the import."));
              } finally {
                setSaving(false);
              }
            }}
            style={{ marginTop: 10 }}
          />
        </SectionContainer>
      )}

      {/* Deliberately not pushing PlayerDetail: that screen is a scouting
          report on an opponent, and the viewer is not one. The games and prep
          screens are neutral — they render whichever player they are given. */}
      {gamesCount > 0 && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <Button
            title="All games"
            variant="secondary"
            onPress={() => navigation.navigate("PlayerGames", { slug: player.slug })}
            style={{ flex: 1 }}
          />
          <Button
            title="Openings"
            variant="secondary"
            onPress={() => navigation.navigate("PlayerPrep", { slug: player.slug })}
            style={{ flex: 1 }}
          />
        </View>
      )}

      <SectionContainer title="Ask Mbaku about your play">
        {gamesCount > 0 ? (
          <AskAssistant slug={player.slug} playerName={player.full_name} />
        ) : (
          <Text style={{ color: t.textMuted, fontSize: 13 }}>
            Once your games are in, Mbaku can go through your openings, your
            results and where you tend to lose the thread.
          </Text>
        )}
      </SectionContainer>
    </Screen>
  );
}
