/**
 * Art QA gate for a skin folder.
 *   npm run skin:qa -- <skin>
 * Checks the skin contract (files, sizes, skin.json) and every PNG's pixels
 * (palette only, alpha 0 or 255). Exits 1 on any problem.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { validateSkin } from '../src/skin/validate';
import { checkSkinPixels } from './skin-pixels';

const skin = process.argv[2];
if (!skin || !/^[a-z0-9-]+$/.test(skin)) {
  console.error('usage: npm run skin:qa -- <skin-name>');
  process.exit(2);
}
const dir = join('public', 'skins', skin);
const manifestPath = join(dir, 'skin.json');
if (!existsSync(manifestPath)) {
  console.error(`${manifestPath}: missing`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const images: Record<string, PNG> = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.png'))) images[f] = PNG.sync.read(readFileSync(join(dir, f)));

const errors = validateSkin(manifest, images);
const palette: string[] | undefined = manifest.palette;
if (!palette) errors.push('skin.json: add a "palette" list so pixel colours can be checked');
else for (const [f, png] of Object.entries(images)) errors.push(...checkSkinPixels(png, f, palette));

if (errors.length > 0) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log(`✓ ${skin}: ${Object.keys(images).length} images pass size, palette and alpha checks`);
