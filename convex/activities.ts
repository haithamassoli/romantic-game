import type { Infer } from "convex/values";
import { type QueryCtx, query } from "./_generated/server";
import { activityKind } from "./schema";

export const published = async (
  ctx: QueryCtx,
  kind: Infer<typeof activityKind>,
) => {
  const rows = await ctx.db
    .query("activities")
    .withIndex("by_status_and_kind", (q) =>
      q.eq("status", "published").eq("kind", kind),
    )
    // ponytail: 200 per kind covers a hand-written deck; paginate past that.
    .take(200);
  // Publishing required an intensity (lib/content.ts); the fallback only
  // satisfies the types, and would count as the boldest if one were missing.
  return rows.map((a) => ({ ...a, intensity: a.intensity ?? 3 }));
};

/**
 * Published activities of one kind. On one device the client filters them by
 * the couple's limits, so those limits never leave it; two phones use
 * `sessions.pool`, filtered on the server.
 */
export const list = query({
  args: { kind: activityKind },
  handler: (ctx, { kind }) => published(ctx, kind),
});
