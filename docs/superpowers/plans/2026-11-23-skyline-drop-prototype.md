# Skyline Drop — Playable Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every code task follows the project `tdd` skill (vertical red → green slices, tests only at the seams listed below). Module shapes follow the project `codebase-design` skill. Art tasks follow `art-consistency` and `ai-game-art-generation`.

**Goal:** A one-button city-bomber game in the browser (desktop + phone) whose whole look comes from a swappable skin folder.

**Architecture:** One deep, pure game-rules module (`newGame` / `step`) owns all gameplay; the browser shell (loop, input, renderer, storage) is thin and adapts it to the canvas. Skins are folders of PNGs + `skin.json`, validated by one shared function used both by the in-browser loader and a Node QA script. The placeholder art is authored as text "knitting charts" and compiled to PNGs, so palette and pixel grid are enforced by construction.

**Tech Stack:** TypeScript (strict), Vite, Vitest, HTML canvas 2D. Dev-only: `pngjs` (PNG read/write in Node scripts), `tsx` (run TS scripts).

**Spec:** `docs/superpowers/specs/2026-11-23-city-bomber-design.md`

## Global Constraints

- Logical screen 320×200 px; cells 16 px wide × 8 px tall → 20 columns × 25 rows. Rows 0–1 HUD, row 2 plane start, row 24 ground, buildings stand on row 23 upward.
- Nearest-neighbour scaling only (`imageSmoothingEnabled = false`, CSS `image-rendering: pixelated`); letterboxed, centred; integer scale when it fits, else largest fractional fit.
- One logical button: Space, Enter, mouse click, touch tap anywhere. Prevent page scroll/zoom on touch.
- Plane always flies left → right, wraps, one row lower per wrap. Plane sprite exactly 8 px tall, ≤ 32 px wide per frame. Bomb sprite ≤ 16×8.
- One bomb on screen; presses while a bomb is active are ignored (not queued).
- `floorsPerBomb` = 3; score = floors × level; level-clear bonus = 50 × level.
- Every generated level clearable by a perfect player (budget rule, margin 0.7).
- Best score in `localStorage`. Pause when the page is hidden.
- Skin: `public/skins/<name>/`, chosen by `?skin=<name>`, default `classic`. Missing/invalid file → on-screen error naming the file.
- Title must not be "Blitz"; no copied sprites/fonts/layouts from existing games. Working title "Skyline Drop".
- Static build with Vite `base: './'`; no backend.
- Commit messages: Conventional Commits, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Seams under test (confirm with owner before Task 2 — `tdd` skill rule)

| Seam | Module | Why it's tested |
|---|---|---|
| `newGame` / `step` | `src/game/game.ts` | All gameplay rules; the deep module. |
| `generateCity` / `floorBudget` | `src/game/city.ts` | Solvability guarantee is complex and easy to break while tuning. |
| `validateSkin` | `src/skin/validate.ts` | The skin contract every future skin relies on. |
| `fitViewport` | `src/shell/viewport.ts` | Scaling on every device/rotation. |
| `advanceClock` | `src/shell/clock.ts` | Fixed-step timing; tab-hidden catch-up. |
| `readBest` / `writeBest` | `src/shell/bestScore.ts` | Storage can be missing or corrupt. |
| `checkSkinPixels` | `scripts/skin-qa.ts` | Art QA: palette, alpha, sizes. |

Not unit-tested (manual verification): renderer drawing, DOM input wiring, `main.ts`.

## Review Focus

1. **Button held/mashed through death** — game-over screen must not be skipped; presses within 500 ms of reaching `gameOver` are ignored. (Task 4 test.)
2. **Phone rotation / tiny or portrait windows** — viewport recomputed, never scale 0, letterbox correct for 375×812. (Task 8 test.)
3. **Tab hidden for minutes, then resumed** — no burst of thousands of steps; elapsed time clamped to 250 ms. (Task 8 test.)
4. **Bomb pressed while the plane is partly off-screen** — plane centre outside columns 0–19 → press ignored, no exception. (Task 3 test.)
5. **`localStorage` blocked or holding garbage** (`"abc"`, `"-5"`, throwing getter) → best = 0, no exception; write failures swallowed. (Task 8 test.)

