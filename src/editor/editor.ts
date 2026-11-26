import { foldName, type SharedCity } from '../city/code';
import type { City } from '../game/city';
import { COLS, GROUND_ROW, MAX_FLOORS } from '../game/grid';

export interface EditorState {
  city: City;
  style: number;
  name: string;
  /** Best score from clearing this exact city, or null when not cleared since the last edit. */
  clearedScore: number | null;
}

export function newEditor(): EditorState {
  return {
    city: { heights: new Array<number>(COLS).fill(0), types: new Array<number>(COLS).fill(0) },
    style: 1,
    name: '',
    clearedScore: null,
  };
}

/** Set a column's height from the touched row; returns `e` itself when nothing changes. */
export function paint(e: EditorState, col: number, row: number): EditorState {
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return e;
  const height = Math.max(0, Math.min(MAX_FLOORS, GROUND_ROW - row));
  const type = height > 0 ? e.style : 0;
  if (e.city.heights[col] === height && e.city.types[col] === type) return e;
  const heights = e.city.heights.slice();
  const types = e.city.types.slice();
  heights[col] = height;
  types[col] = type;
  return { ...e, city: { heights, types }, clearedScore: null };
}

export function setStyle(e: EditorState, style: number): EditorState {
  return { ...e, style };
}

export function setName(e: EditorState, raw: string): EditorState {
  return { ...e, name: foldName(raw) };
}

export function clearAll(e: EditorState): EditorState {
  return { ...newEditor(), style: e.style, name: e.name };
}

export function recordClear(e: EditorState, score: number): EditorState {
  return { ...e, clearedScore: Math.max(e.clearedScore ?? 0, score) };
}

export function canPlay(e: EditorState): boolean {
  return e.city.heights.some((h) => h > 0);
}

export function canShare(e: EditorState): boolean {
  return e.clearedScore !== null;
}

export function toShared(e: EditorState, rules: number): SharedCity {
  if (e.clearedScore === null) throw new Error('City must be cleared before sharing');
  return { rules, city: e.city, name: e.name.trimEnd(), score: e.clearedScore };
}
