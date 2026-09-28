// The soundtrack, synthesized sample by sample: 128 BPM in D minor, resolving to D major on the logo.
// Every effect is placed from the same cues the picture animates to (timeline.mjs).
import { writeFileSync } from "node:fs";
import { b, CUES, DURATION, HITS, pegTimes } from "./timeline.mjs";

const SR = 48000;
const N = Math.ceil(DURATION * SR);
const TAU = Math.PI * 2;
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const noise = (seed) => {
  let s = seed | 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 2147483648 - 1;
  };
};

class Biquad {
  x1 = 0;
  x2 = 0;
  y1 = 0;
  y2 = 0;
  set(type, f, q = Math.SQRT1_2) {
    const w = (TAU * Math.min(f, SR * 0.45)) / SR;
    const c = Math.cos(w);
    const a = Math.sin(w) / (2 * q);
    const [b0, b1, b2] =
      type === "lp"
        ? [(1 - c) / 2, 1 - c, (1 - c) / 2]
        : type === "hp"
          ? [(1 + c) / 2, -(1 + c), (1 + c) / 2]
          : [a, 0, -a];
    const a0 = 1 + a;
    this.k = [b0 / a0, b1 / a0, b2 / a0, (-2 * c) / a0, (1 - a) / a0];
    return this;
  }
  run(x) {
    const [b0, b1, b2, a1, a2] = this.k;
    const y =
      b0 * x + b1 * this.x1 + b2 * this.x2 - a1 * this.y1 - a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

const drums = bus();
const music = bus();
const sfx = bus();
const verb = bus();
const echo = bus();

/** Mixes a stateful voice(t) into a bus from t0. pan: -1 left … 1 right, or a function of local time. */
function play(
  target,
  t0,
  dur,
  voice,
  { gain = 1, pan = 0, send = 0, delay = 0 } = {},
) {
  const i0 = Math.round(t0 * SR);
  const n = Math.round(dur * SR);
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    if (i >= N) break;
    const v = voice(k / SR) * gain;
    if (i < 0) continue;
    const p = typeof pan === "function" ? pan(k / SR) : pan;
    const l = v * Math.cos(((p + 1) * Math.PI) / 4);
    const r = v * Math.sin(((p + 1) * Math.PI) / 4);
    target.L[i] += l;
    target.R[i] += r;
    if (send) {
      verb.L[i] += l * send;
      verb.R[i] += r * send;
    }
    if (delay) {
      echo.L[i] += l * delay;
      echo.R[i] += r * delay;
    }
  }
}

// ——— Instruments ———
const kick = () => {
  let ph = 0;
  const n = noise(3);
  return (t) => {
    ph += (TAU * (44 + 130 * Math.exp(-t * 30))) / SR;
    return (
      Math.tanh(1.8 * Math.sin(ph) * Math.exp(-t * 5.2)) +
      0.2 * n() * Math.exp(-t * 400)
    );
  };
};
const clap = (seed) => {
  const n = noise(seed);
  const bp = new Biquad().set("bp", 1500, 1.1);
  return (t) => {
    const env =
      t < 0.024 ? Math.exp(-(t % 0.008) * 260) : Math.exp(-(t - 0.024) * 14);
    return (
      bp.run(n()) * env * 2.2 +
      0.3 * Math.sin(TAU * 190 * t) * Math.exp(-t * 30)
    );
  };
};
const hat = (seed, open) => {
  const n = noise(seed);
  const hp = new Biquad().set("hp", 7500, 0.9);
  return (t) => hp.run(n()) * Math.exp(-t * (open ? 10 : 55));
};
const crash = (seed) => {
  const n = noise(seed);
  const hp = new Biquad().set("hp", 4000, 0.6);
  return (t) =>
    hp.run(n()) * Math.exp(-t * 1.6) * (0.7 + 0.3 * Math.sin(t * 90));
};
const impact = (seed) => {
  let ph = 0;
  const n = noise(seed);
  const lp = new Biquad().set("lp", 700, 0.8);
  return (t) => {
    ph += (TAU * (26 + 50 * Math.exp(-t * 5))) / SR;
    return (
      Math.tanh(2 * Math.sin(ph) * Math.exp(-t * 2)) * 0.9 +
      lp.run(n()) * Math.exp(-t * 7) * 1.6
    );
  };
};
const thump = () => {
  let ph = 0;
  return (t) => {
    ph += (TAU * (48 + 60 * Math.exp(-t * 25))) / SR;
    return Math.sin(ph) * Math.exp(-t * 11);
  };
};
/** FM bell: bright strike, long glassy tail. */
const bell =
  (f, decay = 2.4) =>
  (t) =>
    (Math.sin(
      TAU * f * t + 2.2 * Math.exp(-t * 5) * Math.sin(TAU * f * 3.5 * t),
    ) +
      0.3 * Math.sin(TAU * f * 2.01 * t) * Math.exp(-t * 3)) *
    Math.exp(-t * decay) *
    Math.min(1, t * 400);
const pluck = (f, seed) => {
  const period = Math.max(2, Math.round(SR / f));
  const buf = new Float32Array(period);
  const n = noise(seed);
  let prev = 0;
  for (let i = 0; i < period; i++) {
    prev = prev * 0.5 + n() * 0.5;
    buf[i] = prev;
  }
  let i = 0;
  return () => {
    const v = buf[i];
    const j = (i + 1) % period;
    buf[i] = 0.4985 * (v + buf[j]);
    i = j;
    return v;
  };
};
const tick = (seed) => {
  const n = noise(seed);
  return (t) =>
    Math.sin(TAU * 2900 * t) * Math.exp(-t * 520) +
    0.5 * n() * Math.exp(-t * 1100);
};
const flick = (seed) => {
  const n = noise(seed);
  const bp = new Biquad().set("bp", 2800, 0.8);
  return (t) => bp.run(n()) * Math.exp(-t * 38) * Math.min(1, t * 300) * 3;
};
const blip = (f0, f1) => {
  let ph = 0;
  return (t) => {
    ph += (TAU * (f1 + (f0 - f1) * Math.exp(-t * 40))) / SR;
    return Math.sin(ph) * Math.exp(-t * 32) * Math.min(1, t * 2000);
  };
};
/** Filtered noise sweeping up (a riser), or up-and-down (a whoosh). */
const sweep = (seed, dur, shape) => {
  const n = noise(seed);
  const bp = new Biquad();
  let ph = 0;
  return (t) => {
    const u = Math.min(1, t / dur);
    const f =
      shape === "rise"
        ? 250 * 36 ** u
        : 500 + 3200 * Math.sin(Math.PI * u) ** 2;
    if ((t * SR) % 16 < 1) bp.set("bp", f, shape === "rise" ? 2.5 : 1.2);
    const env = shape === "rise" ? u ** 2.2 : Math.sin(Math.PI * u) ** 2;
    ph += (TAU * (180 * 6 ** u)) / SR;
    return (
      (bp.run(n()) * 2.4 + (shape === "rise" ? 0.12 * Math.sin(ph) : 0)) * env
    );
  };
};
/** Detuned additive saws: a warm, slow pad. */
const pad = (notes, dur, bright) => {
  const voices = notes.flatMap((m) => [-0.09, 0, 0.11].map((d) => hz(m + d)));
  const phases = voices.map((_, i) => i * 1.7);
  return (t) => {
    const env =
      Math.min(1, t / 0.7) * Math.min(1, Math.max(0, (dur - t) / 0.9));
    let s = 0;
    for (let v = 0; v < voices.length; v++) {
      const f = voices[v];
      phases[v] += (TAU * f) / SR;
      const top = Math.min(bright, Math.floor(9000 / f));
      for (let h = 1; h <= top; h++) s += Math.sin(phases[v] * h) / h ** 1.7;
    }
    return (s / voices.length) * env;
  };
};

// ——— Harmony: two bars per chord, a Picardy D major on the logo ———
const CHORDS = [
  { root: 38, notes: [50, 57, 62, 65, 69] }, // Dm
  { root: 34, notes: [46, 53, 58, 62, 65, 72] }, // Bb(add9)
  { root: 41, notes: [53, 60, 65, 69, 72] }, // F
  { root: 36, notes: [48, 55, 60, 64, 67, 74] }, // C(add9)
  { root: 38, notes: [50, 57, 62, 65, 69, 76] }, // Dm(add9)
  { root: 34, notes: [46, 53, 58, 62, 65, 69] }, // Bbmaj7
  {
    root: 43,
    notes: [43, 50, 55, 58, 62],
    half: { root: 45, notes: [45, 52, 57, 61, 64] },
  }, // Gm → A
  { root: 38, notes: [50, 57, 62, 66, 69, 76] }, // D(add9)
];
const chordAt = (beat) => {
  const c = CHORDS[Math.min(7, Math.floor(beat / 8))];
  return c.half && beat % 8 >= 4 ? c.half : c;
};

CHORDS.forEach((c, i) => {
  const t0 = b(i * 8);
  const last = i === 7;
  const bright = [4, 7, 8, 9, 7, 9, 12, 10][i];
  if (c.half) {
    play(music, t0, b(4) + 0.8, pad(c.notes, b(4) + 0.8, bright), {
      gain: 0.16,
      send: 0.35,
    });
    play(music, t0 + b(4), b(4) + 0.8, pad(c.half.notes, b(4) + 0.8, bright), {
      gain: 0.16,
      send: 0.35,
    });
  } else {
    const dur = last ? DURATION - t0 : b(8) + 0.8;
    play(music, t0, dur, pad(c.notes, dur, bright), {
      gain: last ? 0.2 : 0.16,
      send: 0.35,
    });
  }
});

// Sub bass pumps on eighths from the drop to the logo.
{
  let ph = 0;
  play(
    music,
    b(8),
    b(48),
    (t) => {
      const beat = 8 + t / b(1);
      const f = hz(chordAt(beat).root);
      ph += (TAU * f) / SR;
      const eighth = (beat * 2) % 1;
      const breakdown = beat >= 37.5 && beat < 40 ? 0.35 : 1;
      return (
        (Math.sin(ph) + 0.25 * Math.sin(2 * ph)) *
        (0.55 + 0.45 * Math.exp(-eighth * 3)) *
        breakdown
      );
    },
    { gain: 0.42 },
  );
}

// Plucked arpeggio on sixteenths, echoing in ping-pong.
const ARP = [0, 2, 1, 3, 2, 4, 3, 1];
for (let s = 8 * 4; s < 56 * 4; s++) {
  const beat = s / 4;
  const tones = chordAt(beat)
    .notes.slice(-4)
    .map((m) => m + 12);
  const note = tones[ARP[s % 8] % tones.length];
  const accent = s % 4 === 0 ? 1 : 0.65;
  const soft = beat >= 37.5 && beat < 40 ? 0.55 : 1;
  play(music, b(beat), 0.9, pluck(hz(note), s + 11), {
    gain: 0.09 * accent * soft,
    pan: s % 2 ? 0.35 : -0.35,
    send: 0.2,
    delay: 0.5,
  });
}
// Intro: the arp enters an octave up, sparse, as the threads arrive.
for (let s = 0; s < 32; s += 2) {
  const tones = CHORDS[0].notes.slice(-4).map((m) => m + 24);
  play(music, b(s / 4), 1.2, pluck(hz(tones[ARP[(s / 2) % 8] % 4]), s + 101), {
    gain: 0.05 * (s / 32),
    pan: s % 4 ? 0.5 : -0.5,
    send: 0.4,
    delay: 0.6,
  });
}

// ——— Drums: the drop at bar 2, a breakdown for the heart, a fill into the logo ———
for (let beat = 8; beat < 56; beat++) {
  const breakdown = beat >= 37.5 && beat < 40;
  const fill = beat === 55;
  if (!breakdown && !fill) play(drums, b(beat), 0.6, kick(), { gain: 0.95 });
  if (beat % 2 === 1 && !breakdown)
    play(drums, b(beat), 0.5, clap(beat), { gain: 0.34, send: 0.25 });
  for (let s = 0; s < 4; s++) {
    if (breakdown || fill) continue;
    const open = s === 2;
    play(drums, b(beat + s / 4), open ? 0.35 : 0.08, hat(beat * 4 + s, open), {
      gain: open ? 0.1 : 0.07 * (s % 2 ? 0.6 : 1),
      pan: 0.25,
    });
  }
}
for (let s = 0; s < 4; s++)
  play(drums, b(55 + s / 4), 0.3, clap(900 + s), {
    gain: 0.16 + s * 0.06,
    send: 0.3,
  });
for (const at of [b(8), b(24), b(40), b(56)])
  play(drums, at, 3, crash(at * 1000), { gain: 0.17, send: 0.3, pan: -0.2 });

// ——— Sound design, locked to the picture ———
for (const at of HITS)
  play(sfx, at, 3, impact(at * 100), {
    gain: at === b(56) ? 0.95 : 0.7,
    send: 0.45,
  });
play(sfx, b(40), 2, impact(4040), { gain: 0.55, send: 0.3 });
for (const [from, to] of [
  [0.2, b(8)],
  [b(30.5), b(32)],
  [b(38), b(40)],
  [b(53), b(56)],
]) {
  play(sfx, from, to - from, sweep(Math.round(from * 97), to - from, "rise"), {
    gain: 0.22,
    send: 0.3,
  });
}
// Whooshes travel right to left, the way the reel reads.
for (const at of CUES.whooshes) {
  play(sfx, at - 0.3, 0.6, sweep(Math.round(at * 31), 0.6, "whoosh"), {
    gain: 0.3,
    pan: (t) => 0.9 - 3 * t,
    send: 0.2,
  });
}
for (const at of CUES.cuts) {
  play(sfx, at - 0.12, 0.24, sweep(Math.round(at * 57), 0.24, "whoosh"), {
    gain: 0.2,
    pan: (t) => 0.6 - 5 * t,
  });
}
// Petals chime up a D minor scale; the logo blooms in D major.
const PETAL_NOTES = [74, 77, 81, 84, 86, 89, 93, 96];
const BLOOM_NOTES = [74, 78, 81, 85, 86, 90, 93, 98];
CUES.petals.forEach((at, i) => {
  play(sfx, at, 3, bell(hz(PETAL_NOTES[i])), {
    gain: 0.07,
    pan: -0.6 + i * 0.17,
    send: 0.5,
    delay: 0.3,
  });
});
CUES.bloom.forEach((at, i) => {
  play(sfx, at, 4, bell(hz(BLOOM_NOTES[i]), 1.4), {
    gain: 0.08,
    pan: 0.6 - i * 0.17,
    send: 0.55,
    delay: 0.3,
  });
});
CUES.threads.forEach((at, i) => {
  play(sfx, at, 1.4, bell(hz(98 + (i % 3) * 2), 3.5), {
    gain: 0.018,
    pan: i % 2 ? 0.8 : -0.8,
    send: 0.7,
  });
});
CUES.flips.forEach((at, i) => {
  play(sfx, at, 0.2, flick(i + 70), { gain: 0.28, pan: -0.5 + i * 0.14 });
});
// Wheel: one tick per peg, from the same spin curve the picture uses.
pegTimes().forEach((at, i) => {
  play(sfx, at, 0.05, tick(i + 300), { gain: 0.13, pan: -0.25 });
});
play(sfx, b(29), 3, bell(hz(84), 1.2), { gain: 0.1, send: 0.5 });
play(sfx, b(29), 3, bell(hz(88), 1.2), { gain: 0.08, send: 0.5 });
play(sfx, b(29), 3, bell(hz(91), 1.2), { gain: 0.07, send: 0.5 });
CUES.picks.forEach((at, i) => {
  play(sfx, at, 0.2, blip(1500 + (i % 4) * 150, 900 + (i % 4) * 100), {
    gain: 0.14,
    pan: i < 4 ? 0.5 : -0.5,
    send: 0.15,
  });
});
for (const [i, at] of [b(38), b(38.35), b(39), b(39.35)].entries())
  play(sfx, at, 0.5, thump(), { gain: i % 2 ? 0.5 : 0.75 });
play(sfx, b(37), 4, bell(hz(81), 1), { gain: 0.1, send: 0.6 });
play(sfx, b(37), 4, bell(hz(86), 1), { gain: 0.08, send: 0.6 });
CUES.digits.forEach((at, i) => {
  play(sfx, at, 0.15, blip(900, 500), { gain: 0.16, pan: 0.45 });
  play(sfx, at, 0.05, tick(i + 800), { gain: 0.08, pan: 0.45 });
});
CUES.typing.forEach((at, i) => {
  play(sfx, at, 0.12, blip(2200, 1600), { gain: 0.1, pan: -0.45 });
  play(sfx, at, 0.05, tick(i + 900), { gain: 0.05, pan: -0.45 });
});
for (const [i, m] of [81, 86, 90, 93].entries())
  play(sfx, CUES.connect + i * 0.04, 3, bell(hz(m), 1.6), {
    gain: 0.07,
    send: 0.55,
  });
// A reversed cymbal sucks into the logo.
{
  const n = noise(5656);
  const hp = new Biquad().set("hp", 3000, 0.7);
  const dur = b(2);
  play(sfx, b(56) - dur, dur, (t) => hp.run(n()) * (t / dur) ** 3, {
    gain: 0.3,
    send: 0.3,
  });
}

// ——— Effects and master ———
/** Dotted-eighth ping-pong, wet only: each repeat crosses sides. */
function pingPong() {
  const d = Math.round(b(0.75) * SR);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  for (let i = d; i < N; i++) {
    L[i] = 0.42 * (echo.R[i - d] + R[i - d]);
    R[i] = 0.42 * (echo.L[i - d] + L[i - d]);
  }
  echo.L = L;
  echo.R = R;
}
/** Freeverb: eight damped combs and four allpasses per side. */
function reverb(input, spread) {
  const out = new Float32Array(N);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((l) => ({
    buf: new Float32Array(Math.round((l + spread) * 1.088)),
    i: 0,
    low: 0,
  }));
  const alls = [556, 441, 341, 225].map((l) => ({
    buf: new Float32Array(Math.round((l + spread) * 1.088)),
    i: 0,
  }));
  for (let n = 0; n < N; n++) {
    const x = input[n] * 0.015;
    let y = 0;
    for (const c of combs) {
      const v = c.buf[c.i];
      c.low = v * 0.7 + c.low * 0.3;
      c.buf[c.i] = x + c.low * 0.87;
      c.i = (c.i + 1) % c.buf.length;
      y += v;
    }
    for (const a of alls) {
      const v = a.buf[a.i];
      a.buf[a.i] = y + v * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      y = v - y;
    }
    out[n] = y;
  }
  return out;
}

export function writeScore(path) {
  pingPong();
  for (let i = 0; i < N; i++) {
    verb.L[i] += echo.L[i] * 0.3;
    verb.R[i] += echo.R[i] * 0.3;
  }
  const revL = reverb(verb.L, 0);
  const revR = reverb(verb.R, 23);
  // Sidechain: the music ducks under every kick.
  const kicks = [];
  for (let beat = 8; beat < 56; beat++)
    if (!(beat >= 37.5 && beat < 40) && beat !== 55) kicks.push(b(beat));
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  let k = 0;
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    while (k + 1 < kicks.length && kicks[k + 1] <= t) k++;
    const since = kicks.length && t >= kicks[0] ? t - kicks[k] : 9;
    const duck = 1 - 0.6 * Math.exp(-since * 9);
    const fade =
      Math.min(1, t / 0.02) *
      (1 - Math.min(1, Math.max(0, (t - (DURATION - 1.6)) / 1.5)) ** 2);
    L[i] =
      Math.tanh(
        (drums.L[i] +
          (music.L[i] + echo.L[i] * 0.5) * duck +
          sfx.L[i] +
          revL[i]) *
          0.9,
      ) * fade;
    R[i] =
      Math.tanh(
        (drums.R[i] +
          (music.R[i] + echo.R[i] * 0.5) * duck +
          sfx.R[i] +
          revR[i]) *
          0.9,
      ) * fade;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const gain = 0.89 / peak;
  const wav = Buffer.alloc(44 + N * 4);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + N * 4, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(SR, 24);
  wav.writeUInt32LE(SR * 4, 28);
  wav.writeUInt16LE(4, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    wav.writeInt16LE(Math.round(L[i] * gain * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(R[i] * gain * 32767), 46 + i * 4);
  }
  writeFileSync(path, wav);
}
