/** Fixed 60 Hz game step. */
export const STEP_MS = 1000 / 60;

/**
 * Turn real elapsed time into a whole number of fixed game steps.
 * Elapsed time is clamped so a long pause (hidden tab, debugger) can't trigger a burst.
 */
export function advanceClock(
  accMs: number,
  elapsedMs: number,
  stepMs: number = STEP_MS,
  maxElapsedMs = 250,
): { steps: number; accMs: number } {
  let acc = accMs + Math.min(Math.max(elapsedMs, 0), maxElapsedMs);
  // Tolerance keeps 250 ms from rounding down to 14 steps.
  const steps = Math.floor(acc / stepMs + 1e-9);
  acc = Math.max(acc - steps * stepMs, 0);
  return { steps, accMs: acc };
}
