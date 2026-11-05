import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAppSelector } from "@/redux/hooks";
import type { Preferences } from "@/types";

/** What a screen assumes until the account's answer arrives: the server's defaults. */
export const DEFAULT_PREFERENCES: Preferences = { mbaku_enabled: false, bot_speech: true, import_emails: false };

interface PreferencesContext {
  preferences: Preferences;
  /** False until the account's own choices have loaded. */
  loaded: boolean;
  /** Saves at once and shows it at once; put back if the save fails. */
  update: (change: Partial<Preferences>) => Promise<void>;
}

const Context = createContext<PreferencesContext>({ preferences: DEFAULT_PREFERENCES, loaded: false, update: async () => {} });

/**
 * The settings switches (Mbaku, the bot talking, import emails) for every
 * screen: read once per sign-in from /auth/me/, changed from Account. The
 * website's components/PreferencesProvider.tsx is the same thing; the switches
 * live on the account, so they follow the person between the two.
 */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.token);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) {
      setPreferences(DEFAULT_PREFERENCES);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    api
      .me()
      .then((me) => {
        if (cancelled) return;
        setPreferences({ ...DEFAULT_PREFERENCES, ...me.preferences });
        setLoaded(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const update = useCallback(async (change: Partial<Preferences>) => {
    let before: Preferences = DEFAULT_PREFERENCES;
    setPreferences((p) => {
      before = p;
      return { ...p, ...change };
    });
    try {
      const me = await api.setMyPreferences(change);
      setPreferences({ ...DEFAULT_PREFERENCES, ...me.preferences });
    } catch (err) {
      setPreferences(before);
      throw err;
    }
  }, []);

  return <Context.Provider value={{ preferences, loaded, update }}>{children}</Context.Provider>;
}

export const usePreferences = () => useContext(Context);
