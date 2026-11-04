/**
 * Signing in with Google, Lichess or Chess.com on the phone. The backend does
 * the checking (users/google.py, lichess_oauth.py, chesscom_oauth.py) exactly
 * as it does for the website; this file only gets the proof out of the
 * provider and hands it over.
 *
 * Google: the phone's own account picker (Credential Manager, through
 * @react-native-google-signin). Google no longer lets new Android apps sign in
 * through a browser redirect. It returns an ID token issued to the *web*
 * client ID, so the backend's GOOGLE_OAUTH_CLIENT_IDS needs nothing new. For
 * the picker to appear, Google Cloud must also have an Android client for
 * this package and each signing key's SHA-1 (see PLAYSTORE.md).
 *
 * Lichess and Chess.com: OAuth with PKCE in an in-app browser
 * (expo-auth-session), which returns to the app at
 * com.chesspreparatory.app://auth/<provider>. Lichess only accepts app return
 * addresses in reverse-domain form, hence the package name as the scheme.
 * AuthRequest makes the PKCE secret and the `state`, and refuses a return
 * whose `state` is not the one it sent.
 */

import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

// Closes the in-app browser's leftover window on web; a no-op on the phone.
WebBrowser.maybeCompleteAuthSession();

/** The website's Google client ID: public, and what the backend accepts. */
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "450683232233-n8v32rm3ldt2f9thkj2nkupaejh5h2ur.apps.googleusercontent.com";

/** Chess.com issues an ID only to apps it approves; until then it is hidden. */
const CHESSCOM_CLIENT_ID = process.env.EXPO_PUBLIC_CHESSCOM_CLIENT_ID || "";

/** app.json's `scheme`. */
const APP_SCHEME = "com.chesspreparatory.app";

export type Provider = "lichess" | "chesscom";

const PROVIDERS: Record<Provider, { name: string; authorizationEndpoint: string; clientId: string; scopes: string[] }> = {
  // Must match CLIENT_ID in the backend's users/lichess_oauth.py.
  lichess: { name: "Lichess", authorizationEndpoint: "https://lichess.org/oauth", clientId: "chesspreparatory.com", scopes: ["email:read"] },
  chesscom: { name: "Chess.com", authorizationEndpoint: "https://oauth.chess.com/authorize", clientId: CHESSCOM_CLIENT_ID, scopes: ["openid", "profile", "email"] },
};

export const providerName = (provider: Provider) => PROVIDERS[provider].name;

/** The providers this build offers, in the order they are shown. */
export const enabledProviders = (): Provider[] =>
  (["lichess", "chesscom"] as Provider[]).filter((p) => Boolean(PROVIDERS[p].clientId));

/** What the backend's /auth/<provider>/ swaps for the account. */
export interface ProviderCode {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}

/**
 * Opens the provider's sign-in, and resolves with the code it sent back, or
 * null if the person closed it. Throws with a readable message otherwise.
 */
export async function authorizeWith(provider: Provider): Promise<ProviderCode | null> {
  const { name, authorizationEndpoint, clientId, scopes } = PROVIDERS[provider];
  const redirectUri = AuthSession.makeRedirectUri({ native: `${APP_SCHEME}://auth/${provider}`, path: `auth/${provider}` });
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });
  const result = await request.promptAsync({ authorizationEndpoint });
  if (result.type === "success" && result.params.code && request.codeVerifier) {
    return { code: result.params.code, code_verifier: request.codeVerifier, redirect_uri: redirectUri };
  }
  if (result.type === "error") {
    // access_denied is the person pressing Cancel on the provider's page.
    if (result.params?.error === "access_denied") return null;
    throw new Error(`${name} sign-in didn't complete. Please try again.`);
  }
  return null; // closed the browser, or another sign-in took over
}

// ── Google ───────────────────────────────────────────────────────────────

type GoogleModule = typeof import("@react-native-google-signin/google-signin");

/**
 * The native module, or null where there is none: the web build, iOS (not
 * shipped), and a development build made before it was added. Required
 * lazily, because a static import of a missing native module fails the whole
 * bundle (see the datetimepicker note in SessionForm).
 */
function googleModule(): GoogleModule | null {
  if (Platform.OS !== "android") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@react-native-google-signin/google-signin") as GoogleModule;
  } catch {
    return null;
  }
}

export const googleAvailable = () => googleModule() !== null;

let configured = false;

/**
 * The phone's Google account picker. Resolves with an ID token for the
 * backend, or null if the person closed the picker.
 */
export async function googleIdToken(): Promise<string | null> {
  const mod = googleModule();
  if (!mod) throw new Error("Google sign-in isn't available in this version of the app.");
  const { GoogleSignin, isErrorWithCode, statusCodes } = mod;
  if (!configured) {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Forget the last choice, so the picker always asks which account.
    await GoogleSignin.signOut().catch(() => null);
    const response = await GoogleSignin.signIn();
    if (response.type === "cancelled") return null;
    const token = response.data.idToken;
    if (!token) throw new Error("Google didn't send a sign-in token. Please try again.");
    return token;
  } catch (err) {
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) return null;
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error("Google sign-in needs Google Play services on this phone. Use your email instead.");
      }
      // DEVELOPER_ERROR: this build's signing key is not registered with
      // Google Cloud as an Android client. A setup problem, not the user's.
      if (String(err.code) === "10" || /DEVELOPER_ERROR/i.test(String(err.message))) {
        throw new Error("Google sign-in isn't set up for this version of the app yet. Use your email instead.");
      }
    }
    throw err instanceof Error && err.message ? err : new Error("Google sign-in didn't work. Please try again.");
  }
}
