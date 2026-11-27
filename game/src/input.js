// Keyboard and pointer input for the chase-view flight game. The stick is three
// axes: W/S work the throttle, A/D or Left/Right bank the aircraft, Up/Down pitch it
// up and down. One-shot presses (start or restart, pause) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost and never
// counted twice. Pointer drag steers too: sideways for bank, up and down for pitch;
// a quick tap is a confirm.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const BANK_LEFT = new Set(['ArrowLeft', 'KeyA']);
const BANK_RIGHT = new Set(['ArrowRight', 'KeyD']);
const PITCH_UP = new Set(['ArrowUp']);
const PITCH_DOWN = new Set(['ArrowDown']);
const THROTTLE_UP = new Set(['KeyW']);
const THROTTLE_DOWN = new Set(['KeyS']);
const CONFIRM = new Set(['Enter', 'Space']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let bankLeft = false;
  let bankRight = false;
  let pitchUp = false;
  let pitchDown = false;
  let throttleUp = false;
  let throttleDown = false;
  let actions = 0;
  let drag = null;
  let dragStart = null;
  let pointerDownAt = 0;

  window.addEventListener('keydown', (event) => {
    if (BANK_LEFT.has(event.code)) bankLeft = true;
    else if (BANK_RIGHT.has(event.code)) bankRight = true;
    else if (PITCH_UP.has(event.code)) pitchUp = true;
    else if (PITCH_DOWN.has(event.code)) pitchDown = true;
    else if (THROTTLE_UP.has(event.code)) throttleUp = true;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (BANK_LEFT.has(event.code)) bankLeft = false;
    else if (BANK_RIGHT.has(event.code)) bankRight = false;
    else if (PITCH_UP.has(event.code)) pitchUp = false;
    else if (PITCH_DOWN.has(event.code)) pitchDown = false;
    else if (THROTTLE_UP.has(event.code)) throttleUp = false;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    bankLeft = false;
    bankRight = false;
    pitchUp = false;
    pitchDown = false;
    throttleUp = false;
    throttleDown = false;
    drag = null;
    dragStart = null;
  });

  function pointerFraction(event) {
    const rect = target.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }
  target.addEventListener('pointerdown', (event) => {
    pointerDownAt = performance.now();
    dragStart = pointerFraction(event);
    drag = { bank: 0, pitch: 0 };
    try { target.setPointerCapture(event.pointerId); } catch { /* no capture */ }
  });
  target.addEventListener('pointermove', (event) => {
    if (dragStart === null) return;
    const at = pointerFraction(event);
    drag = {
      bank: Math.max(-1, Math.min(1, (at.x - dragStart.x) * 4)),
      pitch: Math.max(-1, Math.min(1, (dragStart.y - at.y) * 4)),
    };
  });
  target.addEventListener('pointerup', () => {
    if (performance.now() - pointerDownAt < 220) actions |= ACTION_CONFIRM;
    drag = null;
    dragStart = null;
  });

  /** The stick the world reads each step: throttle, bank and pitch, each -1..1. */
  function stick() {
    const keys = {
      throttle: (throttleUp ? 1 : 0) - (throttleDown ? 1 : 0),
      bank: (bankRight ? 1 : 0) - (bankLeft ? 1 : 0),
      pitch: (pitchUp ? 1 : 0) - (pitchDown ? 1 : 0),
    };
    if (drag === null) return keys;
    return {
      throttle: keys.throttle,
      bank: keys.bank !== 0 ? keys.bank : drag.bank,
      pitch: keys.pitch !== 0 ? keys.pitch : drag.pitch,
    };
  }

  return {
    stick,
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
