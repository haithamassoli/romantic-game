import assert from "node:assert/strict";
import test from "node:test";
import { combineLimits, isAllowed, type Limits, NO_LIMITS } from "./tags.ts";

const item = {
  intensity: 2,
  topics: ["positions", "kiss"],
  constraints: ["knees"],
};

test("no limits allow everything", () => {
  assert.equal(isAllowed(item, NO_LIMITS), true);
});

test("intensity above the limit is hidden", () => {
  assert.equal(isAllowed(item, { ...NO_LIMITS, maxIntensity: 1 }), false);
  assert.equal(isAllowed(item, { ...NO_LIMITS, maxIntensity: 2 }), true);
});

test("a blocked topic or constraint hides the item", () => {
  assert.equal(
    isAllowed(item, { ...NO_LIMITS, blockedTopics: ["kiss"] }),
    false,
  );
  assert.equal(
    isAllowed(item, { ...NO_LIMITS, blockedConstraints: ["knees"] }),
    false,
  );
  assert.equal(
    isAllowed(item, {
      ...NO_LIMITS,
      blockedTopics: ["oral"],
      blockedConstraints: ["back"],
    }),
    true,
  );
});

test("combined limits take the lower intensity and both blocked lists", () => {
  const a: Limits = {
    maxIntensity: 3,
    blockedTopics: ["oral"],
    blockedConstraints: ["back"],
  };
  const b: Limits = {
    maxIntensity: 1,
    blockedTopics: ["oral", "props"],
    blockedConstraints: [],
  };
  assert.deepEqual(combineLimits(a, b), {
    maxIntensity: 1,
    blockedTopics: ["oral", "props"],
    blockedConstraints: ["back"],
  });
  // Either partner's block is enough to hide an item.
  assert.equal(
    isAllowed(
      { intensity: 1, topics: ["props"], constraints: [] },
      combineLimits(a, b),
    ),
    false,
  );
});
