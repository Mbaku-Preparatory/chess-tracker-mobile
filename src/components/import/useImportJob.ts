import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ImportJob } from "@/types";
import { userMessage } from "@/lib/apiError";

const POLL_INTERVAL_MS = 2000;

export function isTerminal(job: ImportJob): boolean {
  return job.status === "succeeded" || job.status === "failed" || job.status === "cancelled";
}

interface UseImportJobOptions {
  slug: string;
  onSettled?: (job: ImportJob) => void | Promise<void>;
  /**
   * Only reconnect to a job this panel started. A player can have a
   * chess-results import running while the Chess.com panel sits idle.
   */
  matches?: (job: ImportJob) => boolean;
}

/**
 * Follow one background import.
 *
 * This replaces a synchronous request held by the component, which had a
 * failure mode that mattered more on a phone than anywhere else: leaving the
 * screen or backgrounding the app aborted the fetch, and nothing resumed it.
 * The import is a row in the database now, so it keeps running and this
 * reconnects to it on mount.
 */
export function useImportJob({ slug, onSettled, matches }: UseImportJobOptions) {
  const [job, setJob] = useState<ImportJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const matchesRef = useRef(matches);
  matchesRef.current = matches;

  const activeJobId = job && !isTerminal(job) ? job.id : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { results } = await api.recentImportJobs(slug);
        if (cancelled) return;
        const live = results.find(
          (j) => !isTerminal(j) && (matchesRef.current?.(j) ?? true),
        );
        if (live) setJob(live);
      } catch {
        // Nothing to reconnect to is the normal case.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!activeJobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const fresh = await api.getImportJob(activeJobId);
        if (cancelled) return;
        setJob(fresh);
        if (isTerminal(fresh)) {
          await onSettledRef.current?.(fresh);
          return;
        }
      } catch {
        if (cancelled) return;
        // A failed poll on a phone is usually the network coming and going.
        // Keep polling rather than declaring a live import dead.
      }
      if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeJobId]);

  const start = useCallback(
    async (starter: () => Promise<ImportJob>, fallbackMessage: string) => {
      setStarting(true);
      setError(null);
      setJob(null);
      try {
        const fresh = await starter();
        setJob(fresh);
        return fresh;
      } catch (err) {
        setError(userMessage(err, fallbackMessage));
        return null;
      } finally {
        setStarting(false);
      }
    },
    [],
  );

  const cancel = useCallback(async () => {
    if (!activeJobId) return;
    try {
      setJob(await api.cancelImportJob(activeJobId));
    } catch (err) {
      setError(userMessage(err, "Could not cancel the import."));
    }
  }, [activeJobId]);

  const reset = useCallback(() => {
    setJob(null);
    setError(null);
  }, []);

  return { job, starting, error, start, cancel, reset, isRunning: Boolean(activeJobId) };
}
