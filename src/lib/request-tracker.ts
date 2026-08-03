/**
 * Lightweight in-flight request counter.
 * fetchJson increments on start and decrements on finish (success or error).
 * GlobalLoader subscribes to know when to show/hide the progress bar.
 */

type Listener = (active: boolean) => void;

let count = 0;
const listeners = new Set<Listener>();

function notify() {
  const active = count > 0;
  listeners.forEach((fn) => fn(active));
}

export const requestTracker = {
  increment() {
    count++;
    notify();
  },
  decrement() {
    count = Math.max(0, count - 1);
    notify();
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
