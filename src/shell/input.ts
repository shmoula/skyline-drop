const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);

/** True for form controls, whose keys must not drive the game. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const tag = (target as { tagName?: unknown } | null)?.tagName;
  return typeof tag === 'string' && TYPING_TAGS.has(tag);
}

/**
 * The game's one button: Space or Enter (anywhere but form controls), or a click or tap on `surface`.
 * `consume()` returns true once per press since the last call.
 */
export function createButton(win: Window, surface: HTMLElement): { consume(): boolean; dispose(): void } {
  let pressed = false;
  const onKey = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return;
    if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
    e.preventDefault();
    if (!e.repeat) pressed = true;
  };
  const onPointer = (e: PointerEvent) => {
    e.preventDefault();
    pressed = true;
  };
  // Stop the page scrolling, zooming or double-tap-zooming under a finger.
  const blockTouch = (e: TouchEvent) => e.preventDefault();

  win.addEventListener('keydown', onKey);
  surface.addEventListener('pointerdown', onPointer);
  surface.addEventListener('touchstart', blockTouch, { passive: false });
  surface.addEventListener('touchmove', blockTouch, { passive: false });

  return {
    consume() {
      const was = pressed;
      pressed = false;
      return was;
    },
    dispose() {
      win.removeEventListener('keydown', onKey);
      surface.removeEventListener('pointerdown', onPointer);
      surface.removeEventListener('touchstart', blockTouch);
      surface.removeEventListener('touchmove', blockTouch);
    },
  };
}
