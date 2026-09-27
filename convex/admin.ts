import { ConvexError, v } from "convex/values";
import { type Content, type Kind, publishError, SLUG } from "../lib/content";
import type { Id } from "./_generated/dataModel";
import { env, type MutationCtx, mutation, query } from "./_generated/server";
import { imageUrl } from "./positions";
import { activity, position } from "./schema";

// Publisher-only functions. No accounts: each call carries the publisher's
// token, checked here against the ADMIN_TOKEN env var (convex.config.ts).
// Couples never need it, and no public function returns drafts or hidden items.

const token = v.string();

const digest = async (s: string) =>
  new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
  );

/** Constant-time: both sides are hashed to 32 bytes and compared in full. */
async function isPublisher(given: string) {
  const expected = env.ADMIN_TOKEN;
  // Unset or weak: nobody is the publisher.
  if (!expected || expected.length < 32) return false;
  const [a, b] = await Promise.all([digest(given), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function guard(given: string) {
  if (!(await isPublisher(given))) {
    throw new ConvexError("رمز الناشر غير صحيح. اخرج وادخل من جديد.");
  }
}

/** For the sign-in form: is this the publisher's token? */
export const check = query({
  args: { token },
  handler: (_ctx, { token }) => isPublisher(token),
});

/** Everything, in every state, with each drawing's address; null for a wrong token. */
export const list = query({
  args: { token },
  handler: async (ctx, { token }) => {
    if (!(await isPublisher(token))) return null;
    // ponytail: 500 of each is far past a hand-written catalogue; paginate past that.
    const positions = await ctx.db.query("positions").take(500);
    return {
      positions: await Promise.all(
        positions.map(async (p) => ({
          ...p,
          imageUrl: await imageUrl(ctx, p),
        })),
      ),
      activities: await ctx.db.query("activities").take(500),
    };
  },
});

/**
 * Where the admin form uploads a new drawing (the file lands in Convex storage).
 * ponytail: a file uploaded but never saved with an item stays in storage;
 * sweep _storage rows no position references if that ever adds up.
 */
export const uploadUrl = mutation({
  args: { token },
  handler: async (ctx, { token }) => {
    await guard(token);
    return await ctx.storage.generateUploadUrl();
  },
});

const DRAWINGS = ["image/png", "image/jpeg", "image/webp"];
/** The 16 seeded drawings weigh about 2.5 MB each. */
const MAX_BYTES = 10_000_000;
const GONE = "لم يعد هذا العنصر موجودًا.";

/**
 * Why a save can't go through, in Arabic, or null. A new item's slug must be
 * well formed and unused (it never changes after); a published item must be
 * complete (lib/content.ts); a newly uploaded drawing must be an image of at
 * most MAX_BYTES.
 * Returned rather than thrown: a refusal is an answer, not a failure.
 */
async function refusal(
  ctx: MutationCtx,
  table: "positions" | "activities",
  kind: Kind,
  doc: Content & { status: string },
  isNew: boolean,
  upload?: Id<"_storage">,
) {
  const taken =
    isNew &&
    (await ctx.db
      .query(table)
      .withIndex("by_slug", (q) => q.eq("slug", doc.slug))
      .first());
  if (isNew && (!SLUG.test(doc.slug) || doc.slug.length > 60 || taken)) {
    return "الرابط أحرف لاتينية صغيرة وأرقام وشرطات (مثل slow-kiss)، ولا يتكرر.";
  }
  const incomplete = doc.status === "published" && publishError(kind, doc);
  if (incomplete) return incomplete;
  const file = upload && (await ctx.db.system.get("_storage", upload));
  if (
    upload &&
    (!file ||
      !DRAWINGS.includes(file.contentType ?? "") ||
      file.size > MAX_BYTES)
  ) {
    return "الرسم صورة PNG أو JPEG أو WebP، حتى 10 ميغابايت.";
  }
  return null;
}

const clean = (lines: string[]) =>
  lines.map((line) => line.trim()).filter(Boolean);

/**
 * Creates a position (no id) or rewrites one with every field it should
 * keep. Publishing, or saving one that stays published, requires everything
 * lib/content.ts lists; a draft or hidden one may be incomplete.
 */
export const savePosition = mutation({
  args: {
    token,
    id: v.optional(v.id("positions")),
    ...position.omit("order", "image", "intensity").fields,
  },
  handler: async (ctx, { token, id, ...fields }) => {
    await guard(token);
    const old = id ? await ctx.db.get("positions", id) : null;
    if (id && !old) return GONE;
    const doc = {
      ...fields,
      slug: old?.slug ?? fields.slug,
      steps: clean(fields.steps),
      care: clean(fields.care),
      // Every position is explicit sex (جريء) and a position, so a couple
      // below جريء, or blocking "وضعيات", never sees it.
      intensity: 3 as const,
      topics: [...new Set(["positions" as const, ...fields.topics])],
      // A seeded drawing under /public stays, unless an upload replaces it.
      image: old?.image,
      // Easiest first; a new one follows those of its difficulty.
      order: (fields.difficulty ?? 3) * 100 + (old ? old.order % 100 : 99),
    };
    const swapped = doc.imageId !== old?.imageId;
    const refused = await refusal(
      ctx,
      "positions",
      "position",
      doc,
      !old,
      swapped ? doc.imageId : undefined,
    );
    if (refused) return refused;
    // The uploaded drawing this one replaces goes with it.
    if (swapped && old?.imageId) await ctx.storage.delete(old.imageId);
    if (old) await ctx.db.replace("positions", old._id, doc);
    else await ctx.db.insert("positions", doc);
    return null;
  },
});

/** The same for cards, challenges and desires. */
export const saveActivity = mutation({
  args: { token, id: v.optional(v.id("activities")), ...activity.fields },
  handler: async (ctx, { token, id, ...fields }) => {
    await guard(token);
    const old = id ? await ctx.db.get("activities", id) : null;
    if (id && !old) return GONE;
    const doc = { ...fields, slug: old?.slug ?? fields.slug };
    const refused = await refusal(ctx, "activities", doc.kind, doc, !old);
    if (refused) return refused;
    if (old) await ctx.db.replace("activities", old._id, doc);
    else await ctx.db.insert("activities", doc);
    return null;
  },
});
