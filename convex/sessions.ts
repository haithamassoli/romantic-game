import { type Infer, v } from "convex/values";
import {
  answer,
  IDLE_MS,
  INVITE_MS,
  isCode,
  isSecret,
  viewFor,
} from "../lib/pair";
import { allowedFor } from "../lib/play";
import { combineLimits } from "../lib/tags";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { published as publishedActivities } from "./activities";
import { published as publishedPositions } from "./positions";
import { activityKind, limits as limitsShape, shared } from "./schema";

// Two-phone sessions. Every public function takes the caller's player key and
// finds the session through it: a wrong or missing key gets null or false,
// never data. What a phone may see is decided in one place, lib/pair.ts.

type Session = Doc<"sessions">;
const key = v.string();

async function sessionOf(ctx: QueryCtx, key: string) {
  if (!isSecret(key)) return null;
  return (
    (await ctx.db
      .query("sessions")
      .withIndex("by_host_key", (q) => q.eq("host.key", key))
      .first()) ??
    (await ctx.db
      .query("sessions")
      .withIndex("by_guest_key", (q) => q.eq("guest.key", key))
      .first())
  );
}

/** The caller's session, seat and own record, or null. */
async function member(ctx: QueryCtx, key: string) {
  const s = await sessionOf(ctx, key);
  if (s?.host.key === key) return { s, seat: "host" as const, me: s.host };
  if (s?.guest?.key === key) return { s, seat: "guest" as const, me: s.guest };
  return null;
}

const put = (seat: "host" | "guest", player: Session["host"]) =>
  seat === "host" ? { host: player } : { guest: player };

/** A join code or link token, whichever was given. */
const invited = (ctx: QueryCtx, invite: string) =>
  isCode(invite)
    ? ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("code", invite))
        .first()
    : isSecret(invite)
      ? ctx.db
          .query("sessions")
          .withIndex("by_invite", (q) => q.eq("invite", invite))
          .first()
      : null;

/** Both partners' limits combined, once both are in. Neither ever leaves the server. */
function combined(s: Session) {
  return s.host.limits && s.guest?.limits
    ? combineLimits(s.host.limits, s.guest.limits)
    : null;
}

/** What both accept, in the same order on both phones; null until both set limits. */
async function allowed(
  ctx: QueryCtx,
  s: Session,
  kinds: Infer<typeof activityKind>[],
) {
  const both = combined(s);
  if (!both) return null;
  const lists = await Promise.all(
    kinds.map((kind) => publishedActivities(ctx, kind)),
  );
  return allowedFor(lists.flat(), both);
}

async function allowedPositions(ctx: QueryCtx, s: Session) {
  const both = combined(s);
  return both && allowedFor(await publishedPositions(ctx), both);
}

export const view = query({
  args: { key },
  handler: async (ctx, { key }) => {
    const s = await sessionOf(ctx, key);
    return s && viewFor(s, key);
  },
});

/** Activities of one kind both accept, filtered here so neither's limits reach the other. */
export const pool = query({
  args: { key, kind: activityKind },
  handler: async (ctx, { key, kind }) => {
    const s = await sessionOf(ctx, key);
    return s && (await allowed(ctx, s, [kind]));
  },
});

export const positions = query({
  args: { key },
  handler: async (ctx, { key }) => {
    const s = await sessionOf(ctx, key);
    return s && (await allowedPositions(ctx, s));
  },
});

/**
 * Opens a session with this phone as host, or gives a host still waiting a
 * fresh invite. The phone sends its own random key, link token and code.
 */
export const open = mutation({
  args: { key, invite: v.string(), code: v.string() },
  handler: async (ctx, { key, invite, code }) => {
    if (!isSecret(key) || !isSecret(invite) || !isCode(code)) return false;
    // Taken (even by a lapsed invite): the phone draws another and retries.
    if ((await invited(ctx, invite)) || (await invited(ctx, code))) {
      return false;
    }
    const now = Date.now();
    const fresh = { code, invite, inviteUntil: now + INVITE_MS, activeAt: now };
    const s = await sessionOf(ctx, key);
    if (!s) {
      await ctx.db.insert("sessions", { host: { key, seen: now }, ...fresh });
      return true;
    }
    if (s.host.key !== key || s.guest) return false;
    await ctx.db.patch("sessions", s._id, fresh);
    return true;
  },
});

