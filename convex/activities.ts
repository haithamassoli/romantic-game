import { query } from "./_generated/server";
import { activityKind } from "./schema";

/**
 * Published activities of one kind. The client filters them by the couple's
 * limits, so those limits never leave the device.
 */
export const list = query({
  args: { kind: activityKind },
  handler: async (ctx, { kind }) =>
    await ctx.db
      .query("activities")
      .withIndex("by_status_and_kind", (q) =>
        q.eq("status", "published").eq("kind", kind),
      )
      // ponytail: 200 per kind covers a hand-written deck; paginate past that.
      .take(200),
});