---

## File structure

```
index.html                     # canvas + error box
vite.config.ts                 # base './', vitest config
src/game/grid.ts               # screen/grid constants
src/game/tuning.ts             # Tuning type + DEFAULT_TUNING
src/game/rng.ts                # seeded PRNG (mulberry32), pure
src/game/city.ts               # generateCity, floorBudget
src/game/game.ts               # newGame, step, GameState (deep module)
src/skin/types.ts              # SkinManifest, Skin, ImageLike
src/skin/validate.ts           # validateSkin (shared with Node QA)
src/skin/load.ts               # loadSkin(baseUrl, loadImage)
src/shell/viewport.ts          # fitViewport
src/shell/clock.ts             # advanceClock
src/shell/bestScore.ts         # readBest, writeBest
src/shell/input.ts             # createButton (DOM adapter)
src/render/renderer.ts         # createRenderer(ctx, skin).draw(state)
src/main.ts                    # wiring
art/classic/STYLE.md           # skin style bible
art/classic/*.chart            # text pixel charts
scripts/build-skin.ts          # charts → PNGs
scripts/skin-qa.ts             # palette/alpha/size QA
public/skins/classic/*         # generated PNGs + skin.json + CREDITS.md
tests/**                       # Vitest, mirrors src/
```

---

### Task 1: Project scaffold

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts` (stub), `src/game/grid.ts`, `.gitignore`, `tests/game/grid.test.ts`

**Interfaces:**
- Produces: `SCREEN_W=320, SCREEN_H=200, CELL_W=16, CELL_H=8, COLS=20, ROWS=25, PLANE_START_ROW=2, GROUND_ROW=24` from `src/game/grid.ts`.
- Scripts: `npm run dev`, `npm run build`, `npm test` (vitest run), `npm run skin:build`, `npm run skin:qa`.

- [ ] **Step 1:** `git init`; create `.gitignore` (`node_modules`, `dist`). `npm init -y`; install dev deps `typescript vite vitest pngjs @types/pngjs tsx`.
- [ ] **Step 2: Write the failing test** `tests/game/grid.test.ts`: `grid matches 320x200 split into 16x8 cells` — asserts `COLS*CELL_W === 320`, `ROWS*CELL_H === 200`, `COLS === 20`, `ROWS === 25`, `GROUND_ROW === 24`, `PLANE_START_ROW === 2`.
- [ ] **Step 3:** Run `npm test` → FAIL (module not found).
- [ ] **Step 4:** Create `grid.ts`, `tsconfig.json` (`strict: true`, `target ES2022`, `moduleResolution bundler`), `vite.config.ts` (`base: './'`, `test.environment: 'node'`), `index.html` with `<canvas id="game" width="320" height="200">` and `<div id="error" hidden>`; CSS: body black, margin 0, canvas `image-rendering: pixelated`, `touch-action: none`.
- [ ] **Step 5:** `npm test` → PASS; `npm run build` → succeeds.
- [ ] **Step 6: Commit** `chore: scaffold vite + typescript + vitest project`

---

### Task 2: Game start and plane flight

**Files:** Create `src/game/tuning.ts`, `src/game/rng.ts`, `src/game/game.ts`; Test `tests/game/game.flight.test.ts`

**Interfaces:**
- Produces (`tuning.ts`):
  ```ts
  interface Tuning { planeSpeedPxPerS: number; planeSpeedGrowth: number; planeSpeedMaxPxPerS: number; bombFallPxPerS: number;
    floorsPerBomb: number; clearBonusPerLevel: number; landingDropMs: number; landingPauseMs: number;
    crashMs: number; gameOverLockMs: number; budgetMargin: number }
  DEFAULT_TUNING = { planeSpeedPxPerS: 60, planeSpeedGrowth: 1.05, planeSpeedMaxPxPerS: 100, bombFallPxPerS: 120, floorsPerBomb: 3,
    clearBonusPerLevel: 50, landingDropMs: 250, landingPauseMs: 1500, crashMs: 1000, gameOverLockMs: 500, budgetMargin: 0.7 }
  ```
- Produces (`rng.ts`): `nextRandom(state: number): [value: number /*0..1*/, nextState: number]` (mulberry32).
- Produces (`game.ts`):
  ```ts
  type Phase = 'title' | 'playing' | 'clearing' | 'landed' | 'crashed' | 'gameOver';
  interface City { heights: number[] /*len COLS, 0=empty*/; types: number[] /*1..buildingTypes*/ }
  interface Explosion { x: number; y: number; ageMs: number }
  interface GameState { phase: Phase; timerMs: number; level: number; score: number; best: number; newBest: boolean;
    plane: { x: number; row: number }; planeWidth: number; buildingTypes: number;
    bomb: { col: number; y: number } | null; city: City; explosions: Explosion[]; rngState: number; tuning: Tuning }
  interface NewGameOptions { best: number; seed: number; planeWidth: number; buildingTypes: number; tuning?: Partial<Tuning> }
  newGame(opts: NewGameOptions): GameState        // phase 'title'
  step(s: GameState, input: { pressed: boolean }, dtMs: number): GameState   // pure; never mutates s
  ```
  Tests set up scenarios by starting a run via `newGame` + `step` and then replacing only `city`, `plane`, `level`, `score` or `best` in the returned object (a test helper `startedGame(overrides)` in `tests/game/helpers.ts`). No other state surgery.

- [ ] **Step 1: Failing test** `title waits for the button`: `step(newGame(...), {pressed:false}, 16)` stays `'title'`; with `{pressed:true}` → `'playing'`, `level 1`, `score 0`, `plane {x: -planeWidth, row: 2}`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement `newGame` and the title→playing transition (city generation stubbed to an empty-but-for-one-building city until Task 5). **Step 4:** Run → PASS.
- [ ] **Step 5: Failing test** `plane flies right at 60 px/s on level 1`: after start, 60 steps of 1000/60 ms → `plane.x ≈ -planeWidth + 60` (toBeCloseTo, 3).
- [ ] **Step 6:** Implement movement; speed = `planeSpeedPxPerS * planeSpeedGrowth^(level-1)`. Run → PASS.
- [ ] **Step 7: Failing test** `plane wraps to the left edge one row lower`: with plane at `x = 319.5`, an empty city, one step of 100 ms → `x` in `[-planeWidth, -planeWidth + 6]`, `row === 3`.
- [ ] **Step 8:** Implement wrap (`x >= SCREEN_W` → `x -= SCREEN_W + planeWidth`, `row += 1`). Run → PASS.
- [ ] **Step 9:** `npm test` all green. **Commit** `feat(game): start a run and fly the plane with wrap-and-descend`

---

### Task 3: Bombs, floors and scoring

**Files:** Modify `src/game/game.ts`; Test `tests/game/game.bomb.test.ts`

**Interfaces:**
- Consumes: Task 2 `GameState`, `step`.
- Behaviour pinned: on press with `bomb === null`, `col = floor((plane.x + planeWidth/2) / CELL_W)`; if `0 ≤ col < COLS` spawn `{col, y: (plane.row + 1) * CELL_H}`. Bomb `y += bombFallPxPerS * dt`. Building top y = `(GROUND_ROW - h) * CELL_H`. When `y + CELL_H ≥ topY` and `h > 0`: remove `min(floorsPerBomb, h)`, `score += removed * level`, push explosion at `(col*CELL_W, topY)`, bomb → null. When `y + CELL_H ≥ GROUND_ROW*CELL_H` over an empty column: bomb → null, no score.

- [ ] **Step 1: Failing test** `bomb removes three floors and scores them`: city with column 5 height 6 (others 0), plane centred over column 5 on row 2, press, step until `bomb === null` → `heights[5] === 3`, `score === 3`, `explosions.length === 1`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5: Failing test** `short building is removed entirely, score counts only what was there`: height 2 → `heights === 0`, `score === 2`. Level 3 variant: height 6, one bomb → `score === 9`. Implement if needed; PASS.
- [ ] **Step 6: Failing test** `only one bomb at a time, extra presses are dropped`: press, then press again next step while bomb falls → still one bomb; after it lands, no second bomb appears without a new press.
- [ ] **Step 7: Failing test** `bomb over empty ground just disappears`: empty column → bomb null, `score === 0`.
- [ ] **Step 8: Failing test (Review Focus 4)** `press while plane centre is off-screen is ignored`: `plane.x = -planeWidth` (centre < 0) → `bomb === null`, no throw; same at `x = 315` with width 16 (centre ≥ 320).
- [ ] **Step 9:** Implement remaining; `npm test` green. **Commit** `feat(game): drop bombs that knock floors off buildings and score them`

---

### Task 4: Crash, game over, best score, restart

**Files:** Modify `src/game/game.ts`; Test `tests/game/game.crash.test.ts`

**Interfaces:**
- Behaviour pinned: in `playing`/`clearing`, plane overlaps columns `floor(max(x,0)/CELL_W) .. floor(min(x+planeWidth-1, SCREEN_W-1)/CELL_W)` (none if fully off-screen). Crash if any overlapped column has `heights[c] ≥ GROUND_ROW - plane.row`. Crash → phase `crashed`, explosion at plane, `timerMs` counts up; after `crashMs` → `gameOver`, `newBest = score > best`, `best = max(best, score)`. In `gameOver`, press ignored while `timerMs < gameOverLockMs`; afterwards press starts a new run (level 1, score 0, new city, best kept).

- [ ] **Step 1: Failing test** `plane flying into a building crashes`: column 4 height 22 (top at row 2), plane on row 2 approaching from the left → after enough steps phase `crashed`; after `crashMs` more → `gameOver`.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3: Failing test** `plane just above a building flies over it`: height 21, plane row 2 → stays `playing` across the whole pass.
- [ ] **Step 4: Failing test** `wrap into a tall building in column 0 crashes`: row 2 → wraps to row 3, column 0 height 21 → `crashed`.
- [ ] **Step 5: Failing test** `new best is recorded at game over`: best 10, score 25 → `best 25`, `newBest true`; best 30, score 25 → `best 30`, `newBest false`.
- [ ] **Step 6: Failing test (Review Focus 1)** `button held through death does not skip game over`: pressed every step from crash on → phase still `gameOver` at `timerMs = 499`; a press at `timerMs ≥ 500` → `playing`, `score 0`, `level 1`, `best` preserved.
- [ ] **Step 7:** Implement; `npm test` green. **Commit** `feat(game): crash into buildings, game over with best score and restart`

---

### Task 5: City generation with solvability budget

**Files:** Create `src/game/city.ts`; Modify `src/game/game.ts` (use it); Test `tests/game/city.test.ts`

**Interfaces:**
- Produces:
  ```ts
  floorBudget(maxHeight: number, level: number, planeWidth: number, tuning: Tuning): number
  generateCity(level: number, opts: { rngState: number; buildingTypes: number; planeWidth: number; tuning: Tuning }): { city: City; rngState: number }
  ```
- Budget rule (spec: "passes × bombs per pass × floorsPerBomb"):
  - `passes = (GROUND_ROW - maxHeight) - PLANE_START_ROW` (rows the plane can fly before reaching the tallest top)
  - `passMs = (SCREEN_W + planeWidth) / speed(level) * 1000`
  - `fallMs = ((GROUND_ROW - PLANE_START_ROW - 1) * CELL_H) / bombFallPxPerS * 1000` (worst case: bomb from start row to ground)
  - `bombsPerPass = floor(passMs / fallMs)`
  - `budget = passes * bombsPerPass * floorsPerBomb`
- Growth per level (all clamped): occupied columns `min(8 + 2*(level-1), 18)`; height range `[1 + floor((level-1)/2), min(4 + level, 16)]`; types uniform in `1..buildingTypes`.
- Enforcing the budget (deterministic, no retry loop): after drawing heights, while `totalFloors > budgetMargin * floorBudget(currentMaxHeight, …)`, remove one floor from the currently tallest building (lowest column index on ties). Lowering the max only raises the budget, so this always terminates. Columns trimmed to 0 become gaps. (Plan-level refinement of the spec's "reject/regenerate": same guarantee, no unbounded loop.)
- Speed uses `min(planeSpeedPxPerS * planeSpeedGrowth^(level-1), planeSpeedMaxPxPerS)` everywhere (game and budget).

- [ ] **Step 1: Failing test** `budget worked example`: `floorBudget(10, 1, 16, DEFAULT_TUNING) === 144` (passes 12; passMs 5600; fallMs 1400; 4 bombs/pass; ×3).
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3: Failing test** `every level 1–20 is clearable`: for seeds 1..20 and levels 1..20, total floors ≤ `0.7 * floorBudget(maxHeight, level, 16, DEFAULT_TUNING)`; total floors > 0; `heights.length === 20`; all heights in `0..16`; occupied columns ≤ `min(8 + 2*(level-1), 18)`; all `types` of occupied columns in `1..3`.
- [ ] **Step 4: Failing test** `same seed, same city`: two calls with equal inputs → deep-equal.
- [ ] **Step 5: Failing test** `later levels are taller and denser`: across seeds 1..20, mean total floors at level 6 > level 1.
- [ ] **Step 6:** Implement; wire `game.ts` to call `generateCity` on run start and next level. `npm test` green. **Commit** `feat(game): generate random cities that are always clearable`

---

### Task 6: Level clear, landing, next level

**Files:** Modify `src/game/game.ts`; Test `tests/game/game.level.test.ts`

**Interfaces:**
- Behaviour pinned: in `playing`, when all heights are 0 (and no bomb in flight) → `score += clearBonusPerLevel * level`, phase `clearing`. In `clearing` the plane keeps flying (wrap still applies) and drops one row every `landingDropMs` until `row === GROUND_ROW - 1` → phase `landed`. After `landingPauseMs` → `level += 1`, new city, plane reset to `{x: -planeWidth, row: 2}`, phase `playing`. Presses during `clearing`/`landed` do nothing.

- [ ] **Step 1: Failing test** `clearing the last floor pays the level bonus`: one building height 3, level 2 → after the bomb: `score === 3*2 + 100`, phase `clearing`.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3: Failing test** `plane descends and lands, then the next level starts`: from `clearing` on row 2, step 21 × 250 ms → `landed`, `row 23`; + 1500 ms → `playing`, `level 3`, `row 2`, city total floors > 0.
- [ ] **Step 4: Failing test** `plane is faster on the next level`: x advance over 1000 ms on level 2 ≈ 63 px (toBeCloseTo, 1).
- [ ] **Step 5:** Implement; green. **Commit** `feat(game): land after clearing the city and move to a harder level`

---

### Task 7: Skin contract — validate and load

**Files:** Create `src/skin/types.ts`, `src/skin/validate.ts`, `src/skin/load.ts`; Test `tests/skin/validate.test.ts`, `tests/skin/load.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface SkinManifest { name: string; buildingTypes: number; font: { charWidth: number; charHeight: number };
    planeFrames: number; explosionFrames: number; colours: { background: string }; palette?: string[] }
  interface ImageLike { width: number; height: number }
  interface Skin<I extends ImageLike = ImageLike> { manifest: SkinManifest; plane: I; bomb: I; explosion: I | null;
    ground: I; background: I | null; font: I; buildings: { floor: I; roof: I }[] /*index 0 = type 1*/ }
  requiredFiles(m: SkinManifest): string[]   // plane.png, bomb.png, ground.png, font.png, building-<n>-floor.png, building-<n>-roof.png
  validateSkin(manifest: unknown, images: Record<string, ImageLike | undefined>): string[]   // [] when valid; each message names the file
  loadSkin<I extends ImageLike>(baseUrl: string, loadImage: (url: string) => Promise<I>, fetchJson: (url: string) => Promise<unknown>): Promise<Skin<I>>
  // rejects with Error whose message is the joined validateSkin messages, or "<file>: could not be loaded"
  ```
- `palette` is a new optional manifest field (hex strings) used by art QA only; additive to the spec's format.
- Size rules: floor/roof/ground 16×8; plane height 8, width divisible by `planeFrames`, frame width ≤ 32; bomb ≤ 16×8; explosion height ≤ 16, width divisible by `explosionFrames`; font `16*charWidth × 4*charHeight`; background, if present, 320×200.

- [ ] **Step 1: Failing test** `a complete classic-shaped skin is valid`: manifest with 3 types and correctly sized fakes → `[]`.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3: Failing tests**, one per rule, each asserting the message contains the file name: missing `building-2-roof.png`; `plane.png` 16×9 → mentions `plane.png` and `8 px tall`; `building-1-floor.png` 16×16; font wrong size; manifest missing `buildingTypes` → mentions `skin.json`.
- [ ] **Step 4: Failing test** (`load.test.ts`) `loadSkin assembles images in type order`: fakes for `fetchJson`/`loadImage` → `skin.buildings[2].roof` is the image loaded from `…/building-3-roof.png`; optional `background.png` failing to load → `background === null`, no rejection.
- [ ] **Step 5: Failing test** `loadSkin rejects naming the missing file`: `loadImage` rejects for `bomb.png` → rejection message contains `bomb.png`.
- [ ] **Step 6:** Implement; green. **Commit** `feat(skin): validate and load skin folders with file-specific errors`

---

### Task 8: Browser shell — viewport, clock, best score, input

**Files:** Create `src/shell/viewport.ts`, `src/shell/clock.ts`, `src/shell/bestScore.ts`, `src/shell/input.ts`; Test `tests/shell/*.test.ts`

**Interfaces:**
- Produces:
  ```ts
  fitViewport(winW: number, winH: number): { scale: number; x: number; y: number; width: number; height: number }
  advanceClock(accMs: number, elapsedMs: number, stepMs?: number /*1000/60*/, maxElapsedMs?: number /*250*/): { steps: number; accMs: number }
  readBest(storage: Pick<Storage, 'getItem'> | null): number      // key 'skylinedrop.best'
  writeBest(storage: Pick<Storage, 'setItem'> | null, best: number): void
  createButton(target: Window): { consume(): boolean; dispose(): void }   // true if pressed since last consume
  ```

- [ ] **Step 1: Failing test** `viewport integer scale when it fits`: `fitViewport(1280, 800)` → `{scale 4, x 0, y 0, width 1280, height 800}`; `fitViewport(1000, 800)` → `scale 3`, `x 20`, `y 100`.
- [ ] **Step 2: Failing test (Review Focus 2)** `viewport fractional fit on small/portrait screens`: `fitViewport(375, 812)` → `scale ≈ 1.171875`, `width 375`, `height ≈ 234.375`, `y ≈ 288.8`; `fitViewport(200, 100)` → `scale 0.5`; `fitViewport(0, 0)` → `scale > 0` (min 0.1), no NaN.
- [ ] **Step 3:** FAIL → implement → PASS.
- [ ] **Step 4: Failing test** `clock runs whole fixed steps and carries the rest`: `advanceClock(0, 40)` → `steps 2`, `accMs ≈ 6.667`.
- [ ] **Step 5: Failing test (Review Focus 3)** `long pauses are clamped`: `advanceClock(0, 600000)` → `steps 15`.
- [ ] **Step 6: Failing tests (Review Focus 5)** `best score survives bad storage`: `null` → 0; `"abc"` → 0; `"-5"` → 0; `"42"` → 42; `getItem` throws → 0; `writeBest` with throwing `setItem` → no throw; `writeBest(fake, 7)` then `readBest(fake)` → 7.
- [ ] **Step 7:** Implement all four; `input.ts` listens for `keydown` (Space/Enter, ignoring `repeat`), `pointerdown`, and calls `preventDefault` on `touchstart`/`touchmove` (`passive: false`). Not unit-tested.
- [ ] **Step 8:** green. **Commit** `feat(shell): viewport fitting, fixed-step clock, best-score storage and one-button input`

---

### Task 9: Placeholder skin "classic" (art)

Follows `art-consistency` (style bible first, exact palette, QA every asset) and `ai-game-art-generation` (pixel art at exact target size, palette enforced in post, no anti-aliasing, license paper trail). No AI generation for this skin: at 16×8 tiles, hand-authored charts are exact, and diffusion models produce anti-aliased, inconsistent pixels at this scale (`pixel-art-anti-aliasing-artifacts`).

**Files:** Create `art/classic/STYLE.md`, `art/classic/*.chart`, `scripts/build-skin.ts`, `scripts/skin-qa.ts`, `public/skins/classic/skin.json`, `public/skins/classic/CREDITS.md`, generated `public/skins/classic/*.png`; Test `tests/scripts/skin-qa.test.ts`

**Interfaces:**
- Chart format: first line `palette: <name>` optional; then rows of single characters, one per pixel; `.` = transparent; other characters map via the legend in `STYLE.md` (e.g. `K` black, `W` white, `R` red, `Y` yellow, `G` green, `B` blue, `S` grey). Multi-frame strips: frames side by side in one chart.
- `scripts/build-skin.ts <skin>`: reads `art/<skin>/*.chart` + palette from `public/skins/<skin>/skin.json`, writes `public/skins/<skin>/<chart-name>.png` (alpha 0 or 255 only).
- Produces: `checkSkinPixels(png: { width: number; height: number; data: Uint8Array }, file: string, palette: string[]): string[]` — errors for any pixel with alpha not in {0,255} and any opaque colour not in the palette. `npm run skin:qa -- <skin>` = `validateSkin` (sizes) + `checkSkinPixels` (every PNG), exits 1 on any error.

- [ ] **Step 1:** Write `STYLE.md` (the skin bible): palette — 8 colours, exact hex (`#000000`, `#ffffff`, `#b0b0b0`, `#e04040`, `#f0d040`, `#40a040`, `#4060d0`, `#80c0f0`); background `#ffffff`; 1 px black outlines on buildings; window pattern = 1 px light-blue panes on white, every other pixel; light from the left; plane red with black outline; 3 building types (tall office, brick block, tower with antenna roof); fixed vocabulary (always "floor", "roof", "pane"). Original designs only.
- [ ] **Step 2: Failing test** `QA flags anti-aliased and off-palette pixels`: 2×1 image with alpha 128 → one error naming the file and `alpha`; opaque `#123456` → error naming the colour; clean palette image → `[]`.
- [ ] **Step 3:** FAIL → implement `checkSkinPixels` and the CLI → PASS.
- [ ] **Step 4:** Implement `build-skin.ts`; author charts: `plane` (24×8, 1 frame), `bomb` (4×6), `explosion` (4 frames of 16×16), `ground` (16×8), `font` (16×4 grid of 8×8; A–Z, 0–9, space, `! : - .` hand-drawn, others blank), `building-{1,2,3}-{floor,roof}` (16×8). `skin.json` per spec plus `palette`.
- [ ] **Step 5:** `npm run skin:build -- classic && npm run skin:qa -- classic` → exit 0, no errors.
- [ ] **Step 6:** `CREDITS.md`: "Hand-authored pixel charts, no AI tools used. License: CC0." 
- [ ] **Step 7: Commit** `feat(skin): add hand-charted classic placeholder skin with style bible and QA`

---

### Task 10: Renderer and main loop — first playable

**Files:** Create `src/render/renderer.ts`; Modify `src/main.ts`, `index.html`

**Interfaces:**
- Consumes: `GameState`, `step`, `newGame` (Tasks 2–6), `loadSkin` (7), `fitViewport`, `advanceClock`, `readBest`/`writeBest`, `createButton` (8).
- Produces: `createRenderer(ctx: CanvasRenderingContext2D /*320×200 offscreen*/, skin: Skin<HTMLImageElement>): { draw(s: GameState): void }`.
- Draw order: background (image or colour) → buildings (top cell roof, rest floor, by type) → ground tiles across row 24 → bomb → plane (frame by `floor(t/100) % planeFrames`) → explosions (frame by age, 80 ms/frame; skip if no strip) → HUD text: `SCORE n` left, `BEST n` right on row 0. Title: game title, `PRESS TO PLAY`, `BEST n`. Game over: `GAME OVER`, `SCORE n`, `NEW BEST!` when `newBest`, `PRESS TO PLAY` once lock has elapsed.
- `main.ts`: read `?skin=` (default `classic`, allow `[a-z0-9-]+` only), `loadSkin('./skins/<name>/', …)`; on rejection show `#error` with the message. Offscreen 320×200 canvas → blit to the visible canvas sized by `fitViewport(innerWidth, innerHeight)` on `resize`/`orientationchange`. rAF loop: `advanceClock`, run `step` `steps` times (button consumed on the first step only), `writeBest` when `best` changes. `visibilitychange` hidden → stop accumulating; on return reset the last timestamp.

