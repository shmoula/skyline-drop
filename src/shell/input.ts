/**
 * The game's one button: Space, Enter, mouse click or a tap anywhere.
 * `consume()` returns true once per press since the last call.
 */
export function createButton(target: Window): { consume(): boolean; dispose(): void } {
  let pressed = false;
  const onKey = (e: KeyboardEvent) => {
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

  target.addEventListener('keydown', onKey);
  target.addEventListener('pointerdown', onPointer);
  target.addEventListener('touchstart', blockTouch, { passive: false });
  target.addEventListener('touchmove', blockTouch, { passive: false });

  return {
    consume() {
      const was = pressed;
      pressed = false;
      return was;
    },
    dispose() {
      target.removeEventListener('keydown', onKey);
      target.removeEventListener('pointerdown', onPointer);
      target.removeEventListener('touchstart', blockTouch);
      target.removeEventListener('touchmove', blockTouch);
    },
  };
}
