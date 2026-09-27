import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { CONSTRAINT_KEYS, TOPIC_KEYS } from "../lib/tags";

const status = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("hidden"),
);
const level = v.union(v.literal(1), v.literal(2), v.literal(3));
const topics = v.array(v.union(...TOPIC_KEYS.map((t) => v.literal(t))));
const constraints = v.array(
  v.union(...CONSTRAINT_KEYS.map((c) => v.literal(c))),
);
export const activityKind = v.union(
  v.literal("card"),
  v.literal("challenge"),
  v.literal("desire"),
);

// Two-phone sessions. The types mirror lib/pair.ts, which decides what each phone sees.
export const limits = v.object({
  maxIntensity: level,
  blockedTopics: topics,
  blockedConstraints: constraints,
});
const player = v.object({
  key: v.string(),
  /** Last heartbeat, by the server's clock. */
  seen: v.number(),
  page: v.optional(v.string()),
  limits: v.optional(limits),
});
const slugs = v.array(v.string());
const slug = v.union(v.string(), v.null());
const round = v.object({
  host: v.optional(slugs),
  guest: v.optional(slugs),
  matches: v.optional(slugs),
});
/** Game state both phones share: the same card, spin, challenge, and path step. */
export const shared = v.object({
  cards: v.object({
    drawn: slugs,
    card: slug,
    spent: v.union(v.literal("question"), v.literal("dare"), v.null()),
  }),
  wheel: v.object({
    spin: v.union(
      v.literal("activity"),
      v.literal("topic"),
      v.literal("intensity"),
    ),
    seed: v.number(),
    turn: v.number(),
    result: slug,
  }),
  library: v.object({ chosen: slug }),
  path: v.object({
    steps: v.union(slugs, v.null()),
    marks: v.array(v.union(v.literal("done"), v.literal("skipped"))),
    stopped: v.boolean(),
  }),
});

export default defineSchema({
  positions: defineTable({
    slug: v.string(),
    order: v.number(),
    status,
    name: v.string(),
    summary: v.string(),
    description: v.string(),
    steps: v.array(v.string()),
    /** Comfort and safety notes. */
    care: v.array(v.string()),
    // ponytail: public path under /public; move to Convex file storage with the admin (milestone 5).
    image: v.string(),
    imageAlt: v.string(),
    difficulty: level,
    intensity: level,
    topics,
    constraints,
  })
    .index("by_status_and_order", ["status", "order"])
    .index("by_slug", ["slug"]),

  activities: defineTable({
    slug: v.string(),
    kind: activityKind,
    status,
    title: v.string(),
    body: v.string(),
    intensity: level,
    topics,
    constraints,
    minutes: v.optional(v.number()),
    /** Desires only: the real-world step a shared desire turns into. */
    action: v.optional(v.string()),
  })
    .index("by_status_and_kind", ["status", "kind"])
    .index("by_slug", ["slug"]),

  sessions: defineTable({
    host: player,
    guest: v.optional(player),
    // The invite: a short code and a link token, both gone once the guest joins.
    code: v.optional(v.string()),
    invite: v.optional(v.string()),
    inviteUntil: v.number(),
    /** Last action by either partner; a day without one deletes the session. */
    activeAt: v.number(),
    desires: v.optional(round),
    discover: v.optional(round),
    ...shared.partial().fields,
  })
    .index("by_host_key", ["host.key"])
    .index("by_guest_key", ["guest.key"])
    .index("by_code", ["code"])
    .index("by_invite", ["invite"])
    .index("by_activeAt", ["activeAt"]),
});
