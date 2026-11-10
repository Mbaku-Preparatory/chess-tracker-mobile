import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ImportJob, ImportSource } from "@/types";
import { userMessage } from "@/lib/apiError";

const POLL_INTERVAL_MS = 2000;

export function isTerminal(job: ImportJob): boolean {
  return job.status === "succeeded" || job.status === "failed" || job.status === "cancelled";
}

interface UseImportJobOptions {
  slug: string;
  /**
   * Which panel this is. It reconnects only to a job of its own source: a
   * player can have a chess-results import running while the Chess.com panel
   * sits idle, and each panel shows its own work rather than each other's.
   */
  source: ImportSource;
  /** Called once, when a job reaches a terminal state. */
  onSettled?: (job: ImportJob) => void | Promise<void>;
}

/** Poll one job until it settles, handing each fresh copy to `onUpdate`. */
function usePollJob(jobId: string | null, onUpdate: (job: ImportJob) => void | Promise<void>) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const fresh = await api.getImportJob(jobId);
        if (cancelled) return;
        await onUpdateRef.current(fresh);
        if (isTerminal(fresh)) return;
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
  }, [jobId]);
}

/**
 * Follow one background import.
 *
 * This replaces a synchronous request held by the component, which had a
 * failure mode that mattered more on a phone than anywhere else: leaving the
 * screen or backgrounding the app aborted the fetch, and nothing resumed it.
 * The import is a row in the database now, so it keeps running and this
 * reconnects to it on mount.
 *
 * `elsewhere` is another panel's import for this player, queued or running.
 * Imports run one at a time, so starting this one means waiting behind it;
 * the panel says so, or the wait looks like nothing happening.
 */
export function useImportJob({ slug, source, onSettled }: UseImportJobOptions) {
  const [job, setJob] = useState<ImportJob | null>(null);
  const [elsewhere, setElsewhere] = useState<ImportJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const activeJobId = job && !isTerminal(job) ? job.id : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { results } = await api.recentImportJobs(slug);
        if (cancelled) return;
        const live = results.filter((j) => !isTerminal(j));
        const own = live.find((j) => j.source === source);
        // Never replace a job started while this lookup was in flight.
        if (own) setJob((current) => current ?? own);
        setElsewhere(live.find((j) => j.source !== source) ?? null);
      } catch {
        // Nothing to reconnect to is the normal case.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, source]);

  usePollJob(activeJobId, async (fresh) => {
    setJob(fresh);
    if (isTerminal(fresh)) await onSettledRef.current?.(fresh);
  });
  // Only while there is one: once it settles, the note goes away.
  usePollJob(elsewhere?.id ?? null, (fresh) => setElsewhere(isTerminal(fresh) ? null : fresh));

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

  return { job, starting, error, start, cancel, reset, isRunning: Boolean(activeJobId), elsewhere };
}
