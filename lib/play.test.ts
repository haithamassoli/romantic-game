import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedFor,
  draw,
  localKeys,
  pick,
  type Spin,
  seeded,
  wheelSegments,
} from "./play.ts";
import { combineLimits, isAllowed, type Limits } from "./tags.ts";

const item = (
  slug: string,
  intensity: number,
  topics: string[],
  constraints: string[] = [],
) => ({ slug, title: slug, intensity, topics, constraints });

const items = [
  item("chat", 1, ["talk"]),
  item("kiss", 1, ["kiss"]),
  item("massage", 1, ["massage"], ["knees"]),
  item("ice", 2, ["props", "kiss"]),
  item("strip", 2, ["undress"]),
  item("carry", 2, ["touch"], ["strength", "back"]),
  item("oral", 3, ["oral"]),
  item("standing", 3, ["positions", "outside"], ["balance"]),
  item("roleplay", 3, ["roleplay"]),
  item("stretch", 1, ["touch"], ["flexibility"]),
];

// Each partner blocks something different; neither sees the other's list.
const first: Limits = {
  maxIntensity: 3,
  blockedTopics: ["props"],
  blockedConstraints: ["back"],
};
const second: Limits = {
  maxIntensity: 2,
  blockedTopics: ["undress"],
  blockedConstraints: ["knees"],
};
const both = combineLimits(first, second);
const okForBoth = (i: (typeof items)[number]) =>
  isAllowed(i, first) && isAllowed(i, second);

test("the filter keeps exactly what both partners accept", () => {
  assert.deepEqual(
    allowedFor(items, both).map((i) => i.slug),
    ["chat", "kiss", "stretch"],
  );
  assert.deepEqual(allowedFor(items, both), items.filter(okForBoth));
});

test("drawing spends the whole allowed deck, never repeats, never breaks a limit", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const random = seeded(seed / 51);
    const deck = allowedFor(items, both);
    const drawn: string[] = [];
    for (let card = draw(deck, drawn, random); card; ) {
      assert.ok(okForBoth(card), `${card.slug} breaks a limit`);
      assert.ok(!drawn.includes(card.slug), `${card.slug} repeated`);
      drawn.push(card.slug);
      card = draw(deck, drawn, random);
    }
    assert.equal(drawn.length, deck.length);
  }
});

test("every wheel segment, and every spin result, is allowed for both", () => {
  for (const spin of ["activity", "topic", "intensity"] as Spin[]) {
    for (let seed = 1; seed <= 50; seed++) {
      const random = seeded(seed / 51);
      const segments = wheelSegments(allowedFor(items, both), spin, random);
      assert.ok(segments.length > 0);
      for (const segment of segments) {
        assert.ok(segment.items.length > 0);
        assert.ok(segment.items.every(okForBoth), `${spin}: ${segment.label}`);
      }
      assert.ok(okForBoth(pick(pick(segments, random).items, random)));
    }
  }
  // Only topics and levels that still hold an allowed item are offered.
  assert.deepEqual(
    wheelSegments(allowedFor(items, both), "intensity").map((s) => s.label),
    ["هادئ"],
  );
});

test("a library listing narrowed by category stays inside the limits", () => {
  const listing = allowedFor(items, both).filter((i) =>
    i.topics.includes("touch"),
  );
  assert.deepEqual(
    listing.map((i) => i.slug),
    ["stretch"],
  );
});

test("when nothing fits, every game gets nothing to show", () => {
  const none = combineLimits(both, {
    maxIntensity: 1,
    blockedTopics: ["talk", "kiss", "touch"],
    blockedConstraints: [],
  });
  const pool = allowedFor(items, none);
  assert.deepEqual(pool, []);
  assert.equal(draw(pool, []), null);
  for (const spin of ["activity", "topic", "intensity"] as Spin[]) {
    assert.deepEqual(wheelSegments(pool, spin), []);
  }
});

test("clearing local data removes preferences, favorites and progress, and nothing else", () => {
  const keys = [
    "maan:age",
    "maan:favorites",
    "maan:excluded",
    "maan:filters",
    "maan:timer",
    "maan:progress",
    "another-site:token",
  ];
  assert.deepEqual(localKeys(keys), keys.slice(0, -1));
});
