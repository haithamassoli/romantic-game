// Pure game logic. Every game starts from `allowedFor`, so nothing either partner excluded can be drawn.
import {
  INTENSITY,
  isAllowed,
  LEVELS,
  type Limits,
  type Tagged,
  TOPIC_KEYS,
  TOPICS,
} from "./tags.ts";

type Item = {
  slug: string;
  title: string;
  intensity: number;
  topics: readonly string[];
  constraints: readonly string[];
};

/** The one filter every game uses: only what both partners accept. */
export function allowedFor<T extends Tagged>(
  items: readonly T[],
  limits: Limits,
): T[] {
  return items.filter((item) => isAllowed(item, limits));
}

export function pick<T>(list: readonly T[], random = Math.random): T {
  return list[Math.floor(random() * list.length)];
}

/** A random card not drawn yet; null once the deck is spent. */
export function draw<T extends Item>(
  deck: readonly T[],
  drawn: readonly string[],
  random = Math.random,
): T | null {
  const left = deck.filter((card) => !drawn.includes(card.slug));
  return left.length > 0 ? pick(left, random) : null;
}

export type Spin = "activity" | "topic" | "intensity";
export type Segment<T> = { label: string; items: T[] };

/** Wheel segments: only options that still hold at least one allowed item. */
export function wheelSegments<T extends Item>(
  pool: readonly T[],
  spin: Spin,
  random = Math.random,
): Segment<T>[] {
  if (spin === "topic") {
    return TOPIC_KEYS.map((t) => ({
      label: TOPICS[t],
      items: pool.filter((item) => item.topics.includes(t)),
    })).filter((segment) => segment.items.length > 0);
  }
  if (spin === "intensity") {
    return LEVELS.map((level) => ({
      label: INTENSITY[level],
      items: pool.filter((item) => item.intensity === level),
    })).filter((segment) => segment.items.length > 0);
  }
  // Eight random activities fit the wheel's labels; each spin reshuffles them.
  const rest = [...pool];
  const segments: Segment<T>[] = [];
  while (rest.length > 0 && segments.length < 8) {
    const [item] = rest.splice(Math.floor(random() * rest.length), 1);
    segments.push({ label: item.title, items: [item] });
  }
  return segments;
}

/** Deterministic random numbers (mulberry32), so a wheel renders the same segments it spun. */
export function seeded(seed: number) {
  let s = Math.floor(seed * 2 ** 32);
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * What both partners picked, in the pool's order, and nothing either picked alone.
 * Picks outside the pool (not allowed, excluded, unpublished) never match.
 */
export function match<T extends { slug: string }>(
  pool: readonly T[],
  first: readonly string[],
  second: readonly string[],
): T[] {
  return pool.filter(
    (item) => first.includes(item.slug) && second.includes(item.slug),
  );
}

export const PATH_MINUTES = [15, 30, 45] as const;

/** Untimed cards and challenges still take a few minutes each. */
export const stepMinutes = (item: { minutes?: number }) => item.minutes ?? 3;

function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const rest = [...list];
  const out: T[] = [];
  while (rest.length > 0) {
    out.push(...rest.splice(Math.floor(random() * rest.length), 1));
  }
  return out;
}

/**
 * The night path: gentle steps first, bolder later, never longer than `minutes`
 * nor bolder than `ceiling`. Each level gets an equal share of the time, and what
 * one leaves unused passes to the next; then any step that still fits fills the
 * rest, so the path runs close to the chosen time. Steps finished on earlier
 * nights only fill what fresh ones can't, and come after them.
 */
export function nightPath<T extends Item & { minutes?: number }>(
  pool: readonly T[],
  minutes: number,
  ceiling: number,
  done: readonly string[] = [],
  random = Math.random,
): T[] {
  const fits = pool.filter(
    (item) => item.intensity <= ceiling && stepMinutes(item) <= minutes,
  );
  const fresh = shuffle(
    fits.filter((item) => !done.includes(item.slug)),
    random,
  );
  const again = shuffle(
    fits.filter((item) => done.includes(item.slug)),
    random,
  );
  const levels = LEVELS.filter((l) => fits.some((i) => i.intensity === l));
  const path: T[] = [];
  let used = 0;
  const add = (item: T, until: number) => {
    if (path.includes(item) || used + stepMinutes(item) > until) return;
    path.push(item);
    used += stepMinutes(item);
  };
  for (const [n, level] of levels.entries()) {
    for (const item of fresh) {
      if (item.intensity === level) {
        add(item, (minutes * (n + 1)) / levels.length);
      }
    }
  }
  for (const item of [...fresh, ...again]) add(item, minutes);
  // A stable sort: gentle to bold, and within a level fresh steps stay first.
  return path.sort((a, b) => a.intensity - b.intensity);
}

/**
 * Where a drawn path stands. `steps` holds each drawn slug's item, or undefined
 * once it left the pool (hidden, or edited out of the couple's limits); `at` is
 * the first step still there past the `marked` ones, -1 when none is left. A
 * step withdrawn mid-path is passed over, and marks stay aligned with slugs.
 */
export function pathAt<T extends { slug: string }>(
  slugs: readonly string[],
  pool: readonly T[],
  marked: number,
) {
  const steps = slugs.map((slug) => pool.find((item) => item.slug === slug));
  return { steps, at: steps.findIndex((step, i) => step && i >= marked) };
}

/**
 * The only progress a game writes: finished path steps, newest last. Content
 * slugs only, never a pick, a match, or a limit.
 */
export function remember(done: readonly string[], slug: string, keep = 60) {
  return JSON.stringify([...done.filter((s) => s !== slug), slug].slice(-keep));
}

// Everything this device remembers lives under `maan:` in localStorage.
export const PREFIX = "maan:";

/** Keys "مسح البيانات المحلية" removes: everything this site stored, and nothing else. */
export function localKeys(keys: readonly string[]) {
  return keys.filter((key) => key.startsWith(PREFIX));
}
