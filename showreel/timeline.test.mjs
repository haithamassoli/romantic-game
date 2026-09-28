import assert from "node:assert/strict";
import { test } from "node:test";
import { DURATION, pegTimes, SPIN, spin, WINNER } from "./timeline.mjs";

test("the reel is exactly 30 seconds", () => {
  assert.equal(DURATION, 30);
});

test("the wheel lands on the winner, under the pointer", () => {
  const underPointer = (((-spin(SPIN.stop) % 360) + 360) % 360) / 45;
  assert.equal(Math.floor(underPointer), WINNER);
  assert.ok(
    Math.abs((underPointer % 1) - 0.5) < 0.05,
    "lands near the segment centre",
  );
});

test("the card ring hands its speed to the wheel without a jump", () => {
  const dt = 1e-4;
  const before = (spin(SPIN.handoff) - spin(SPIN.handoff - dt)) / dt;
  const after = (spin(SPIN.handoff + dt) - spin(SPIN.handoff)) / dt;
  assert.ok(Math.abs(before - after) / after < 0.01);
});

test("pegs tick faster early, then slow down", () => {
  const pegs = pegTimes();
  assert.ok(pegs.length > 20);
  assert.ok(pegs[1] - pegs[0] < pegs.at(-1) - pegs.at(-2));
});
