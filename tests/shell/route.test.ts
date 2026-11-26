import { describe, expect, it } from 'vitest';
import { parseRoute, shareUrl } from '../../src/shell/route';

describe('parseRoute', () => {
  it('maps hashes to routes', () => {
    expect(parseRoute('')).toEqual({ kind: 'normal' });
    expect(parseRoute('#edit')).toEqual({ kind: 'edit' });
    expect(parseRoute('#c=1Babc')).toEqual({ kind: 'play', code: '1Babc' });
    expect(parseRoute('#c=')).toEqual({ kind: 'normal' });
    expect(parseRoute('#other')).toEqual({ kind: 'normal' });
  });
});

describe('shareUrl', () => {
  it('builds the share link', () => {
    expect(shareUrl({ origin: 'https://x.io', pathname: '/skyline-drop/' }, 'classic', '1B')).toBe(
      'https://x.io/skyline-drop/?skin=classic#c=1B',
    );
  });
  it('does not double slashes and keeps pathname as given', () => {
    expect(shareUrl({ origin: 'https://x.io/', pathname: '/a' }, 's', 'c')).toBe('https://x.io/a?skin=s#c=c');
    expect(shareUrl({ origin: 'https://x.io', pathname: '/' }, 's', 'c')).toBe('https://x.io/?skin=s#c=c');
  });
});
