# City Bomber — Design (playable prototype)

Date: 2026-11-23
Status: awaiting owner approval
Working title: **Skyline Drop** (placeholder, my call — rename freely; must not be "Blitz")

## Intent and why

A one-button browser arcade game in the "plane bombs a city" genre (Blitz 1981,
Canyon Bomber 1977, 90s DOS town-bombers). Two motivations:

1. **Nostalgia** — the owner built a similar game in Pascal long ago and has
   drawings from it.
2. **Reskinnability** — they saw retro graphics on a sweater and want to see that
   look in this kind of game. The game must be easy to restyle by dropping in a
   handful of new images.

Success = a game that is fun to play for a few minutes on desktop and phone, and a
new look can be produced by drawing ~8–12 small PNGs, with no code changes.

## Goals

- Playable single-player game loop: title → play → game over → play again.
- Runs in desktop and mobile browsers; one button = key, click or tap.
- Skins are folders of images plus a small settings file; swapping a skin requires
  no code changes.
- Small, understandable codebase with game logic testable without a browser.

## Non-goals (prototype)

- Two players, miss limit, sound/music, town names, hand-authored level layouts,
  multiple bomb types, online leaderboards, native app packaging.
  (All candidates for the later backlog.)

## Anti-goals

- A recreation of a specific existing game: no "Blitz" title, no copied sprites,
  fonts or screen layouts. Genre mechanics are fine; name and art are original.
- Heavy engine or framework that makes the skin a code concern.
- Blurry scaling — pixels must stay sharp at every size.

## Constraints

- Browser only; must work on current desktop Chrome/Firefox/Safari and mobile
  Safari/Chrome, touch included.
- Static hosting (e.g. GitHub Pages); no backend.
- Tech: plain TypeScript + HTML canvas 2D, Vite (dev server/build), Vitest (tests).
  No game engine.

## Approaches considered

| Approach | Trade-off | Verdict |
|---|---|---|
| **Plain TypeScript + canvas, no engine** | Tiny, fully understood, exact pixel control, skin = images loaded by name. We write screens, input, scaling ourselves (all small here). | **Chosen** by owner. |
| TypeScript + Phaser engine | Loader, scenes, scaling, touch, sound, particles built in. ~1 MB of engine for ~a dozen objects; skins go through its loader conventions. | Rejected — only pays off if the game grows a lot. |
| Godot (or similar) with web export | Large downloads, slow on phones, overkill. | Dropped early. |

Skin model considered: (1) folder of images + settings, (2) palette + text-defined
pixel patterns, (3) full theme incl. sounds/levels/names. Owner picked **(1), with
no town names**.

## Gameplay (decided by owner)

- 2D side view. Skyline of block-built buildings at the bottom, plane at the top.
- Plane moves on its own; player has no steering or speed control. Each time it
  passes a horizontal edge it drops one row lower.
- One button drops a bomb straight down. Only one bomb on screen at a time.
- A bomb destroys a set number of floors of the building it hits.
- Hitting a building with the plane ends the run.
- When the whole city is flattened the plane lands safely; next level is a taller,
  denser city.
- Score and best score shown during play; best score survives reloads.

## Design details (my calls unless marked)

### Screen and grid
- Logical resolution **320×200 px**, rendered to an offscreen canvas and scaled to
  the window with nearest-neighbour (no smoothing), letterboxed, centred. Integer
  scale when it fits, otherwise the largest fractional fit (still nearest-neighbour).
- World is a grid of **cells 16 px wide × 8 px tall** → 20 columns × 25 rows.
  - Rows 0–1: HUD (score left, best right).
  - Row 2: plane's starting row.
  - Row 24: ground strip.
  - Buildings stand on row 23 upward.
- Phones in portrait get the same landscape playfield, letterboxed (no special
  portrait layout in the prototype).

### Plane
- Always flies **left → right**, moving smoothly in pixels (not cell jumps).
- When it fully exits the right edge it re-enters on the left **one row lower**.
- Collision: if any part of the plane's sprite overlaps an occupied building cell
  in its current row → crash → game over (short explosion, then game-over screen).
- Speed increases slightly per level (tunable).

### Bomb
- On button press, if no bomb is active, spawn a bomb at the plane's centre x,
  snapped to the column under it. Falls straight down at a fixed speed.
- On reaching the top floor of a building in that column: remove up to
  **3 floors** (tunable `floorsPerBomb`), score them, bomb disappears.
- On reaching the ground in an empty column: bomb disappears, no penalty.
- Presses while a bomb is active are ignored (no queueing).

### Buildings and levels
- Each building is **one column wide**, a stack of floor cells topped by a roof
  cell. Gaps (empty columns) are allowed.
