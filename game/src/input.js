// Keyboard and pointer input. Held keys give a steering direction in both
// axes; one-shot presses (start or restart, pause) are queued as bit flags and
// taken once by the loop, so a press between two frames is never lost and never
// counted twice. Pointer drag steers the plane toward the pointer; a quick tap
// is a confirm. Shift (or holding Space while playing) is boost.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Enter']);
const BOOST = new Set(['ShiftLeft', 'ShiftRight', 'Space']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let boost = false;
  let actions = 0;
  let pointer = null;
  let pointerDownAt = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (BOOST.has(event.code)) {
      boost = true;
      if (event.code === 'Space' && !event.repeat) actions |= ACTION_CONFIRM;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (BOOST.has(event.code)) boost = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
    boost = false;
    pointer = null;
  });

  function setPointer(event) {
    const rect = target.getBoundingClientRect();
    pointer = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }
  target.addEventListener('pointerdown', (event) => {
    pointerDownAt = performance.now();
    setPointer(event);
    try { target.setPointerCapture(event.pointerId); } catch { /* no capture */ }
  });
  target.addEventListener('pointermove', (event) => {
    if (pointer !== null) setPointer(event);
  });
  target.addEventListener('pointerup', () => {
    if (performance.now() - pointerDownAt < 220) actions |= ACTION_CONFIRM;
    pointer = null;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both (keys only). */
    directionX() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** -1 for up, 1 for down, 0 for neither or both (keys only). */
    directionY() {
      return (down ? 1 : 0) - (up ? 1 : 0);
    },
    /** Pointer target as fractions of the field, or null when not dragging. */
    pointerTarget() {
      return pointer;
    },
    isBoost() {
      return boost;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
