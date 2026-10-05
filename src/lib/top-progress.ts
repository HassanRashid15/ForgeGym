/**
 * Imperative full-width top progress bar (YouTube-style).
 * Used for App Router navigations and dashboard Save Changes.
 */

export type TopProgressSnapshot = {
  active: boolean;
  /** 0–100 */
  value: number;
};

type Listener = (snap: TopProgressSnapshot) => void;

const listeners = new Set<Listener>();

let depth = 0;
let value = 0;
let active = false;
let trickleId: ReturnType<typeof setInterval> | null = null;
let hideId: ReturnType<typeof setTimeout> | null = null;
let safetyId: ReturnType<typeof setTimeout> | null = null;

function emit() {
  const snap: TopProgressSnapshot = { active, value };
  listeners.forEach((fn) => fn(snap));
}

function clearTrickle() {
  if (trickleId != null) {
    clearInterval(trickleId);
    trickleId = null;
  }
}

function clearHide() {
  if (hideId != null) {
    clearTimeout(hideId);
    hideId = null;
  }
}

function clearSafety() {
  if (safetyId != null) {
    clearTimeout(safetyId);
    safetyId = null;
  }
}

function startTrickle() {
  clearTrickle();
  trickleId = setInterval(() => {
    // Approach ~92% asymptotically — never stick mid-way forever
    if (value >= 92) return;
    const remaining = 92 - value;
    const step = Math.max(0.4, remaining * 0.08);
    value = Math.min(92, value + step);
    emit();
  }, 200);
}

function armSafety() {
  clearSafety();
  // If navigation/save hangs, finish the bar so it never looks stuck
  safetyId = setTimeout(() => {
    depth = 0;
    finishVisual();
  }, 12_000);
}

function finishVisual() {
  clearTrickle();
  clearSafety();
  value = 100;
  emit();
  clearHide();
  hideId = setTimeout(() => {
    active = false;
    value = 0;
    emit();
  }, 220);
}

export function subscribeTopProgress(listener: Listener): () => void {
  listeners.add(listener);
  listener({ active, value });
  return () => listeners.delete(listener);
}

export function startTopProgress() {
  clearHide();
  depth += 1;
  if (depth === 1) {
    active = true;
    value = 8;
    emit();
    startTrickle();
    armSafety();
  }
}

export function doneTopProgress() {
  if (depth <= 0) {
    depth = 0;
    if (active) finishVisual();
    return;
  }
  depth -= 1;
  if (depth === 0) {
    finishVisual();
  }
}

/** Run an async action while the top bar is visible. */
export async function withTopProgress<T>(fn: () => Promise<T>): Promise<T> {
  startTopProgress();
  try {
    return await fn();
  } finally {
    doneTopProgress();
  }
}