- [ ] **Step 1:** Implement renderer + wiring.
- [ ] **Step 2: Manual verification** (`npm run dev`), each item checked:
  - Title → Space starts; plane flies left→right, wraps one row lower.
  - Space / click / tap drops one bomb; extra presses while falling do nothing; floors disappear 3 at a time; score rises by floors × level.
  - Clearing the city → plane descends, lands, next level is taller; bonus added.
  - Crash → explosion → game over; holding Space doesn't skip it; best persists after reload.
  - Browser devtools phone emulation (375×812 portrait and landscape): crisp pixels, letterboxed, tap works, no page scroll.
  - `?skin=missing` → error box naming `skin.json`; deleting `bomb.png` locally → error naming `bomb.png` (restore after).
  - Switching tab for 30 s and back → no jump/teleport.
- [ ] **Step 3:** `npm test` and `npm run build` green. **Commit** `feat: render the game from the active skin and wire the main loop`

---

### Task 11: Ship it — build, deploy, skin authoring guide

**Files:** Create `README.md`, `.github/workflows/deploy.yml`

- [ ] **Step 1:** `README.md`: what the game is, `npm run dev/test/build`, and **How to make a skin**: copy `public/skins/classic`, file list and sizes (from Task 7 rules), `skin.json` fields, charts workflow (`art/<skin>/STYLE.md` → charts → `skin:build` → `skin:qa`), or drop in your own PNGs and run `skin:qa`; open with `?skin=<name>`.
- [ ] **Step 2:** GitHub Pages workflow: on push to `main`, `npm ci && npm test && npm run build`, deploy `dist/` with `actions/deploy-pages`.
- [ ] **Step 3:** `npm run build && npx vite preview` → game loads from `dist/` with a sub-path (`/skyline-drop/`) thanks to `base: './'`.
- [ ] **Step 4: Commit** `docs: add README with skin authoring guide and pages deploy workflow`

