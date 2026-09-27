import { v } from "convex/values";
import { type QueryCtx, query } from "./_generated/server";

export const published = (ctx: QueryCtx) =>
  ctx.db
    .query("positions")
    .withIndex("by_status_and_order", (q) => q.eq("status", "published"))
    // ponytail: one page of 200 is plenty for a hand-drawn guide; paginate past that.
    .take(200);

/** Published positions, easiest first. */
export const list = query({
  args: {},
  handler: (ctx) => published(ctx),
});

/** One published position, or null for drafts, hidden, and unknown slugs. */
export const get = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const position = await ctx.db
      .query("positions")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    return position?.status === "published" ? position : null;
  },
});
