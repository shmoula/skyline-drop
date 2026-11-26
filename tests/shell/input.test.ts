import { describe, expect, it } from 'vitest';
import { createButton, isTypingTarget } from '../../src/shell/input';

describe('isTypingTarget', () => {
  it('flags form controls only', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']) {
      expect(isTypingTarget({ tagName } as unknown as EventTarget)).toBe(true);
    }
    expect(isTypingTarget({ tagName: 'CANVAS' } as unknown as EventTarget)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(new EventTarget())).toBe(false);
  });
});

describe('createButton', () => {
  const make = () => {
    const win = new EventTarget();
    const surface = new EventTarget();
    const button = createButton(win as unknown as Window, surface as unknown as HTMLElement);
    return { win, surface, button };
  };

  it('counts a pointerdown on the surface', () => {
    const { surface, button } = make();
    surface.dispatchEvent(new Event('pointerdown'));
    expect(button.consume()).toBe(true);
    expect(button.consume()).toBe(false);
  });

  it('ignores a pointerdown on the window', () => {
    const { win, button } = make();
    win.dispatchEvent(new Event('pointerdown'));
    expect(button.consume()).toBe(false);
  });

  it('counts Space on the window but not when typing in an input', () => {
    const { win, button } = make();
    const key = (target: unknown) => {
      const e = new Event('keydown') as Event & Record<string, unknown>;
      e.code = 'Space';
      e.repeat = false;
      Object.defineProperty(e, 'target', { value: target });
      win.dispatchEvent(e);
    };
    key({ tagName: 'INPUT' });
    expect(button.consume()).toBe(false);
    key({ tagName: 'CANVAS' });
    expect(button.consume()).toBe(true);
  });
});
