import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { clearAuth, setProfilePic } from "@/redux/actions/auth";
import { useTheme } from "@/theme/ThemeContext";
import { ThemePicker } from "@/components/ui/ThemePicker";
import type { RootStackParamList } from "@/navigation/types";
import Logo from "../ui/Logo";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function AppHeader() {
  const t = useTheme();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const [menuOpen, setMenuOpen] = useState(false);

  const { refreshToken, email, profilePic } = useAppSelector((s) => s.auth);

  async function handleLogout() {
    setMenuOpen(false);
    if (refreshToken) {
      try {
        await api.logout(refreshToken);
      } catch {
        // best-effort — log out locally regardless
      }
    }
    dispatch(clearAuth());
  }

  async function handlePickProfilePic() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mime = result.assets[0].mimeType ?? "image/jpeg";
      dispatch(setProfilePic(`data:${mime};base64,${result.assets[0].base64}`));
    }
  }

  const initials = email ? email[0].toUpperCase() : "?";

  return (
    <>
      <View style={[st.bar, { borderColor: t.border, backgroundColor: t.surface }]}>
        <Pressable style={st.brand} onPress={() => navigation.navigate("MainTabs", { screen: "Players" })}>
          <Logo size={34} />
        </Pressable>

        <View style={st.actions}>
          <TouchableOpacity onPress={() => navigation.navigate("MainTabs", { screen: "Players" })} style={st.navBtn} hitSlop={8}>
            <Ionicons name="people-outline" size={20} color={t.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("MasterGames")} style={st.navBtn} hitSlop={8}>
            <Ionicons name="library-outline" size={20} color={t.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuOpen(true)} style={st.avatarBtn} hitSlop={8}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={st.avatarImg} />
            ) : (
              <View style={[st.avatarImg, { backgroundColor: t.brand(600), alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={[st.menu, { backgroundColor: t.surface, borderColor: t.border }]} onPress={(e) => e.stopPropagation()}>
            <ScrollView>
              <View style={st.menuHeader}>
                <TouchableOpacity onPress={handlePickProfilePic}>
                  {profilePic ? (
                    <Image source={{ uri: profilePic }} style={st.avatarLg} />
                  ) : (
                    <View style={[st.avatarLg, { backgroundColor: t.brand(600), alignItems: "center", justifyContent: "center" }]}>
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 22 }}>{initials}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={[st.hint, { color: t.textFaint }]}>Tap to change photo</Text>
                {email && <Text style={[st.email, { color: t.text }]}>{email}</Text>}
              </View>

              <View style={[st.section, { borderColor: t.border }]}>
                <ThemePicker />
              </View>

              <TouchableOpacity
                style={[st.menuItem, { borderColor: t.border }]}
                onPress={() => { setMenuOpen(false); navigation.navigate("Account"); }}
              >
                <Ionicons name="person-circle-outline" size={17} color={t.textMuted} />
                <Text style={{ color: t.text, fontSize: 14 }}>Account</Text>
              </TouchableOpacity>

              {/* Unconditional: everyone has a profile from the moment they
                  register. The old repertoire entry here was gated on an
                  onboarding flag, which no longer exists. */}
              <TouchableOpacity
                style={[st.menuItem, { borderColor: t.border }]}
                onPress={() => { setMenuOpen(false); navigation.navigate("MyProfile"); }}
              >
                <Ionicons name="stats-chart-outline" size={17} color={t.textMuted} />
                <Text style={{ color: t.text, fontSize: 14 }}>My Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={st.logoutItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={17} color={t.danger} />
                <Text style={{ color: t.danger, fontSize: 14, fontWeight: "600" }}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  // 20px icon + 8 padding = a 36px target, under Android's 48dp minimum; hitSlop on
  // each button widens the touchable area without changing the visual layout.
  navBtn: { padding: 8 },
  avatarBtn: { marginLeft: 6 },
  avatarImg: { height: 32, width: 32, borderRadius: 16 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-start", alignItems: "flex-end", paddingTop: 60, paddingRight: 12 },
  menu: { width: 260, maxHeight: "70%", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  menuHeader: { alignItems: "center", paddingTop: 20, paddingBottom: 16, paddingHorizontal: 16 },
  avatarLg: { height: 64, width: 64, borderRadius: 32 },
  hint: { marginTop: 6, fontSize: 11 },
  email: { marginTop: 4, fontSize: 13, fontWeight: "600" },
  section: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 14 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 14 },
  logoutItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
});
