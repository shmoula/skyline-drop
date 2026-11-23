/** Logical screen and play-grid geometry. Everything else is measured in these units. */
export const SCREEN_W = 320;
export const SCREEN_H = 200;
export const CELL_W = 16;
export const CELL_H = 8;
export const COLS = SCREEN_W / CELL_W; // 20
export const ROWS = SCREEN_H / CELL_H; // 25
/** Row the plane starts each level on (rows 0–1 are the HUD). */
export const PLANE_START_ROW = 2;
/** Ground strip row; buildings stand on the row above it. */
export const GROUND_ROW = 24;
