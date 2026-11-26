import { decodeCityAllowEmpty, encodeCity } from '../city/code';
import type { EditorState } from '../editor/editor';
import { CURRENT_RULES } from '../game/rules';

export const DRAFT_KEY = 'skylinedrop.draft';
const CITY_BEST_PREFIX = 'skylinedrop.city.';

/** Persist the editor draft; failures (private mode, quota) are ignored. */
export function saveDraft(storage: Pick<Storage, 'setItem'> | null, e: EditorState): void {
  try {
    const code = encodeCity({ rules: CURRENT_RULES, city: e.city, name: e.name.trimEnd(), score: 0 });
    storage?.setItem(DRAFT_KEY, JSON.stringify({ code, cleared: e.clearedScore, style: e.style }));
  } catch {
    // Losing a draft is not worth interrupting the editor.
  }
}

/** Restore the draft; null when missing, blocked or invalid. */
export function loadDraft(storage: Pick<Storage, 'getItem'> | null): EditorState | null {
  try {
    const raw = storage?.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { code, cleared, style } = parsed as Record<string, unknown>;
    if (typeof code !== 'string') return null;
    const shared = decodeCityAllowEmpty(code);
    if (!shared) return null;
    const clearedScore =
      shared.rules === CURRENT_RULES && typeof cleared === 'number' && Number.isInteger(cleared) && cleared >= 0 ? cleared : null;
    const st = typeof style === 'number' && Number.isInteger(style) && style >= 1 ? style : 1;
    return { city: shared.city, style: st, name: shared.name, clearedScore };
  } catch {
    return null;
  }
}

/** Best score for one city; 0 when storage is missing, blocked or holds garbage. */
export function readCityBest(storage: Pick<Storage, 'getItem'> | null, key: string): number {
  try {
    const n = Number(storage?.getItem(CITY_BEST_PREFIX + key));
    return Number.isInteger(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeCityBest(storage: Pick<Storage, 'setItem'> | null, key: string, best: number): void {
  try {
    storage?.setItem(CITY_BEST_PREFIX + key, String(best));
  } catch {
    // Ignored.
  }
}
