import { cityKey, decodeCity, encodeCity, type SharedCity } from './city/code';
import {
  canPlay,
  canShare,
  clearAll,
  newEditor,
  paint,
  recordClear,
  setName,
  setStyle,
  toShared,
  type EditorState,
} from './editor/editor';
import { isClearable, newCityGame, newGame, step, type GameState } from './game/game';
import { COLS, ROWS, SCREEN_H, SCREEN_W } from './game/grid';
import { CURRENT_RULES, getRules } from './game/rules';
import { createRenderer } from './render/renderer';
import { readBest, writeBest } from './shell/bestScore';
import { loadDraft, readCityBest, saveDraft, writeCityBest } from './shell/cityStore';
import { advanceClock, STEP_MS } from './shell/clock';
import { createButton } from './shell/input';
import { parseRoute, shareUrl } from './shell/route';
import { fitViewport } from './shell/viewport';
import { loadSkin } from './skin/load';
import type { Skin } from './skin/types';

type Check = 'clearable' | 'too-hard' | 'empty';
type Img = HTMLImageElement;

const CHECK_DELAY_MS = 150;
const COPIED_MS = 2000;

function showError(message: string, action?: { label: string; run: () => void }): void {
  const box = document.getElementById('error')!;
  box.replaceChildren(message);
  if (action) {
    const btn = document.createElement('button');
    btn.textContent = action.label;
    btn.addEventListener('click', action.run);
    box.append('\n\n', btn);
  }
  box.hidden = false;
}

const showSkinError = (message: string) => showError(`This skin can't be used:\n\n${message}`);

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

const loadNamedSkin = (name: string) => loadSkin(`./skins/${name}/`, loadImage, fetchJson);

