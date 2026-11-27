// Sound is a tiny WebAudio synth (no files): a chime for rings, a soft blip for a
// near miss, a thud for a hit, a rising arpeggio on mission complete, a fanfare for
// a landing, a beep for low fuel, and an engine hum whose pitch follows the throttle.
// Everything starts after the first user gesture and never breaks the game.
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;

  function ensure() {
    if (context) return;
    try {
      context = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = context.createOscillator();
      engineGain = context.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain.gain.value = 0;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(context.destination);
      engineOsc.start();
    } catch {
      context = null;
    }
  }

  function tone(freq, dur, type, gain, when) {
    if (!context) return;
    try {
      const osc = context.createOscillator();
      const amp = context.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const start = context.currentTime + (when || 0);
      amp.gain.setValueAtTime(gain || 0.08, start);
      amp.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(amp);
      amp.connect(context.destination);
      osc.start(start);
      osc.stop(start + dur);
    } catch {
      // Sound is decoration: never let it break the game.
    }
  }

  return {
    ensure,
    /** The engine hum follows the throttle; call every frame while flying. */
    setEngine(throttle, flying) {
      if (!context || !engineOsc || !engineGain) return;
      try {
        engineOsc.frequency.value = 48 + throttle * 75;
        engineGain.gain.value = flying ? 0.018 + throttle * 0.03 : 0;
      } catch { /* ignore */ }
    },
    ringChime() {
      tone(880, 0.18, 'sine', 0.09);
      tone(1320, 0.22, 'sine', 0.09, 0.07);
    },
    nearMissBlip() { tone(660, 0.1, 'sine', 0.06); },
    hitThud() { tone(140, 0.25, 'sawtooth', 0.1); },
    lowFuelBeep() { tone(980, 0.12, 'square', 0.05); },
    missionFanfare() {
      tone(523, 0.12, 'triangle', 0.07);
      tone(659, 0.12, 'triangle', 0.07, 0.09);
      tone(784, 0.2, 'triangle', 0.08, 0.18);
    },
    landingChime() {
      tone(784, 0.15, 'triangle', 0.08);
      tone(1046, 0.25, 'triangle', 0.08, 0.12);
    },
  };
}
