export type Route = { kind: 'normal' } | { kind: 'edit' } | { kind: 'play'; code: string };

/** Picks the mode from the URL hash. The share code is returned undecoded. */
export function parseRoute(hash: string): Route {
  if (hash === '#edit') return { kind: 'edit' };
  if (hash.startsWith('#c=') && hash.length > 3) return { kind: 'play', code: hash.slice(3) };
  return { kind: 'normal' };
}

export function shareUrl(loc: { origin: string; pathname: string }, skin: string, code: string): string {
  const origin = loc.origin.replace(/\/+$/, '');
  return `${origin}${loc.pathname}?skin=${skin}#c=${code}`;
}
