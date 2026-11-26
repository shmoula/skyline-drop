import { describe, expect, it } from 'vitest';
import { cityKey, decodeCity, decodeCityAllowEmpty, displayName, encodeCity, foldName, type SharedCity } from '../../src/city/code';
import { cityWith } from '../game/helpers';

const sample: SharedCity = { rules: 1, city: cityWith({ 0: 14, 7: 3, 19: 1 }), name: 'VASEK', score: 473 };

describe('city code', () => {
  it('round-trips', () => expect(decodeCity(encodeCity(sample))).toEqual(sample));
  it('round-trips an empty name and score 0', () => {
    const s = { ...sample, name: '', score: 0 };
    expect(decodeCity(encodeCity(s))).toEqual(s);
  });
  it('always ends in a base-36 digit, even with an empty name', () => {
    const s = { ...sample, name: '', score: 0 };
    const code = encodeCity(s);
    expect(code).toMatch(/[0-9a-z]$/);
    expect(code).toContain('..');
    expect(decodeCity(code)).toEqual(s);
    expect(encodeCity(sample)).toMatch(/\.VASEK\.d5$/);
  });
  it('encodeCity drops trailing spaces so the code never ends in _', () => {
    expect(encodeCity({ ...sample, name: 'AB ' })).toMatch(/\.AB\.d5$/);
  });
  it('rejects an all-empty city, unless empty is allowed', () => {
    const empty: SharedCity = { ...sample, city: cityWith({}) };
    const code = encodeCity(empty);
    expect(decodeCity(code)).toBeNull();
    expect(decodeCityAllowEmpty(code)).toEqual(empty);
    expect(decodeCityAllowEmpty(encodeCity(sample))).toEqual(sample);
    expect(decodeCityAllowEmpty('junk')).toBeNull();
  });
  it('round-trips names with spaces', () => {
    const s = { ...sample, name: 'A B C' };
    expect(decodeCity(encodeCity(s))).toEqual(s);
  });
  it('is URL-safe and short', () => {
    const c = encodeCity({ ...sample, name: 'ABCDEFGHIJ', score: 999999 });
    expect(c).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(c.length).toBeLessThan(70);
  });
  it('starts with the literal format marker 1', () => expect(encodeCity(sample)[0]).toBe('1'));
  it('round-trips boundary values', () => {
    const city = cityWith({ 5: 14 });
    city.types[5] = 63;
    const s: SharedCity = { rules: 1, city, name: 'ABCDEFGHIJ', score: 999999 };
    expect(decodeCity(encodeCity(s))).toEqual(s);
  });
  it('keeps style ids up to 63', () => {
    const city = cityWith({ 3: 2 });
    city.types[3] = 63;
    expect(decodeCity(encodeCity({ ...sample, city }))!.city.types[3]).toBe(63);
  });
  it.each([
    ['truncated', (c: string) => c.slice(0, 20)],
    ['newer format', (c: string) => '2' + c.slice(1)],
    ['unknown rules', (c: string) => c[0] + 'C' + c.slice(2)],
    ['height 15', (c: string) => c.slice(0, 2) + 'P' + c.slice(3)],
    ['type on empty column', (c: string) => c.slice(0, 5) + 'B' + c.slice(6)], // column 1 is empty in sample
    ['height 0 with type missing on built column', (c: string) => c.slice(0, 3) + 'A' + c.slice(4)],
    ['bad score', (c: string) => c.replace(/\.d5$/, '.-1')],
    ['upper-case score', (c: string) => c.replace(/\.d5$/, '.D5')],
    ['leading-zero score', (c: string) => c.replace(/\.d5$/, '.0d5')],
    ['empty score', (c: string) => c.replace(/\.d5$/, '.')],
    ['score over 999999', (c: string) => c.replace(/\.d5$/, '.lfls')],
    ['lower-case name', (c: string) => c.replace('.VASEK.', '.vasek.')],
    ['name too long', (c: string) => c.replace('.VASEK.', '.VASEKABCDEF.')],
    ['trailing-space name', (c: string) => c.replace('.VASEK.', '.VASEK_.')],
    ['old order (score first)', (c: string) => c.replace('.VASEK.d5', '.d5.VASEK')],
    ['extra segment', (c: string) => c + '.X'],
    ['junk', () => '%%%'],
    ['empty', () => ''],
  ])('rejects %s', (_, mangle) => expect(decodeCity(mangle(encodeCity(sample)))).toBeNull());

  it('folds names', () => {
    expect(foldName('Vašek')).toBe('VASEK');
    expect(foldName('  žluťoučký kůň 🐴 ')).toBe('ZLUTOUCKY ');
    expect(foldName('')).toBe('');
    expect(displayName('')).toBe('SOMEONE');
    expect(displayName('VASEK')).toBe('VASEK');
  });
  it('cityKey ignores name and score', () =>
    expect(cityKey(sample)).toBe(cityKey({ ...sample, name: 'X', score: 1 } as SharedCity)));
  it('cityKey differs for different cities', () =>
    expect(cityKey(sample)).not.toBe(cityKey({ ...sample, city: cityWith({ 1: 2 }) })));
});
