# Skyline Drop

A one-button city-bomber for desktop and phone browsers. Your plane flies by
itself, dropping one row lower every time it crosses the screen. Press to drop a
bomb (one at a time) and flatten the city before you fly into it. Clear the city
and you land; the next city is taller and denser.

**Controls:** Space, Enter, mouse click or tap anywhere.

## Run it

```bash
npm install
npm run dev      # play at http://localhost:5173
npm test         # game-rule and skin tests
npm run build    # static site in dist/
```

## Build and share a city

Press **Build a city** on the title screen, or open the game with `#edit` at
the end of the address. Tap or drag on the picture to set each column's height
(touch the ground to empty a column), pick a building style, and type your name.
The draft is kept in your browser, so a reload doesn't lose it. CLEARABLE / TOO
HARD in the corner is the game's own quick check.

- **Play** test-flies your city as one level.
- **Share** stays off until you have cleared *this exact city* yourself; editing
  it again turns Share off until you clear it again. That way every shared city
  is one somebody has beaten. The link carries your best clear as the score to
  beat: on phones it opens the share sheet, elsewhere it copies the link.

**Score:** floors bombed plus the clear bonus, plus a **height bonus** of 20
points for every row the plane is still above the ground when the city falls.
Clearing in fewer passes scores more; a crash gets no height bonus. Friends
see their score against yours, and their best on each city is kept.

Links look like `…/?skin=classic#c=<code>`. The city lives after `#`, so it
never reaches a server. Each code carries a **rules version** that pins plane
speed, bomb speed, plane width and scoring, so an old link keeps playing exactly
as it did when it was shared, even after the game is retuned. The skin only
changes the look; if the link's skin is gone, the city plays in `classic`.

## Make your own skin

The whole look comes from a skin folder: a few small PNGs plus `skin.json`.
Pick one with `?skin=<name>` in the address (default `classic`).

1. Copy `public/skins/classic` to `public/skins/<your-name>` (lower-case
   letters, digits and `-` only).
2. Replace the images. Sizes are fixed by the 16×8-pixel game grid:

   | File | Size | Notes |
   |---|---|---|
   | `plane.png` | 8 px tall, ≤ 32 px wide per frame | frames side by side; set `planeFrames` |
   | `bomb.png` | ≤ 16×8 | |
   | `explosion.png` (optional) | ≤ 16 px tall | frames side by side; set `explosionFrames` |
   | `ground.png` | 16×8 | repeated along the bottom |
   | `background.png` (optional) | 320×200 | otherwise `colours.background` fills the sky |
   | `font.png` | 16 × `charWidth` by 4 × `charHeight` | ASCII 32–95 in order, 16 per row |
   | `building-<n>-floor.png` | 16×8 | one pair per building type, `n` from 1 |
   | `building-<n>-roof.png` | 16×8 | drawn on top of each building |

3. Edit `skin.json`: `name`, `buildingTypes`, `font.charWidth/charHeight`,
   `planeFrames`, `explosionFrames`, `colours.background`, and `palette` (every
   hex colour you use).
4. Check it: `npm run skin:qa -- <your-name>` checks sizes, that every colour is
   in your palette, and that there are no half-transparent (blurry) pixels.
5. Open `http://localhost:5173/?skin=<your-name>`.

### Drawing with charts (optional)

Instead of a paint program you can draw each image as a text "knitting chart",
one character per pixel, the way the classic skin is made:

- `art/<skin>/STYLE.md` — the style guide: palette, outline and naming rules.
- `art/<skin>/legend.json` — which character is which colour (`.` = transparent).
- `art/<skin>/<image>.chart` — the pixel rows.
- `npm run skin:build -- <skin>` writes the PNGs into `public/skins/<skin>/`,
  then run `skin:qa`.

If you use scans or AI-generated art, shrink it to the exact size without
smoothing, snap every colour to your palette, clean up stray pixels, and let
`skin:qa` be the gate. Record the tools and licences in the skin's `CREDITS.md`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: tests, build, and publish
`dist/` to GitHub Pages (enable Pages → "GitHub Actions" in the repo settings).
The build uses relative paths, so it works from any sub-path.

## License

Code: [MIT](LICENSE). Skins carry their own license in their `CREDITS.md` —
the bundled `classic` skin is CC0. If you contribute a skin, state its license
there.
