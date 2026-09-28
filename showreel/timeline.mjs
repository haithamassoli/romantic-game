// Shared by the picture (index.html) and the score (score.mjs), so every cut, hit and wheel tick lands on the same sample.

export const BPM = 128;
export const BEAT = 60 / BPM;
export const DURATION = BEAT * 64; // 16 bars at 128 BPM is exactly 30 s.
export const FPS = 60;

/** Time in seconds of a beat index (fractional beats allowed). */
export const b = (beat) => beat * BEAT;

// Scene starts, in beats. Each scene is two bars.
export const SCENES = [
  { at: 0, name: "الافتتاح" },
  { at: 8, name: "اقتربا أكثر" },
  { at: 16, name: "بطاقات التحدي" },
  { at: 24, name: "عجلة الاختيار" },
  { at: 32, name: "توافق الرغبات" },
  { at: 40, name: "ست تجارب" },
  { at: 48, name: "جهاز أو هاتفان" },
  { at: 56, name: "معًا" },
];

// The card ring accelerates, hands its speed to the wheel, and the wheel eases out onto the winner.
export const SEGMENTS = 8;
export const WINNER = 4;
const ringStart = b(22);
const handoff = b(24);
const stop = b(29);
const decel = stop - handoff;
const turns = 3;
// Land the winner's centre under the pointer at the top.
const target = -(WINNER * 45 + 22.5);
// easeOutCubic starts at 3 × Δ / D deg/s; the ring accelerates uniformly up to that speed.
function solveSpin() {
  for (let delta = turns * 360; ; delta += 1) {
    const w0 = (3 * delta) / decel;
    const ring = 0.5 * w0 * (handoff - ringStart);
    if ((((ring + delta - target) % 360) + 360) % 360 < 1)
      return { delta, w0, ring };
  }
}
const { delta, w0, ring } = solveSpin();

export const SPIN = { ringStart, handoff, stop };

/** Wheel rotation in degrees at time t, continuous from ring to wheel. */
export function spin(t) {
  if (t <= ringStart) return 0;
  if (t <= handoff) {
    const a = w0 / (handoff - ringStart);
    return 0.5 * a * (t - ringStart) ** 2;
  }
  const u = Math.min(1, (t - handoff) / decel);
  return ring + delta * (1 - (1 - u) ** 3);
}

/** Times the pointer crosses a peg, for the ticks you see and hear. */
export function pegTimes() {
  const times = [];
  let last = Math.floor(spin(handoff) / 45);
  for (let t = handoff; t <= stop; t += 1 / 4800) {
    const peg = Math.floor(spin(t) / 45);
    if (peg !== last) times.push(t);
    last = peg;
  }
  return times;
}

// Hits the camera shakes to and the score slams on.
export const HITS = [b(8), b(29), b(37), b(56)];

const range = (n, at) => Array.from({ length: n }, (_, i) => at(i));

// Every small motion that also makes a sound.
export const CUES = {
  threads: range(8, (i) => 0.08 + i * 0.07),
  petals: range(8, (i) => b(3 + i / 4)),
  flips: range(8, (i) => b(19 + i / 4)),
  picks: [33, 33.5, 34, 34.5, 35, 35.375, 35.75, 36.125].map(b),
  digits: [49.5, 50, 50.5, 51].map(b),
  typing: [51.25, 51.5, 51.75, 52].map(b),
  cuts: [41, 42, 43, 44, 45, 46].map(b),
  bloom: range(8, (i) => b(56 + i / 4)),
  whooshes: [b(16), b(22.5), b(31.5), b(39.75), b(47.25), b(55.5)],
  connect: b(54),
};
