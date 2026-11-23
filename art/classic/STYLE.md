# Classic skin — style bible

The contract every asset in this skin follows. Check a new or changed asset
against this page before running `npm run skin:qa -- classic`.

## Look in one line

Crisp 1-bit-era pixel art on a white sky: black outlines, flat fills, no
gradients, no anti-aliasing. Original designs — not copied from any game.

## Palette (exact; nothing else allowed)

| Chart char | Hex       | Name        | Used for                         |
|------------|-----------|-------------|----------------------------------|
| `K`        | `#000000` | black       | outlines, text, bomb casing      |
| `W`        | `#FFFFFF` | white       | office walls, plane highlight    |
| `S`        | `#B0B0B0` | grey        | bomb body, road, roof ledges     |
| `R`        | `#E04040` | red         | plane body, brick walls, blast   |
| `Y`        | `#F0D040` | yellow      | lit windows, blast core          |
| `G`        | `#40A040` | green       | grass                            |
| `B`        | `#4060D0` | blue        | tower walls                      |
| `L`        | `#80C0F0` | light blue  | panes                            |
| `.`        | —         | transparent | everything else                  |

Background colour: `#FFFFFF` (white), from `skin.json`.

## Rules

- **Grid:** building floor and roof tiles are 16×8; ground tile 16×8; plane
  24×8 (one frame); bomb 4×6; explosion 4 frames of 16×16.
- **Outline:** every building and the plane have a 1 px black (`K`) outline.
  Buildings leave column 0 and 15 transparent so neighbours read as separate.
- **Panes:** windows are 1 px wide, alternating with wall pixels
  (`WLWL…`) or 2 px pairs on the tower (`BLLB…`). Always called "panes".
- **Light:** flat; no shading. Highlights only as single white pixels.
- **Roof:** the top cell of every building. It must line up with the floor
  tile's outline columns so the building reads as one stack.
- **Vocabulary (use exactly):** floor, roof, pane, ledge, antenna, blast.

## Building types

1. **Office** — white walls, light-blue panes, stepped roof.
2. **Brick block** — red walls, yellow lit panes, grey ledge roof.
3. **Tower** — narrow (10 px) blue walls, light-blue paired panes, antenna roof.
