import type { City } from '../game/city';
import { COLS, MAX_FLOORS } from '../game/grid';
import { getRules } from '../game/rules';

/** A city plus who made it and what they scored, as carried in a share link. */
export interface SharedCity {
  rules: number;
  city: City;
  name: string;
  score: number;
}

const FORMAT = '1';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const MAX_TYPE = 63;
const MAX_SCORE = 999_999;
const MAX_NAME = 10;
/** Format char + rules char + two chars per column. */
const HEAD_LEN = 2 + 2 * COLS;

/** Upper-case ASCII letters, digits and single spaces only; accents stripped; at most 10 chars. */
export function foldName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/ +/g, ' ')
    .replace(/^ /, '')
    .slice(0, MAX_NAME);
}

export function displayName(name: string): string {
  return name === '' ? 'SOMEONE' : name;
}

function encodeHead(c: Pick<SharedCity, 'rules' | 'city'>): string {
  let out = FORMAT + ALPHABET[c.rules]!;
  for (let i = 0; i < COLS; i++) out += ALPHABET[c.city.heights[i]!]! + ALPHABET[c.city.types[i]!]!;
  return out;
}

export function encodeCity(c: SharedCity): string {
  // Name sits before the score so a code always ends in a base-36 digit (linkifiers strip trailing . and _).
  return `${encodeHead(c)}.${c.name.trimEnd().replace(/ /g, '_')}.${c.score.toString(36)}`;
}

/** The rules and columns part of the code: identifies a city regardless of who shared it. */
export function cityKey(c: Pick<SharedCity, 'rules' | 'city'>): string {
  return encodeHead(c);
}

/** Strict decode for shared links: a city with nothing built is rejected. */
export function decodeCity(code: string): SharedCity | null {
  const c = decodeCityAllowEmpty(code);
  return c !== null && c.city.heights.some((h) => h > 0) ? c : null;
}

/** Like decodeCity but accepts an all-empty city; only for the editor draft. */
export function decodeCityAllowEmpty(code: string): SharedCity | null {
  const parts = code.split('.');
  if (parts.length !== 3) return null;
  const [head, nameStr, scoreStr] = parts as [string, string, string];
  if (head.length !== HEAD_LEN) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(head)) return null;
  if (head[0] !== FORMAT) return null;

  const rules = ALPHABET.indexOf(head[1]!);
  if (getRules(rules) === null) return null;

  const heights: number[] = [];
  const types: number[] = [];
  for (let i = 0; i < COLS; i++) {
    const h = ALPHABET.indexOf(head[2 + 2 * i]!);
    const t = ALPHABET.indexOf(head[3 + 2 * i]!);
    if (h > MAX_FLOORS || t > MAX_TYPE) return null;
    if ((h === 0) !== (t === 0)) return null;
    heights.push(h);
    types.push(t);
  }

  if (!/^[0-9a-z]+$/.test(scoreStr)) return null;
  if (scoreStr.length > 1 && scoreStr.startsWith('0')) return null;
  const score = parseInt(scoreStr, 36);
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return null;

  if (!/^[A-Z0-9_]*$/.test(nameStr)) return null;
  const name = nameStr.replace(/_/g, ' ');
  if (name.endsWith(' ')) return null;
  if (name.length > MAX_NAME || foldName(name) !== name) return null;

  return { rules, city: { heights, types }, name, score };
}
