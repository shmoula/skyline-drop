import { EXPLOSION_MS, type GameState } from '../game/game';
import { CELL_H, CELL_W, COLS, GROUND_ROW, SCREEN_H, SCREEN_W } from '../game/grid';
import type { ImageLike, Skin } from '../skin/types';

export const GAME_TITLE = 'SKYLINE DROP';

type Img = CanvasImageSource & ImageLike;

/** Draws a GameState onto a 320×200 context using the active skin. Holds no game logic. */
export function createRenderer(ctx: CanvasRenderingContext2D, skin: Skin<Img>): { draw(s: GameState): void } {
  const { manifest: m } = skin;
  const cw = m.font.charWidth;
  const ch = m.font.charHeight;
  const planeFrameW = skin.plane.width / m.planeFrames;
  let frame = 0;

  const text = (str: string, x: number, y: number) => {
    [...str.toUpperCase()].forEach((c, i) => {
      const code = c.charCodeAt(0) - 32;
      if (code < 0 || code >= 64) return;
      ctx.drawImage(skin.font, (code % 16) * cw, Math.floor(code / 16) * ch, cw, ch, x + i * cw, y, cw, ch);
    });
  };
  const centred = (str: string, y: number) => text(str, Math.round((SCREEN_W - str.length * cw) / 2), y);

  const background = () => {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = m.colours.background;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (skin.background) ctx.drawImage(skin.background, 0, 0);
  };

  const ground = () => {
    for (let c = 0; c < COLS; c++) ctx.drawImage(skin.ground, c * CELL_W, GROUND_ROW * CELL_H);
  };

  const city = (s: GameState) => {
    s.city.heights.forEach((h, c) => {
      const tiles = skin.buildings[(s.city.types[c] ?? 1) - 1] ?? skin.buildings[0]!;
      for (let k = 0; k < h; k++) {
        ctx.drawImage(k === h - 1 ? tiles.roof : tiles.floor, c * CELL_W, (GROUND_ROW - 1 - k) * CELL_H);
      }
    });
  };

  const explosions = (s: GameState) => {
    if (!skin.explosion) return;
    const fw = skin.explosion.width / m.explosionFrames;
    const fh = skin.explosion.height;
    for (const e of s.explosions) {
      const f = Math.min(Math.floor((e.ageMs / EXPLOSION_MS) * m.explosionFrames), m.explosionFrames - 1);
      // Bomb blasts sit on a cell; crash blasts on the plane. Centre the frame on that cell.
      const cx = e.x + (e.x % CELL_W === 0 ? CELL_W / 2 : planeFrameW / 2);
      ctx.drawImage(skin.explosion, f * fw, 0, fw, fh, Math.round(cx - fw / 2), Math.round(e.y + CELL_H / 2 - fh / 2), fw, fh);
    }
  };

  const hud = (s: GameState) => {
    text(`SCORE ${s.score}`, 8, 4);
    const best = `BEST ${s.best}`;
    text(best, SCREEN_W - 8 - best.length * cw, 4);
  };

  return {
    draw(s) {
      frame++;
      background();
      if (s.phase === 'title') {
        ground();
        centred(GAME_TITLE, 56);
        centred('PRESS SPACE OR TAP', 96);
        centred(`BEST ${s.best}`, 120);
        return;
      }
      if (s.phase === 'gameOver') {
        centred('GAME OVER', 48);
        centred(`YOU SCORED ${s.score}`, 72);
        if (s.newBest) centred('NEW BEST!', 88);
        else centred(`BEST ${s.best}`, 88);
        if (s.timerMs >= s.tuning.gameOverLockMs) centred('PRESS TO PLAY', 120);
        return;
      }
      city(s);
      ground();
      if (s.bomb) ctx.drawImage(skin.bomb, s.bomb.col * CELL_W + (CELL_W - skin.bomb.width) / 2, Math.round(s.bomb.y));
      if (s.phase !== 'crashed') {
        const pf = Math.floor(frame / 6) % m.planeFrames;
        ctx.drawImage(skin.plane, pf * planeFrameW, 0, planeFrameW, CELL_H, Math.round(s.plane.x), s.plane.row * CELL_H, planeFrameW, CELL_H);
      }
      explosions(s);
      hud(s);
    },
  };
}
