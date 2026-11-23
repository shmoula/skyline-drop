import type { ImageLike, Skin, SkinManifest } from './types';
import { requiredFiles, validateSkin } from './validate';

const OPTIONAL_FILES = ['explosion.png', 'background.png'];

/**
 * Load and validate the skin folder at `baseUrl` (ending in '/').
 * Rejects with an Error whose message names every bad file, one per line.
 */
export async function loadSkin<I extends ImageLike>(
  baseUrl: string,
  loadImage: (url: string) => Promise<I>,
  fetchJson: (url: string) => Promise<unknown>,
): Promise<Skin<I>> {
  let manifest: unknown;
  try {
    manifest = await fetchJson(`${baseUrl}skin.json`);
  } catch {
    throw new Error('skin.json: could not be loaded');
  }
  const manifestProblems = validateSkin(manifest, {}).filter((e) => e.startsWith('skin.json'));
  if (manifestProblems.length > 0) throw new Error(manifestProblems.join('\n'));
  const m = manifest as SkinManifest;

  const required = requiredFiles(m);
  const loaded: Record<string, I | undefined> = {};
  const failures: string[] = [];
  await Promise.all(
    [...required, ...OPTIONAL_FILES].map(async (file) => {
      try {
        loaded[file] = await loadImage(`${baseUrl}${file}`);
      } catch {
        if (required.includes(file)) failures.push(`${file}: could not be loaded`);
      }
    }),
  );
  if (failures.length > 0) throw new Error(failures.sort().join('\n'));

  const problems = validateSkin(m, loaded);
  if (problems.length > 0) throw new Error(problems.join('\n'));

  const get = (file: string): I => loaded[file]!;
  return {
    manifest: m,
    plane: get('plane.png'),
    bomb: get('bomb.png'),
    explosion: loaded['explosion.png'] ?? null,
    ground: get('ground.png'),
    background: loaded['background.png'] ?? null,
    font: get('font.png'),
    buildings: Array.from({ length: m.buildingTypes }, (_, i) => ({
      floor: get(`building-${i + 1}-floor.png`),
      roof: get(`building-${i + 1}-roof.png`),
    })),
  };
}
