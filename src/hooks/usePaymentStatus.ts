/**
 * Poll a payment until it settles.
 *
 * The mobile twin of the web app's hook of the same name, with one difference
 * that matters: on a phone the payer physically leaves for the browser, so this
 * only polls while the app is in the foreground.
 *
 * That is not a battery optimisation. JS timers are throttled or suspended when
 * an app is backgrounded — on iOS reliably, on Android unpredictably — so a
 * timer-based poll that "ran" while the payer was on Paystack's page would
 * really be burning its allowance at random and would often have given up by
 * the time they came back to look. Tying the clock to foreground time makes the
 * ceiling mean what it says: how long we keep checking while somebody is
 * actually watching.
 *
 * Nothing is lost by not polling in the background. The backend learns the
 * outcome from Paystack's webhook whether this app is running or not; polling
 * only decides how soon the payer is told.
 */

import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { api } from "@/lib/api";
import type { Payment } from "@/types";

const POLL_INTERVAL_MS = 2500;

/**
 * Bounded, because a spinner that never stops is worse than an honest "we
 * stopped checking" — the payer cannot tell it apart from the app being
 * broken. Measured in foreground time, and reset each time the app comes back,
 * so returning from the browser always buys a fresh window.
 */
const POLL_CEILING_MS = 90_000;

export type PollState = "idle" | "polling" | "settled" | "gave-up";

export function usePaymentStatus(reference: string | null) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [state, setState] = useState<PollState>("idle");

  // Read inside the polling loop rather than closed over, so a settle in one
  // foreground session is still seen by the next one.
  const settled = useRef(false);

  useEffect(() => {
    settled.current = false;
    if (!reference) {
      setState("idle");
      setPayment(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let deadline = 0;

    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };

    const tick = async () => {
      if (cancelled || settled.current) return;
      try {
        const next = await api.getPayment(reference);
        if (cancelled) return;
        setPayment(next);
        if (next.status !== "pending") {
          settled.current = true;
          setState("settled");
          return;
        }
      } catch {
        // A dropped poll says nothing about the payment — Paystack is deciding
        // either way. Keep asking until the ceiling rather than reporting a
        // failure that has not happened.
      }
      if (cancelled || settled.current) return;
      if (Date.now() > deadline) {
        setState("gave-up");
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    const start = () => {
      if (cancelled || settled.current) return;
      stop();
      // A fresh window each time the app is looked at again.
      deadline = Date.now() + POLL_CEILING_MS;
      setState("polling");
      tick();
    };

    if (AppState.currentState === "active") start();

    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") start();
      else stop();
    });

    return () => {
      cancelled = true;
      stop();
      subscription.remove();
    };
  }, [reference]);

  return { payment, state };
}
