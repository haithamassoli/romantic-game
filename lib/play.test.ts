import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedFor,
  draw,
  localKeys,
  match,
  nightPath,
  PATH_MINUTES,
  PREFIX,
  pick,
  remember,
  type Spin,
  seeded,
  stepMinutes,
  wheelSegments,
} from "./play.ts";
import { games } from "./site-images.ts";
import { combineLimits, isAllowed, LEVELS, type Limits } from "./tags.ts";

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

test("a match reveals only what both picked, never a pick made alone", () => {
  const pool = allowedFor(items, both); // chat, kiss, stretch
  const first = ["chat", "kiss", "oral"];
  const second = ["stretch", "kiss", "oral"];
  const shown = match(pool, first, second).map((i) => i.slug);
  // "oral" was picked by both but breaks a limit, so it stays hidden too.
  assert.deepEqual(shown, ["kiss"]);
  // Whoever picks first, the result and its order are the same.
  assert.deepEqual(
    match(pool, second, first).map((i) => i.slug),
    shown,
  );
  for (const alone of ["chat", "stretch"]) {
    assert.ok(
      !shown.includes(alone),
      `${alone} was picked by one partner only`,
    );
  }
});

test("no overlap reveals nothing at all", () => {
  const pool = allowedFor(items, both);
  assert.deepEqual(match(pool, ["chat"], ["kiss", "stretch"]), []);
  assert.deepEqual(match(pool, [], ["chat", "kiss", "stretch"]), []);
  assert.deepEqual(match(pool, [], []), []);
});

const timed: (ReturnType<typeof item> & { minutes?: number })[] = [
  ...items,
  { ...item("feet", 1, ["massage"]), minutes: 10 },
  { ...item("candle-talk", 1, ["talk"]), minutes: 20 },
  { ...item("hug", 1, ["touch"]), minutes: 2 },
  { ...item("oil", 2, ["massage", "touch"]), minutes: 15 },
  { ...item("tease", 2, ["touch"]), minutes: 5 },
  { ...item("blind", 2, ["props", "touch"]), minutes: 10 },
  { ...item("slow-oral", 3, ["oral"]), minutes: 10 },
  { ...item("guide", 3, ["positions"]), minutes: 10 },
  { ...item("mirror", 3, ["touch"]), minutes: 5 },
];

test("the night path fits the time and ceiling, keeps the limits, and grows bolder", () => {
  for (const limits of [first, second, both]) {
    const pool = allowedFor(timed, limits);
    for (const minutes of PATH_MINUTES) {
      for (const ceiling of LEVELS) {
        for (let seed = 1; seed <= 30; seed++) {
          const path = nightPath(pool, minutes, ceiling, [], seeded(seed / 31));
          const label = `${minutes}min, up to ${ceiling}, seed ${seed}`;
          assert.ok(path.length > 0, label);
          assert.ok(
            path.reduce((sum, step) => sum + stepMinutes(step), 0) <= minutes,
            `${label}: too long`,
          );
          assert.equal(new Set(path.map((s) => s.slug)).size, path.length);
          for (const [i, step] of path.entries()) {
            assert.ok(step.intensity <= ceiling, `${label}: above the ceiling`);
            assert.ok(isAllowed(step, limits), `${label}: ${step.slug}`);
            assert.ok(
              i === 0 || path[i - 1].intensity <= step.intensity,
              `${label}: not graded`,
            );
          }
        }
      }
    }
  }
  // With room for every level, the path starts gentle and reaches the ceiling.
  const path = nightPath(allowedFor(timed, first), 45, 3, [], seeded(0.5));
  assert.equal(path[0].intensity, 1);
  assert.equal(path.at(-1)?.intensity, 3);
});

test("the night path skips steps finished before, until fresh ones run short", () => {
  const calm = Array.from({ length: 12 }, (_, i) => item(`calm-${i}`, 1, []));
  const slugs = calm.map((c) => c.slug);
  for (let seed = 1; seed <= 30; seed++) {
    const random = seeded(seed / 31);
    // Six fresh steps fill the night alone: no repeats at all.
    const done = slugs.slice(0, 6);
    const path = nightPath(calm, 15, 1, done, random);
    assert.equal(path.length, 5);
    assert.ok(path.every((s) => !done.includes(s.slug)));
    // Two fresh steps can't fill half of it: both come first, then repeats.
    const most = slugs.slice(0, 10);
    const short = nightPath(calm, 15, 1, most, random).map((s) => s.slug);
    assert.deepEqual(short.slice(0, 2).sort(), ["calm-10", "calm-11"]);
    assert.equal(short.length, 5);
  }
  assert.equal(nightPath(calm, 15, 1, slugs).length, 5);
});

test("nothing secret reaches local storage or a link", () => {
  // A whole night: secret limits, secret desire picks, a match, then a path.
  const desires = [item("d-kiss", 1, ["kiss"]), item("d-talk", 1, ["talk"])];
  const picksOne = ["d-kiss", "d-talk"];
  const picksTwo = ["d-kiss"];
  assert.deepEqual(
    match(desires, picksOne, picksTwo).map((d) => d.slug),
    ["d-kiss"],
  );
  const path = nightPath(allowedFor(timed, both), 15, 1, [], seeded(0.3));
  // Finish the first and last steps, skip the rest: exactly what is written.
  let saved = remember([], path[0].slug);
  saved = remember(JSON.parse(saved), path[path.length - 1].slug);
  const finished = [path[0].slug, path[path.length - 1].slug];
  assert.deepEqual(JSON.parse(saved), [...new Set(finished)]);
  const secrets = [
    ...picksOne,
    ...picksTwo,
    ...first.blockedTopics,
    ...first.blockedConstraints,
    ...second.blockedTopics,
    ...second.blockedConstraints,
    "maxIntensity",
  ];
  for (const secret of secrets) {
    assert.ok(!saved.includes(secret), `${secret} was written`);
  }
  // Progress lives under the one prefix "مسح البيانات المحلية" clears, and stays small.
  assert.deepEqual(localKeys([`${PREFIX}path`]), [`${PREFIX}path`]);
  const long = Array.from({ length: 80 }, (_, i) => `step-${i}`);
  assert.equal(JSON.parse(remember(long, "step-3")).length, 60);
  assert.equal(JSON.parse(remember(long, "step-3")).at(-1), "step-3");
  // Game links are fixed paths: no query or fragment to carry a pick.
  for (const game of games) assert.match(game.href, /^\/play\/[a-z]+$/);
});