/** Load the requested skin; shared links fall back to `classic` so a city still plays. */
async function loadSkinWithFallback(fallback: boolean): Promise<{ skin: Skin<Img>; name: string }> {
  const name = skinName();
  try {
    return { skin: await loadNamedSkin(name), name };
  } catch (e) {
    if (!fallback || name === 'classic') throw e;
    return { skin: await loadNamedSkin('classic'), name: 'classic' };
  }
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/** A small canvas showing building type `type` (roof over one floor), for the style picker. */
function swatch(skin: Skin<Img>, type: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const tiles = skin.buildings[type - 1] ?? skin.buildings[0]!;
  ctx.drawImage(tiles.roof, 0, 0);
  ctx.drawImage(tiles.floor, 0, 8);
  return c;
}

/** The restored draft, with its style clamped to what this skin has. */
function restoreDraft(storage: Storage | null, buildingTypes: number): EditorState {
  const draft = loadDraft(storage);
  if (!draft) return newEditor();
  return setStyle(draft, Math.min(Math.max(draft.style, 1), buildingTypes));
}

async function start(): Promise<void> {
  window.addEventListener('hashchange', () => location.reload());
  const route = parseRoute(location.hash);

  let shared: SharedCity | null = null;
  if (route.kind === 'play') {
    shared = decodeCity(route.code);
    if (!shared) {
      showError('This city link is broken or from a newer version of the game.', {
        label: 'Play the normal game',
        run: () => {
          location.hash = '';
        },
      });
      return;
    }
  }

  let skinInfo: { skin: Skin<Img>; name: string };
  try {
    skinInfo = await loadSkinWithFallback(route.kind === 'play');
  } catch (e) {
    showSkinError(e instanceof Error ? e.message : String(e));
    return;
  }
  const { skin } = skinInfo;

  const screen = document.getElementById('game') as HTMLCanvasElement;
  const bar = document.getElementById('bar')!;
  const out = screen.getContext('2d')!;
  const offscreen = document.createElement('canvas');
  offscreen.width = SCREEN_W;
  offscreen.height = SCREEN_H;
  const renderer = createRenderer(offscreen.getContext('2d')!, skin);

  const fit = () => {
    const barH = bar.hidden ? 0 : bar.offsetHeight;
    const vp = fitViewport(window.innerWidth, Math.max(1, window.innerHeight - barH));
    const dpr = window.devicePixelRatio || 1;
    Object.assign(screen.style, { left: `${vp.x}px`, top: `${vp.y}px`, width: `${vp.width}px`, height: `${vp.height}px` });
    screen.width = Math.round(vp.width * dpr);
    screen.height = Math.round(vp.height * dpr);
  };
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);

  /** Replace the bar's controls (null hides it) and refit the canvas around it. */
  const setBar = (controls: HTMLElement[] | null) => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && bar.contains(active)) active.blur();
    bar.replaceChildren(...(controls ?? []));
    bar.hidden = controls === null;
    fit();
  };

  const storage = safeStorage();
  const rules = getRules(CURRENT_RULES)!;

  // The game being played (null while the editor is showing) and its one button.
  let state: GameState | null = null;
  let gameButton: ReturnType<typeof createButton> | null = null;
  let onGameOver: (s: GameState) => void = () => {};
  let onTitleChange: (onTitle: boolean) => void = () => {};
  let savedBest = 0;
  let writeGameBest: (best: number) => void = () => {};

  const startGame = (s: GameState, opts: { writeBest: (best: number) => void; onGameOver?: (s: GameState) => void }) => {
    state = s;
    savedBest = s.best;
    writeGameBest = opts.writeBest;
    onGameOver = opts.onGameOver ?? (() => {});
    gameButton ??= createButton(window, screen);
  };
  const stopGame = () => {
    gameButton?.dispose();
    gameButton = null;
    state = null;
  };

  // Editor (edit mode only).
  let editor: EditorState | null = null;
  let check: Check = 'empty';

  if (route.kind === 'normal') {
    const buildBtn = button('Build a city', () => {
      location.hash = '#edit';
    });
    let onTitle: boolean | null = null;
    onTitleChange = (t) => {
      if (t === onTitle) return;
      onTitle = t;
      setBar(t ? [buildBtn] : null);
    };
    startGame(
      newGame({
        best: readBest(storage),
        seed: (Math.random() * 2 ** 32) >>> 0,
        planeWidth: skin.plane.width / skin.manifest.planeFrames,
        buildingTypes: skin.manifest.buildingTypes,
      }),
      { writeBest: (b) => writeBest(storage, b) },
    );
    onTitleChange(true); // show the bar before the first frame so the canvas doesn't jump
  } else if (route.kind === 'play' && shared) {
    const city = shared;
    const key = cityKey(city);
    setBar([
      button('Build your own', () => {
        // Name the skin that actually loaded: if the link's skin was missing we fell back to classic,
        // and edit mode doesn't fall back, so keeping the link's ?skin= would show a skin error.
        location.href = `${location.pathname}?skin=${skinInfo.name}#edit`;
      }),
    ]);
    startGame(
      newCityGame({
        city: city.city,
        rules: getRules(city.rules)!,
        best: readCityBest(storage, key),
        challenge: { name: city.name, score: city.score },
      }),
      { writeBest: (b) => writeCityBest(storage, key, b) },
    );
  } else {
    editor = restoreDraft(storage, skin.manifest.buildingTypes);
    let checkTimer: ReturnType<typeof setTimeout> | null = null;
    const runCheck = () => {
      checkTimer = null;
      check = editor && canPlay(editor) ? (isClearable(editor.city, rules) ? 'clearable' : 'too-hard') : 'empty';
    };
    const scheduleCheck = () => {
      if (checkTimer !== null) clearTimeout(checkTimer);
      checkTimer = setTimeout(runCheck, CHECK_DELAY_MS);
    };

    const swatches = Array.from({ length: skin.manifest.buildingTypes }, (_, i) => {
      const b = button('', () => update(setStyle(editor!, i + 1)));
      b.className = 'swatch';
      b.title = `Style ${i + 1}`;
      b.append(swatch(skin, i + 1));
      return b;
    });
    const name = document.createElement('input');
    name.type = 'text';
    name.maxLength = 10;
    name.placeholder = 'NAME';
    name.setAttribute('aria-label', 'Your name');
    name.autocomplete = 'off';
    name.spellcheck = false;
    name.value = editor.name;
    // Don't rewrite the field while typing (breaks IME composition and moves the caret); tidy it afterwards.
    name.addEventListener('input', () => update(setName(editor!, name.value)));
    const tidyName = () => {
      if (name.value !== editor!.name) name.value = editor!.name;
    };
    name.addEventListener('change', tidyName);
    name.addEventListener('blur', tidyName);
    const clearBtn = button('Clear all', () => update(clearAll(editor!)));
    const playBtn = button('Play', () => playTest());
    let copiedTimer: ReturnType<typeof setTimeout> | null = null;
    const shareBtn = button('Share', () => void share());
    const editorBar = [...swatches, name, clearBtn, playBtn, shareBtn];

    const refreshBar = () => {
      const e = editor!;
      swatches.forEach((b, i) => b.setAttribute('aria-pressed', String(e.style === i + 1)));
      playBtn.disabled = !canPlay(e);
      shareBtn.disabled = !canShare(e);
      shareBtn.title = canShare(e) ? '' : 'Clear your city first to share it';
    };

    const update = (next: EditorState) => {
      const prev = editor!;
      if (next === prev) return;
      editor = next;
      saveDraft(storage, next);
      refreshBar();
      if (next.city !== prev.city) scheduleCheck();
    };

    const share = async () => {
      const e = editor!;
      if (!canShare(e)) return;
      const url = shareUrl(location, skinInfo.name, encodeCity(toShared(e, CURRENT_RULES)));
      const text = `Can you beat my ${e.clearedScore} on my Skyline Drop city?`;
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ text, url });
        } catch {
          // Cancelled by the player, or blocked: nothing to do.
        }
        return;
      }
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        shareBtn.textContent = 'Link copied';
        if (copiedTimer !== null) clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => {
          shareBtn.textContent = 'Share';
          copiedTimer = null;
        }, COPIED_MS);
      } catch {
        window.prompt('Copy this link:', url);
      }
    };

    const showEditor = () => {
      // Leaving while clearing or landing: the clear is already earned, so record it before the game is dropped.
      if (state?.clearedRow != null) update(recordClear(editor!, state.score));
      stopGame();
      setBar(editorBar);
      refreshBar();
    };
    const playTest = () => {
      const e = editor!;
      if (!canPlay(e)) return;
      setBar([button('Back to editor', showEditor)]);
      startGame(newCityGame({ city: e.city, rules, best: e.clearedScore ?? 0, challenge: null }), {
        writeBest: () => {},
        onGameOver: (s) => {
          if (s.clearedRow !== null) update(recordClear(editor!, s.score));
        },
      });
    };

    // Painting: pointer down, or moving with the main button held, sets a column's height.
    // Fast drags deliver sparse moves, so fill the columns between the last cell and this one.
    let lastCell: { col: number; row: number } | null = null;
    const paintAt = (ev: PointerEvent) => {
      if (state !== null || !editor) return;
      const rect = screen.getBoundingClientRect();
      const fx = (ev.clientX - rect.left) / rect.width;
      const fy = (ev.clientY - rect.top) / rect.height;
      if (fx < 0 || fx >= 1 || fy < 0 || fy >= 1) {
        lastCell = null;
        return;
      }
      const col = Math.floor(fx * COLS);
      const row = Math.floor(fy * ROWS);
      let next = editor;
      const from = lastCell ?? { col, row };
      const span = Math.abs(col - from.col);
      for (let i = 1; i <= span; i++) {
        const c = from.col + Math.sign(col - from.col) * i;
        next = paint(next, c, Math.round(from.row + ((row - from.row) * i) / span));
      }
      if (span === 0) next = paint(next, col, row);
      lastCell = { col, row };
      update(next);
    };
    screen.addEventListener('pointerdown', (ev) => {
      if (state !== null) return;
      ev.preventDefault();
      screen.setPointerCapture(ev.pointerId);
      lastCell = null;
      paintAt(ev);
    });
    screen.addEventListener('pointermove', (ev) => {
      if (ev.buttons & 1) paintAt(ev);
      else lastCell = null;
    });

    showEditor();
    runCheck();
  }

  fit();

  if (import.meta.env.DEV) {
    // Dev-only hook for manual testing in the browser console; stripped from production builds.
    Object.defineProperty(window, '__skyline', {
      value: {
        get state() {
          return state;
        },
        set state(v: GameState | null) {
          if (v) state = v;
        },
        get editor() {
          return editor;
        },
        step,
      },
    });
  }

  let pressed = false;
  let acc = 0;
  let last: number | null = null;
  document.addEventListener('visibilitychange', () => {
    last = null; // resume without counting the hidden time
  });

  const frame = (now: number) => {
    const elapsed = last === null ? 0 : now - last;
    last = now;
    const clock = advanceClock(acc, elapsed);
    acc = clock.accMs;

    const current = state;
    if (current === null) {
      pressed = false;
      renderer.drawEditor(editor!, check);
    } else {
      pressed = (gameButton?.consume() ?? false) || pressed; // keep a press until a step can use it
      let s = current;
      for (let i = 0; i < clock.steps; i++) {
        const prev = s;
        s = step(prev, { pressed }, STEP_MS);
        pressed = false;
        if (prev.phase !== 'gameOver' && s.phase === 'gameOver') onGameOver(s);
      }
      state = s;
      if (s.best !== savedBest) {
        writeGameBest(s.best);
        savedBest = s.best;
      }
      onTitleChange(s.phase === 'title');
      renderer.draw(s);
    }
    out.imageSmoothingEnabled = false;
    out.drawImage(offscreen, 0, 0, screen.width, screen.height);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

start().catch((e: unknown) => showSkinError(e instanceof Error ? e.message : String(e)));
