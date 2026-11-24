/**
 * Compile a skin's text pixel charts into PNGs.
 *   npm run skin:build -- <skin>
 * Reads art/<skin>/*.chart and art/<skin>/legend.json (char → hex),
 * writes public/skins/<skin>/<chart name>.png. '.' is transparent.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { PNG } from 'pngjs';

const skin = process.argv[2];
if (!skin || !/^[a-z0-9-]+$/.test(skin)) {
  console.error('usage: npm run skin:build -- <skin-name>');
  process.exit(2);
}
const artDir = join('art', skin);
const outDir = join('public', 'skins', skin);
const legend: Record<string, string> = JSON.parse(readFileSync(join(artDir, 'legend.json'), 'utf8'));
if (typeof legend !== 'object' || legend === null || Array.isArray(legend)) {
  console.error('legend.json: must be an object mapping characters to #RRGGBB colours');
  process.exit(1);
}
const badLegend = Object.entries(legend).filter(([, v]) => typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v));
if (badLegend.length > 0) {
  for (const [ch, v] of badLegend) console.error(`legend.json: "${ch}" must be a #RRGGBB colour, is ${JSON.stringify(v)}`);
  process.exit(1);
}

let failed = false;
for (const file of readdirSync(artDir).filter((f) => f.endsWith('.chart')).sort()) {
  const rows = readFileSync(join(artDir, file), 'utf8').split(/\r?\n/).filter((r) => r.length > 0);
  const width = rows[0]?.length ?? 0;
  const ragged = rows.findIndex((r) => r.length !== width);
  if (width === 0 || ragged >= 0) {
    console.error(`${file}: row ${ragged + 1} is ${rows[ragged]?.length} wide, expected ${width}`);
    failed = true;
    continue;
  }
  const png = new PNG({ width, height: rows.length });
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const i = (y * width + x) * 4;
      if (ch === '.') return void png.data.fill(0, i, i + 4);
      const hex = legend[ch];
      if (!hex) {
        console.error(`${file}: unknown chart character "${ch}" at row ${y + 1}, column ${x + 1}`);
        failed = true;
        return;
      }
      png.data[i] = parseInt(hex.slice(1, 3), 16);
      png.data[i + 1] = parseInt(hex.slice(3, 5), 16);
      png.data[i + 2] = parseInt(hex.slice(5, 7), 16);
      png.data[i + 3] = 255;
    }),
  );
  const out = join(outDir, `${basename(file, '.chart')}.png`);
  writeFileSync(out, PNG.sync.write(png));
  console.log(`${out}  ${width}×${rows.length}`);
}
process.exit(failed ? 1 : 0);
