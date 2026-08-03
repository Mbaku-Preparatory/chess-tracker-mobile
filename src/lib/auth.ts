import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "cs_access_token";
const REFRESH_TOKEN_KEY = "cs_refresh_token";
const EMAIL_KEY = "cs_email";
const PROFILE_PIC_KEY = "cs_profile_pic";

// SecureStore (Keychain/Keystore) can't hold values much over ~2KB, so tokens
// live there but the profile pic (a base64 data URI) goes in AsyncStorage.
interface AuthCache {
  token: string | null;
  refreshToken: string | null;
  email: string | null;
  profilePic: string | null;
}

const cache: AuthCache = { token: null, refreshToken: null, email: null, profilePic: null };
let hydrated = false;

// authStorage.getToken() etc. are called synchronously all over the app (api
// client, graphql client, redux reducers) mirroring the web version's
// localStorage-backed reads. RN has no synchronous storage API, so we hydrate
// an in-memory cache once at app boot (see hydrateAuthStorage, awaited before
// the app renders) and every getter below just reads that cache.
export async function hydrateAuthStorage(): Promise<void> {
  const [token, refreshToken, email, profilePic] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.getItem(EMAIL_KEY),
    AsyncStorage.getItem(PROFILE_PIC_KEY),
  ]);
  cache.token = token;
  cache.refreshToken = refreshToken;
  cache.email = email;
  cache.profilePic = profilePic;
  hydrated = true;
}

export const authStorage = {
  isHydrated(): boolean {
    return hydrated;
  },
  getToken(): string | null {
    return cache.token;
  },
  setToken(token: string) {
    cache.token = token;
    void SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  getRefreshToken(): string | null {
    return cache.refreshToken;
  },
  setRefreshToken(token: string) {
    cache.refreshToken = token;
    void SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },
  getEmail(): string | null {
    return cache.email;
  },
  setEmail(email: string) {
    cache.email = email;
    void AsyncStorage.setItem(EMAIL_KEY, email);
  },
  getProfilePic(): string | null {
    return cache.profilePic;
  },
  setProfilePic(pic: string) {
    cache.profilePic = pic;
    void AsyncStorage.setItem(PROFILE_PIC_KEY, pic);
  },
  clear() {
    cache.token = null;
    cache.refreshToken = null;
    cache.email = null;
    cache.profilePic = null;
    void SecureStore.deleteItemAsync(TOKEN_KEY);
    void SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    void AsyncStorage.removeItem(EMAIL_KEY);
    void AsyncStorage.removeItem(PROFILE_PIC_KEY);
  },
};
