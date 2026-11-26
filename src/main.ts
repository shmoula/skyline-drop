import { newGame, step, type GameState } from './game/game';
import { SCREEN_H, SCREEN_W } from './game/grid';
import { createRenderer } from './render/renderer';
import { readBest, writeBest } from './shell/bestScore';
import { advanceClock, STEP_MS } from './shell/clock';
import { createButton } from './shell/input';
import { fitViewport } from './shell/viewport';
import { loadSkin } from './skin/load';

function showError(message: string): void {
  const box = document.getElementById('error')!;
  box.textContent = `This skin can't be used:\n\n${message}`;
  box.hidden = false;
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function skinName(): string {
  const name = new URLSearchParams(location.search).get('skin') ?? 'classic';
  return /^[a-z0-9-]+$/.test(name) ? name : 'classic';
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });

const fetchJson = async (url: string): Promise<unknown> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

async function start(): Promise<void> {
  const skin = await loadSkin(`./skins/${skinName()}/`, loadImage, fetchJson);

  const screen = document.getElementById('game') as HTMLCanvasElement;
  const out = screen.getContext('2d')!;
  const offscreen = document.createElement('canvas');
  offscreen.width = SCREEN_W;
  offscreen.height = SCREEN_H;
  const renderer = createRenderer(offscreen.getContext('2d')!, skin);

  const fit = () => {
    const vp = fitViewport(window.innerWidth, window.innerHeight);
    const dpr = window.devicePixelRatio || 1;
    Object.assign(screen.style, { left: `${vp.x}px`, top: `${vp.y}px`, width: `${vp.width}px`, height: `${vp.height}px` });
    screen.width = Math.round(vp.width * dpr);
    screen.height = Math.round(vp.height * dpr);
  };
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);

  const storage = safeStorage();
  let state: GameState = newGame({
    best: readBest(storage),
    seed: (Math.random() * 2 ** 32) >>> 0,
    planeWidth: skin.plane.width / skin.manifest.planeFrames,
    buildingTypes: skin.manifest.buildingTypes,
  });

  if (import.meta.env.DEV) {
    // Dev-only hook for manual testing in the browser console; stripped from production builds.
    Object.defineProperty(window, '__skyline', {
      value: { get state() { return state; }, set state(v: GameState) { state = v; }, step },
    });
  }

  const button = createButton(window, screen);
  let pressed = false;
  let acc = 0;
  let last: number | null = null;
  let savedBest = state.best;
  document.addEventListener('visibilitychange', () => {
    last = null; // resume without counting the hidden time
  });

  const frame = (now: number) => {
    const elapsed = last === null ? 0 : now - last;
    last = now;
    const clock = advanceClock(acc, elapsed);
    acc = clock.accMs;
    pressed = button.consume() || pressed; // keep a press until a step can use it
    for (let i = 0; i < clock.steps; i++) {
      state = step(state, { pressed }, STEP_MS);
      pressed = false;
    }
    if (state.best !== savedBest) {
      writeBest(storage, state.best);
      savedBest = state.best;
    }

    renderer.draw(state);
    out.imageSmoothingEnabled = false;
    out.drawImage(offscreen, 0, 0, screen.width, screen.height);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

start().catch((e: unknown) => showError(e instanceof Error ? e.message : String(e)));
