import assert from "node:assert/strict";
import test from "node:test";
import {
  AWAY_MS,
  answer,
  CODE_ALPHABET,
  CODE_LENGTH,
  isCode,
  isSecret,
  joinCode,
  type PairSession,
  readCode,
  secret,
  viewFor,
} from "./pair.ts";
import type { Limits } from "./tags.ts";

const hostKey = secret();
const guestKey = secret();
const hostLimits: Limits = {
  maxIntensity: 3,
  blockedTopics: ["roleplay"],
  blockedConstraints: ["knees"],
};
const guestLimits: Limits = {
  maxIntensity: 2,
  blockedTopics: ["props"],
  blockedConstraints: ["balance"],
};
const pool = [
  "shared-kiss",
  "host-only-oral",
  "guest-only-massage",
  "none",
].map((slug) => ({ slug }));

const waiting = (): PairSession => ({
  host: { key: hostKey, seen: 1000, limits: hostLimits },
  code: "K7MX2P",
  invite: secret(),
  inviteUntil: 5000,
});
const joined = (): PairSession => ({
  ...waiting(),
  code: undefined,
  invite: undefined,
  guest: { key: guestKey, seen: 1000, limits: guestLimits },
});

/** Everything a phone receives, as it goes over the wire. */
const wire = (s: PairSession, key: string) => JSON.stringify(viewFor(s, key));

test("a wrong, missing or guessed key sees nothing at all", () => {
  for (const s of [waiting(), joined()]) {
    for (const key of ["", secret(), "K7MX2P", s.invite ?? "x", "undefined"]) {
      assert.equal(viewFor(s, key), null, key);
    }
  }
  // Before anyone joins there is no guest seat to fall into.
  assert.equal(viewFor({ ...waiting(), guest: undefined }, ""), null);
});

test("no phone ever receives a key, or anyone's limits", () => {
  const s = joined();
  for (const key of [hostKey, guestKey]) {
    const sent = wire(s, key);
    for (const secretValue of [
      hostKey,
      guestKey,
      "maxIntensity",
      ...hostLimits.blockedTopics,
      ...hostLimits.blockedConstraints,
      ...guestLimits.blockedTopics,
      ...guestLimits.blockedConstraints,
    ]) {
      assert.ok(!sent.includes(secretValue), `${secretValue} was sent`);
    }
  }
  // Only whether each has set them.
  assert.deepEqual(viewFor(s, guestKey)?.limits, { me: true, partner: true });
  const unset = { ...s, guest: { key: guestKey, seen: 1000 } };
  assert.deepEqual(viewFor(unset, hostKey)?.limits, {
    me: true,
    partner: false,
  });
});

test("picks stay hidden until both answer, then only the overlap is shown", () => {
  const s = joined();
  s.desires = answer(
    undefined,
    "host",
    ["shared-kiss", "host-only-oral"],
    pool,
  );
  // One answer in: the other phone learns that, and nothing of what was picked.
  const guestSees = viewFor(s, guestKey);
  assert.deepEqual(guestSees?.desires, {
    me: false,
    partner: true,
    matches: null,
  });
  assert.ok(!wire(s, guestKey).includes("shared-kiss"));
  assert.ok(!wire(s, guestKey).includes("host-only-oral"));
  // Nor does the phone that picked get its own list back.
  assert.ok(!wire(s, hostKey).includes("shared-kiss"));

  s.desires = answer(
    s.desires,
    "guest",
    ["guest-only-massage", "shared-kiss", "not-in-pool"],
    pool,
  );
  // Both in: only the overlap is kept, for both phones alike.
  assert.deepEqual(s.desires, { matches: ["shared-kiss"] });
  for (const key of [hostKey, guestKey]) {
    assert.deepEqual(viewFor(s, key)?.desires, {
      me: false,
      partner: false,
      matches: ["shared-kiss"],
    });
    const sent = wire(s, key);
    assert.ok(!sent.includes("host-only-oral"));
    assert.ok(!sent.includes("guest-only-massage"));
  }
  // A finished round ignores late answers until a new one starts.
  assert.equal(answer(s.desires, "host", ["none"], pool), s.desires);
  // The other game's round is untouched.
  assert.deepEqual(viewFor(s, hostKey)?.discover, {
    me: false,
    partner: false,
    matches: null,
  });
});

test("no overlap shows an empty result, not either list", () => {
  let round = answer(undefined, "guest", ["guest-only-massage"], pool);
  round = answer(round, "host", ["host-only-oral"], pool);
  assert.deepEqual(round, { matches: [] });
});

test("only the waiting host sees the invite", () => {
  const s = waiting();
  assert.deepEqual(viewFor(s, hostKey)?.invite, {
    code: "K7MX2P",
    link: s.invite,
    until: 5000,
  });
  assert.equal(viewFor(s, hostKey)?.partner, null);
  const withGuest = { ...s, guest: { key: guestKey, seen: 1000 } };
  assert.equal(viewFor(withGuest, hostKey)?.invite, null);
  assert.equal(viewFor(withGuest, guestKey)?.invite, null);
});

test("a partner shows as disconnected once silent past the limit", () => {
  const s = joined();
  const at = (host: number, guest: number) => {
    s.host.seen = host;
    (s.guest as { seen: number }).seen = guest;
    return viewFor(s, hostKey)?.partner?.here;
  };
  assert.equal(at(1000, 1000), true);
  assert.equal(at(1000 + AWAY_MS - 1, 1000), true);
  assert.equal(at(1000 + AWAY_MS, 1000), false);
  // Back again: the next heartbeat reconnects.
  assert.equal(at(1000 + AWAY_MS, 1000 + AWAY_MS), true);
  // This phone waking up late never marks the partner away.
  assert.equal(at(1000, 9000), true);
});

test("secrets and codes are random, well formed, and read forgivingly", () => {
  const keys = new Set(Array.from({ length: 500 }, secret));
  assert.equal(keys.size, 500);
  for (const key of keys) assert.ok(isSecret(key), key);
  const codes = Array.from({ length: 500 }, joinCode);
  for (const code of codes) {
    assert.equal(code.length, CODE_LENGTH);
    assert.ok(isCode(code), code);
  }
  // Every symbol turns up; none of the confusable ones ever do.
  assert.equal(new Set(codes.join("")).size, CODE_ALPHABET.length);
  assert.ok(!/[01IOL]/.test(codes.join("")));
  assert.equal(readCode(" k7m-x2p "), "K7MX2P");
  assert.equal(readCode("ab٢٣cd٩٨"), "AB23CD98");
  assert.ok(isCode("K7MX2PQR"));
  assert.ok(!isCode("K7MX2PQO"));
  assert.ok(!isCode("K7MX2P"));
  assert.ok(!isSecret("short"));
});
