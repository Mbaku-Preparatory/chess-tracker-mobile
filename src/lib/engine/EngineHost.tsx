import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { ENGINE_URL } from "@/lib/links";

/**
 * Stockfish on the phone. React Native has no WebAssembly worker, so the
 * engine is the website's own (public/engine.html: the same stockfish.js as
 * the web app's analysis board and bot) running in an invisible WebView,
 * spoken to in UCI. One engine for the whole app, created the first time
 * something asks for it, so a phone that never uses it never downloads it
 * (about 7 MB, cached by the WebView after the first time).
 *
 * The rule every caller needs, kept here once: the newest search wins. A
 * new search stops the one running, whose last "bestmove" (and any info
 * lines before it) then belongs to nobody and is dropped.
 */

export interface EngineSearch {
  /** The engine's move as UCI ("e2e4"), or null if it has none. Never settles
   * for a search that was cancelled or replaced. */
  done: Promise<string | null>;
  cancel: () => void;
}

export interface Engine {
  /**
   * Runs `setup` (setoption / position commands) then `go`. `onInfo` gets the
   * search's "info" lines as they come.
   */
  search: (setup: string[], go: string, onInfo?: (line: string) => void) => EngineSearch;
  /** Set when the engine page could not load or the engine could not start. */
  failed: boolean;
}

const EngineContext = createContext<Engine | null>(null);

/** The app's engine; null outside EngineHost. */
export function useEngineHost(): Engine | null {
  return useContext(EngineContext);
}

interface Running {
  onInfo?: (line: string) => void;
  resolve: (uci: string | null) => void;
}

export function EngineHost({ children }: { children: React.ReactNode }) {
  const [wanted, setWanted] = useState(false);
  const [failed, setFailed] = useState(false);
  // Remounting the WebView (after Android kills its renderer) is a new key.
  const [generation, setGeneration] = useState(0);
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const queue = useRef<string[]>([]);
  const running = useRef<Running | null>(null);
  // "bestmove"s still owed by searches that were stopped.
  const owed = useRef(0);

  const send = useCallback((command: string) => {
    if (!ready.current) {
      queue.current.push(command);
      setWanted(true);
      return;
    }
    web.current?.injectJavaScript(`window.uci(${JSON.stringify(command)});true;`);
  }, []);

  const stopRunning = useCallback(() => {
    if (!running.current) return;
    send("stop");
    owed.current += 1;
    running.current = null;
  }, [send]);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      const line = e.nativeEvent.data;
      if (line === "ready") {
        ready.current = true;
        setFailed(false);
        const pending = queue.current;
        queue.current = [];
        for (const c of ["uci", "isready", ...pending]) send(c);
        return;
      }
      if (line.startsWith("error")) {
        setFailed(true);
        return;
      }
      if (line.startsWith("bestmove")) {
        if (owed.current > 0) {
          owed.current -= 1;
          return;
        }
        const r = running.current;
        running.current = null;
        const uci = line.split(" ")[1];
        r?.resolve(uci && uci !== "(none)" ? uci : null);
        return;
      }
      if (owed.current === 0 && line.startsWith("info")) running.current?.onInfo?.(line);
    },
    [send],
  );

  // Android killed the WebView's renderer: what was running is lost; a fresh
  // WebView takes the next search.
  const restart = useCallback(() => {
    ready.current = false;
    owed.current = 0;
    running.current = null;
    setGeneration((g) => g + 1);
  }, []);

  // The page could not load (offline, most likely). Not retried on its own,
  // which would loop while offline: the next search tries again.
  const giveUp = useCallback(() => {
    ready.current = false;
    owed.current = 0;
    running.current = null;
    queue.current = [];
    setFailed(true);
    setWanted(false);
  }, []);

  const search = useCallback(
    (setup: string[], go: string, onInfo?: (line: string) => void): EngineSearch => {
      stopRunning();
      let mine: Running | null = null;
      const done = new Promise<string | null>((resolve) => {
        mine = { onInfo, resolve };
      });
      running.current = mine;
      for (const c of setup) send(c);
      send(go);
      return {
        done,
        cancel: () => {
          if (running.current === mine) stopRunning();
        },
      };
    },
    [send, stopRunning],
  );

  const engine = useMemo<Engine>(() => ({ search, failed }), [search, failed]);

  return (
    <EngineContext.Provider value={engine}>
      {children}
      {wanted && (
        <View style={st.hidden} pointerEvents="none">
          <WebView
            key={generation}
            ref={web}
            source={{ uri: ENGINE_URL }}
            onMessage={onMessage}
            javaScriptEnabled
            onError={giveUp}
            onHttpError={giveUp}
            onRenderProcessGone={restart}
            onContentProcessDidTerminate={restart}
          />
        </View>
      )}
    </EngineContext.Provider>
  );
}

const st = StyleSheet.create({
  // Laid out but never seen: some Android WebViews pause a view of size zero.
  hidden: { position: "absolute", width: 1, height: 1, opacity: 0, left: -10, top: -10 },
});
