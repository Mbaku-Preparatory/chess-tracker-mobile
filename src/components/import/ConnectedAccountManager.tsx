import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import type { PlayerAccount } from "@/types";
import { userMessage } from "@/lib/apiError";

const PLATFORM_LABEL = { chesscom: "Chess.com", lichess: "Lichess" } as const;

export function ConnectedAccountManager({
  slug,
  platform,
  accounts,
  onUpdated,
}: {
  slug: string;
  platform: "chesscom" | "lichess";
  accounts: PlayerAccount[];
  onUpdated?: () => void | Promise<void>;
}) {
  const t = useTheme();
  const platformAccounts = accounts.filter((a) => a.platform === platform);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(key: string, action: () => Promise<void>) {
    setBusyKey(key);
    setError(null);
    setMessage(null);
    try {
      await action();
      await onUpdated?.();
    } catch (err) {
      setError(userMessage(err, "Action failed."));
    } finally {
      setBusyKey(null);
    }
  }

  function handleDelink(account: PlayerAccount, deleteGames: boolean) {
    Alert.alert(
      "Delink account?",
      deleteGames
        ? `Delink ${PLATFORM_LABEL[platform]} account "${account.username}" and delete all imported games tied to it? This cannot be undone.`
        : `Delink ${PLATFORM_LABEL[platform]} account "${account.username}" and keep its imported games?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delink",
          style: "destructive",
          onPress: () =>
            runAction(`delink-${account.id}-${deleteGames ? "purge" : "keep"}`, async () => {
              const result = await api.removeAccount(slug, account.id, { deleteGames });
              setMessage(
                deleteGames
                  ? `Delinked ${result.username} and deleted ${result.deleted_games} imported game(s).`
                  : `Delinked ${result.username}. Imported games were kept.`
              );
            }),
        },
      ]
    );
  }

  function handleDeleteGames(account: PlayerAccount) {
    Alert.alert(
      "Delete imported games?",
      `Delete all imported ${PLATFORM_LABEL[platform]} games tied to "${account.username}" but keep the account linked?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            runAction(`games-${account.id}`, async () => {
              const result = await api.deleteImportedGamesForAccount(slug, account.id);
              setMessage(`Deleted ${result.deleted_games} imported game(s) for ${result.username}.`);
            }),
        },
      ]
    );
  }

  return (
    <Card style={{ padding: 14, marginTop: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: t.text }}>Connected {PLATFORM_LABEL[platform]} accounts</Text>
      <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>
        Delink an account, delete only its imported games, or do both.
      </Text>

      {platformAccounts.length === 0 ? (
        <Text style={{ fontSize: 12, color: t.textFaint, marginTop: 10 }}>No {PLATFORM_LABEL[platform]} accounts linked yet.</Text>
      ) : (
        <View style={{ gap: 10, marginTop: 10 }}>
          {platformAccounts.map((account) => (
            <View key={account.id} style={[st.row, { borderColor: t.border }]}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: t.text, marginBottom: 8 }}>{account.username}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <Pressable disabled={!!busyKey} onPress={() => handleDelink(account, false)} style={[st.chip, { borderColor: t.border }]}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: t.textMuted }}>
                    {busyKey === `delink-${account.id}-keep` ? "Working…" : "Delink only"}
                  </Text>
                </Pressable>
                <Pressable disabled={!!busyKey} onPress={() => handleDeleteGames(account)} style={[st.chip, { borderColor: "rgba(217,119,6,0.4)", backgroundColor: t.warningBg }]}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: t.warning }}>
                    {busyKey === `games-${account.id}` ? "Deleting…" : "Delete imported games"}
                  </Text>
                </Pressable>
                <Pressable disabled={!!busyKey} onPress={() => handleDelink(account, true)} style={[st.chip, { borderColor: t.dangerBorder, backgroundColor: t.dangerBg }]}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: t.danger }}>
                    {busyKey === `delink-${account.id}-purge` ? "Deleting…" : "Delink + delete games"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {message && <Text style={{ marginTop: 10, fontSize: 12, color: t.success }}>{message}</Text>}
      {error && <Text style={{ marginTop: 10, fontSize: 12, color: t.danger }}>{error}</Text>}
    </Card>
  );
}

const st = StyleSheet.create({
  row: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
});
