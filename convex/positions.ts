import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";

/** The drawing's address: an uploaded file, else the seeded one under /public. */
export const imageUrl = async (ctx: QueryCtx, p: Doc<"positions">) =>
  (p.imageId && (await ctx.storage.getUrl(p.imageId))) || p.image || null;

/**
 * A published position as couples get it. Publishing required its tags and
 * drawing (lib/content.ts); the fallbacks only satisfy the types, and would
 * count as the boldest and hardest if a tag were ever missing.
 */
const shown = async (ctx: QueryCtx, p: Doc<"positions">) => ({
  ...p,
  image: (await imageUrl(ctx, p)) ?? "",
  difficulty: p.difficulty ?? 3,
  intensity: p.intensity ?? 3,
});

export const published = async (ctx: QueryCtx) => {
  const rows = await ctx.db
    .query("positions")
    .withIndex("by_status_and_order", (q) => q.eq("status", "published"))
    // ponytail: one page of 200 is plenty for a hand-drawn guide; paginate past that.
    .take(200);
  return Promise.all(rows.map((p) => shown(ctx, p)));
};

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
    return position?.status === "published" ? shown(ctx, position) : null;
  },
});