---

## Backlog after the prototype (not planned in detail)

Ordered by owner value; each gets its own spec/plan when picked up.

1. **Owner's skin (old drawings or the sweater look)** — first follow-up; proves skin swapping. Per `art-consistency`: write `art/<skin>/STYLE.md` bible first (exact palette hex, outline, pattern vocabulary), check the art fits 16×8 cells / 320×200. If drawings are scanned or AI-assisted (`ai-game-art-generation`): generate/scan large → nearest-neighbour downscale to exact size → quantize to the bible palette → manual pixel cleanup → `skin:qa` gate; record tools and license tier in `CREDITS.md`.
2. **Tuning pass** — playtest speeds, `floorsPerBomb`, growth curve, budget margin on real phones.
3. **Sound** — bomb drop, hit, crash, landing; optional per-skin sound files.
4. **Skin picker** — on title screen instead of only `?skin=`.
5. **Portrait phone layout** — taller playfield or rotate hint.
6. **More building types / animated plane** — skin format already allows N types and frames.
7. **Two-player mode** (Canyon Bomber style) and **miss limit** — game-rule extensions in `step`.

## Self-review notes

- Spec coverage: screen/grid (T1, T8, T10), plane (T2, T4), bomb (T3), buildings/levels/solvability/roof rule (T5, T6, T10), scoring/best (T3, T4, T6, T8), screens/flow (T2, T4, T10), input (T8, T10), loop/pause (T8, T10), skin format/loader/errors/`?skin` (T7, T10), placeholder skin (T9), owner's skin (backlog 1), testing (all), deploy/`base './'` (T1, T11).
- Additive spec changes: optional `palette` in `skin.json` (QA only); plane speed capped at 100 px/s so late levels keep ≥ 2 bombs per pass; budget enforced by trimming the tallest building instead of regenerating.
- Budget numbers checked: level 1 (maxH 5) budget 204 → cap 142 vs ≤ 40 floors drawn; level 20 at capped speed: 2 bombs/pass, trimming keeps it clearable.
