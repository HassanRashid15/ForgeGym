/**
 * Wait for the best GPS reading on mobile (first fix is often cell/Wi‑Fi, ~km off).
 * Resolves when accuracy is good enough, or when the time budget ends with the best so far.
 */
export function getBestGeolocation(options?: {
  /** Accept immediately at or under this accuracy (meters). Default 60. */
  targetAccuracyM?: number;
  /** Max wait in ms. Default 18000. */
  timeoutMs?: number;
  /** Reject if best accuracy is worse than this (meters). Default 2500. */
  maxAcceptableAccuracyM?: number;
}): Promise<GeolocationPosition> {
  const targetAccuracyM = options?.targetAccuracyM ?? 60;
  const timeoutMs = options?.timeoutMs ?? 18_000;
  const maxAcceptableAccuracyM = options?.maxAcceptableAccuracyM ?? 2_500;

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(Object.assign(new Error("unsupported"), { code: 0 }));
      return;
    }

    let best: GeolocationPosition | null = null;
    let settled = false;
    let watchId: number | null = null;

    const cleanup = () => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      window.clearTimeout(timer);
    };

    const finish = (pos: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(pos);
    };

    const fail = (err: GeolocationPositionError | Error) => {
      if (settled) return;
      if (best) {
        finish(best);
        return;
      }
      settled = true;
      cleanup();
      reject(err);
    };

    const onPos = (pos: GeolocationPosition) => {
      if (
        !best ||
        pos.coords.accuracy < best.coords.accuracy ||
        (pos.coords.accuracy === best.coords.accuracy &&
          pos.timestamp > best.timestamp)
      ) {
        best = pos;
      }
      if (pos.coords.accuracy <= targetAccuracyM) {
        finish(pos);
      }
    };

    const onErr = (err: GeolocationPositionError) => {
      // Keep waiting if we already have a reading; otherwise surface the error.
      if (!best) fail(err);
    };

    const timer = window.setTimeout(() => {
      if (best) {
        if (best.coords.accuracy > maxAcceptableAccuracyM) {
          settled = true;
          cleanup();
          reject(
            Object.assign(
              new Error(
                `Location too imprecise (±${Math.round(best.coords.accuracy)} m)`,
              ),
              { code: 2 },
            ),
          );
          return;
        }
        finish(best);
        return;
      }
      fail(Object.assign(new Error("Location request timed out"), { code: 3 }));
    }, timeoutMs);

    const opts: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: timeoutMs,
    };

    watchId = navigator.geolocation.watchPosition(onPos, onErr, opts);
    navigator.geolocation.getCurrentPosition(onPos, onErr, opts);
  });
}