- Each building has a **type** (index into the skin's building types) chosen at
  random, so a skin with 3 types shows 3 visual styles.
- Levels are **generated randomly** each run from parameters that grow with level
  number: number of occupied columns and min/max height. **Every level is
  clearable by a perfect player** (my call): the generator computes a budget =
  passes available before the plane reaches the tallest building's top × bombs
  that fit in one pass (from plane speed and bomb fall time) × `floorsPerBomb`,
  and regenerates cities whose total floors exceed a safety margin of it (e.g.
  70%). Difficulty comes from how tight the budget is, so the curve levels off
  naturally. A unit test asserts the rule for levels 1–20. Parameters live in
  one config table so they're easy to tune.
- A building's **top cell is drawn with the roof tile**, the rest with the floor
  tile; after a hit the new top cell becomes the roof. Every cell, roof
  included, counts as one floor for scoring.
- Level clear: when no building cells remain, the plane keeps flying and descends
  one row per pass (faster descent allowed) until it reaches the ground row and
  "lands" (stops, short pause), then the next level starts with the plane back at
  row 2.

### Scoring
- **1 point per floor destroyed × level number**, plus a **level-clear bonus of
  50 × level**. (Tunable.)
- Best score stored in `localStorage`; shown on HUD and game-over screen.

### Screens / flow
- **Title**: game title, "press to play", best score.
- **Play**: HUD + playfield.
- **Game over**: "your score", "best", "new best!" when beaten, "press to play".
  Ignore input for ~0.5 s after game over so a held bomb button doesn't skip it.
- Pause automatically when the tab/page is hidden; resume on return.

### Input
- One logical button: **Space, Enter, mouse click, or touch tap anywhere**.
- Same button starts the game from title/game-over screens.
- Prevent page scroll/zoom on touch over the canvas.

### Loop
- Fixed-timestep update at 60 Hz, render on `requestAnimationFrame`. Game logic is
  a pure `update(state, input, dt)` with no DOM/canvas access.

## Skin format

A skin is a folder under `public/skins/<name>/`:

```
skin.json
plane.png          # plane sprite; may be a horizontal strip of frames
bomb.png
explosion.png      # optional; horizontal strip of frames
ground.png         # tile repeated across the ground row
background.png     # optional, 320×200; otherwise colours.background is used
font.png           # bitmap font, fixed grid, ASCII 32–95 in order
building-<n>-floor.png   # one per building type, 16×8
building-<n>-roof.png    # one per building type, 16×8
```

`skin.json`:

```json
{
  "name": "Classic",
  "buildingTypes": 3,
  "font": { "charWidth": 8, "charHeight": 8 },
  "planeFrames": 1,
  "explosionFrames": 4,
  "colours": { "background": "#ffffff" }
}
```

- Sprite sizes are fixed by the grid (floor/roof 16×8, ground 16×8).
- **Plane sprite is exactly 8 px tall (one row) and up to 32 px wide per frame**
  (my call); its collision box is its sprite box within its row. Bomb sprite is at
  most 16×8. The loader rejects sprites outside these limits with a clear error.
- Building types are numbered from 1 (`building-1-floor.png`, …).
- Font image: 16 characters per row, 4 rows (ASCII 32–95), each cell
  `charWidth × charHeight`. Lower-case text is drawn as upper case.
- Explosion strip is used both at bomb impact and at the plane crash.
- Text colour comes from the font image itself (no runtime tinting).
- Active skin chosen by URL: `?skin=<name>`, default `classic`.
- Loader validates the folder; a missing required file shows a clear on-screen
  error naming the file.
- The prototype ships **one original placeholder skin** (`classic`), drawn by the
  builder: simple monochrome/limited-palette pixel art (owner's decision).
- The owner's own art (old Pascal-era drawings or the sweater look) becomes the
  **second skin**, an early backlog item that also proves skin swapping. Before
  drawing it, check the art fits the 16×8 cell and 320×200 frame.

## Code structure (proposal)

```
src/
  game/      # pure logic: state, update, level generation, collision, scoring
  render/    # draws state using a loaded skin; scaling/letterbox
  skin/      # load + validate skin folder
  input/     # keyboard/mouse/touch → one button
  main.ts    # wires loop, screens, storage
tests/       # Vitest tests for game/ (and skin validation)
```

## Testing

- Vitest unit tests for game logic: plane movement/wrap/descent, bomb lifecycle and
  one-bomb rule, floor removal, collision, level clear/landing, level generation
  bounds, scoring.
- Manual play-testing in desktop and mobile browsers for feel and scaling.

## Left to the builder

- Exact tuning values (speeds, `floorsPerBomb`, level growth curve, bonus).
- Explosion/landing animation details and timings.
- Exact title/HUD text layout within the 320×200 frame.
- Deployment wiring (GitHub Pages workflow or manual); use a relative Vite base
  (`./`) so the build works from any sub-path.
