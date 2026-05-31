let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    // Filtro suave para calidez (quita estridencia de las ondas).
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5200;
    master.connect(lp).connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

interface NoteOpts {
  freq: number;
  start: number; // segundos desde ahora
  dur: number; // segundos
  type?: OscillatorType;
  gain?: number;
  detune?: number; // capa extra detune para cuerpo
}

function note({ freq, start, dur, type = "triangle", gain = 0.22, detune = 0 }: NoteOpts) {
  const c = getCtx();
  if (!c || !master) return;
  const t0 = c.currentTime + start;
  const t1 = t0 + dur;

  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012); // ataque rápido
  g.gain.exponentialRampToValueAtTime(0.0001, t1); // decay suave
  g.connect(master);

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.connect(g);
  osc.start(t0);
  osc.stop(t1 + 0.02);

  // Capa detune para dar cuerpo (estilo campana/coro).
  if (detune) {
    const osc2 = c.createOscillator();
    osc2.type = type;
    osc2.frequency.setValueAtTime(freq, t0);
    osc2.detune.setValueAtTime(detune, t0);
    osc2.connect(g);
    osc2.start(t0);
    osc2.stop(t1 + 0.02);
  }
}

// Acierto: arpegio mayor ascendente, brillante y alegre.
export function playCorrect(): void {
  const seq = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  seq.forEach((f, i) => note({ freq: f, start: i * 0.075, dur: 0.32, type: "triangle", gain: 0.2, detune: 6 }));
  note({ freq: 1567.98, start: 0.3, dur: 0.5, type: "sine", gain: 0.12 }); // brillo final
}

// Récord / victoria: fanfarria con quinta y octava.
export function playFanfare(): void {
  const seq = [523.25, 783.99, 1046.5, 1318.51]; // C5 G5 C6 E6
  seq.forEach((f, i) => note({ freq: f, start: i * 0.11, dur: 0.45, type: "sawtooth", gain: 0.16, detune: 8 }));
}

// Fallo: dos notas graves descendentes, cálidas (no estridentes).
export function playWrong(): void {
  note({ freq: 196, start: 0, dur: 0.22, type: "sawtooth", gain: 0.14, detune: 10 });
  note({ freq: 146.83, start: 0.11, dur: 0.3, type: "sawtooth", gain: 0.14, detune: 10 });
}

// Revelado neutro (sin acierto): acorde corto y suave.
export function playReveal(): void {
  note({ freq: 392, start: 0, dur: 0.4, type: "sine", gain: 0.14 });
  note({ freq: 261.63, start: 0.05, dur: 0.45, type: "sine", gain: 0.12 });
}
