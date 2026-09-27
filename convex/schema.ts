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
  })
    .index("by_status_and_kind", ["status", "kind"])
    .index("by_slug", ["slug"]),
});
