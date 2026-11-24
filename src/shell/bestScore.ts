export const BEST_KEY = 'skylinedrop.best';

/** Best score from storage; 0 when storage is missing, blocked or holds garbage. */
export function readBest(storage: Pick<Storage, 'getItem'> | null): number {
  try {
    const n = Number(storage?.getItem(BEST_KEY));
    return Number.isInteger(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Save the best score; failures (private mode, quota) are ignored. */
export function writeBest(storage: Pick<Storage, 'setItem'> | null, best: number): void {
  try {
    storage?.setItem(BEST_KEY, String(best));
  } catch {
    // Not worth interrupting the game over.
  }
}