/**
 * Joins with a code or link token, only while it is fresh and the second seat
 * is free; both are spent at once, so a third phone finds nothing.
 * ponytail: no rate limiter (Convex sees no client IP, so a global limit would
 * let one guesser lock everyone out). An 8-symbol code (31^8 ≈ 850B) that lives ten
 * minutes and dies on first use is the guessing defence; put
 * @convex-dev/rate-limiter on this mutation if codes are ever attacked at scale.
 */
export const join = mutation({
  args: { key, invite: v.string() },
  handler: async (ctx, { key, invite }) => {
    if (!isSecret(key) || (await sessionOf(ctx, key))) return false;
    const s = await invited(ctx, invite);
    const now = Date.now();
    if (!s || s.guest || s.inviteUntil < now) return false;
    await ctx.db.patch("sessions", s._id, {
      guest: { key, seen: now },
      code: undefined,
      invite: undefined,
      activeAt: now,
    });
    return true;
  },
});

/** "Still here", and on which page. Presence only: it never counts as activity. */
export const heartbeat = mutation({
  args: { key, page: v.string() },
  handler: async (ctx, { key, page }) => {
    const m = await member(ctx, key);
    if (!m) return null;
    const known = /^\/play(\/[a-z]+)?$/.test(page) ? page : undefined;
    await ctx.db.patch(
      "sessions",
      m.s._id,
      put(m.seat, { ...m.me, seen: Date.now(), page: known }),
    );
    return null;
  },
});

const AFRESH = {
  desires: undefined,
  discover: undefined,
  cards: undefined,
  wheel: undefined,
  library: undefined,
  path: undefined,
};

/** This phone's own limits. New or cleared limits start every game afresh. */
export const setLimits = mutation({
  args: { key, limits: v.union(limitsShape, v.null()) },
  handler: async (ctx, { key, limits }) => {
    const m = await member(ctx, key);
    if (!m) return null;
    await ctx.db.patch("sessions", m.s._id, {
      ...put(m.seat, { ...m.me, limits: limits ?? undefined }),
      ...AFRESH,
      activeAt: Date.now(),
    });
    return null;
  },
});

/** Moves a shared game on both phones, if every card or challenge in it is one both accept. */
export const play = mutation({
  args: { key, ...shared.partial().fields },
  handler: async (ctx, { key, ...games }) => {
    const m = await member(ctx, key);
    const pool = m && (await allowed(ctx, m.s, ["card", "challenge"]));
    if (!m || !pool) return false;
    const ok = new Set(pool.map((item) => item.slug));
    const slugs = [
      games.cards?.card,
      ...(games.cards?.drawn ?? []),
      games.wheel?.result,
      games.library?.chosen,
      ...(games.path?.steps ?? []),
    ];
    if (!slugs.every((slug) => !slug || ok.has(slug))) return false;
    await ctx.db.patch("sessions", m.s._id, { ...games, activeAt: Date.now() });
    return true;
  },
});

/**
 * One phone's secret picks for a round of desires or positions; null starts a
 * new round. Once both have answered only the overlap is kept (lib/pair.ts).
 */
export const pick = mutation({
  args: {
    key,
    game: v.union(v.literal("desires"), v.literal("discover")),
    picks: v.union(v.array(v.string()), v.null()),
  },
  handler: async (ctx, { key, game, picks }) => {
    const m = await member(ctx, key);
    const pool =
      m &&
      (game === "desires"
        ? await allowed(ctx, m.s, ["desire"])
        : await allowedPositions(ctx, m.s));
    if (!m || !pool) return false;
    const round = picks ? answer(m.s[game], m.seat, picks, pool) : undefined;
    await ctx.db.patch("sessions", m.s._id, {
      ...(game === "desires" ? { desires: round } : { discover: round }),
      activeAt: Date.now(),
    });
    return true;
  },
});

/** Ends the session for both phones: everything in it is deleted now. */
export const end = mutation({
  args: { key },
  handler: async (ctx, { key }) => {
    const s = await sessionOf(ctx, key);
    if (s) await ctx.db.delete("sessions", s._id);
    return null;
  },
});

/** Deletes sessions idle for a day, a bounded batch at a time (see crons.ts). */
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const idle = await ctx.db
      .query("sessions")
      .withIndex("by_activeAt", (q) => q.lt("activeAt", Date.now() - IDLE_MS))
      .take(100);
    for (const s of idle) await ctx.db.delete("sessions", s._id);
    if (idle.length === 100) {
      await ctx.scheduler.runAfter(0, internal.sessions.sweep, {});
    }
    return null;
  },
});
