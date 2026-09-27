// Pure game logic. Every game starts from `allowedFor`, so nothing either partner excluded can be drawn.
import {
  INTENSITY,
  isAllowed,
  LEVELS,
  type Limits,
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
export function allowedFor<T extends Item>(
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

// Everything this device remembers lives under `maan:` in localStorage.
export const PREFIX = "maan:";

/** Keys "مسح البيانات المحلية" removes: everything this site stored, and nothing else. */
export function localKeys(keys: readonly string[]) {
  return keys.filter((key) => key.startsWith(PREFIX));
}
