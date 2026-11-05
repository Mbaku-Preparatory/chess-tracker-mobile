import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { Button } from "@/components/ui/Button";
import { authStorage } from "@/lib/auth";
import { SITE_URL, bookReaderUrl } from "@/lib/links";
import { refreshAccessToken } from "@/lib/refreshAccessToken";
import { useTheme } from "@/theme/ThemeContext";

/**
 * A reader book (a scan read over the owner's own PDF), shown by the website's
 * own reader in a WebView rather than a second copy of it in the app. The
 * website does everything: asks for the PDF once and keeps it on the phone,
 * shows the pages, opens the board on a tapped move.
 *
 * The app only signs the page in. It puts a fresh *access* token in the
 * page's localStorage before the page loads, and never the refresh token:
 * refresh tokens rotate, so the page refreshing on its own would sign the app
 * out. Thirty minutes is plenty, since the reader asks the API once, when it
 * opens. Should the page still end up at /login, this says so plainly.
 */
export function BookReaderWeb({ publicId }: { publicId: string }) {
  const t = useTheme();
  const navigation = useNavigation();
  const web = useRef<WebView>(null);
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [canGoBack, setCanGoBack] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    refreshAccessToken().then((fresh) => !cancelled && setToken(fresh ?? authStorage.getToken()));
    return () => {
      cancelled = true;
    };
  }, []);

  // The phone's back goes back inside the reader first (it closes the board,
  // which the reader opens as a history entry), then leaves the book.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (!canGoBack) return false;
        web.current?.goBack();
        return true;
      });
      return () => sub.remove();
    }, [canGoBack])
  );

  if (token === undefined) return <ActivityIndicator size="large" color={t.brand(600)} style={{ marginTop: 40 }} />;
  if (signedOut || !token) {
    return (
      <View style={{ padding: 20, gap: 14 }}>
        <Text style={{ color: t.textMuted, fontSize: 14 }}>The book couldn&apos;t open: your session needs renewing. Go back and open it again.</Text>
        <Button title="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  // Only on our own site: a page anywhere else never sees the session.
  const signIn = `(function () {
    if (location.origin !== ${JSON.stringify(SITE_URL)}) return;
    try {
      localStorage.setItem("cs_access_token", ${JSON.stringify(token)});
      localStorage.setItem("cs_email", ${JSON.stringify(authStorage.getEmail() ?? "")});
      localStorage.removeItem("cs_refresh_token");
      localStorage.setItem("theme", ${JSON.stringify(t.mode)});
    } catch (e) {}
  })(); true;`;

  return (
    <WebView
      ref={web}
      source={{ uri: bookReaderUrl(publicId) }}
      injectedJavaScriptBeforeContentLoaded={signIn}
      domStorageEnabled
      setSupportMultipleWindows={false}
      startInLoadingState
      renderLoading={() => <ActivityIndicator size="large" color={t.brand(600)} style={{ marginTop: 40 }} />}
      style={{ flex: 1, backgroundColor: t.bg }}
      onNavigationStateChange={(nav) => {
        setCanGoBack(nav.canGoBack);
        if (nav.url.startsWith(`${SITE_URL}/login`)) setSignedOut(true);
      }}
      // Anything off the site opens in the phone's browser, not in here.
      onShouldStartLoadWithRequest={(req) => {
        if (req.url.startsWith(SITE_URL) || req.url.startsWith("about:") || req.url.startsWith("blob:") || req.url.startsWith("data:")) return true;
        void Linking.openURL(req.url);
        return false;
      }}
    />
  );
}
