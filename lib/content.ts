// What an item needs before couples may see it. Convex runs this on every
// publish and on the seed; the admin form shows it as a live hint.
import { CONSTRAINT_KEYS, LEVELS, TOPIC_KEYS } from "./tags.ts";

export type Kind = "position" | "card" | "challenge" | "desire";

/** Loose on purpose: a draft may lack any of it. */
export type Content = {
  slug: string;
  intensity?: number;
  topics: readonly string[];
  constraints: readonly string[];
  // Positions
  name?: string;
  summary?: string;
  description?: string;
  steps?: readonly string[];
  care?: readonly string[];
  difficulty?: number;
  image?: string;
  imageId?: string;
  imageAlt?: string;
  imageRights?: string;
  // Cards, challenges and desires
  title?: string;
  body?: string;
  action?: string;
  minutes?: number;
};

/** Latin, lowercase, dashes between words: the item's lasting address. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const blank = (s?: string) => !s?.trim();
const isLevel = (n?: number) => LEVELS.some((level) => level === n);

/** What still keeps this item from being published, in Arabic; empty once it may go live. */
export function missing(kind: Kind, item: Content): string[] {
  const out: string[] = [];
  const need = (gap: boolean, label: string) => gap && out.push(label);
  need(!SLUG.test(item.slug) || item.slug.length > 60, "رابط لاتيني صالح");
  if (kind === "position") {
    need(blank(item.name), "الاسم");
    need(blank(item.summary), "الملخص");
    need(blank(item.description), "الشرح");
    need(!item.steps?.some((s) => !blank(s)), "خطوة واحدة على الأقل");
    need(!item.care?.some((s) => !blank(s)), "ملاحظة راحة وسلامة");
    need(!isLevel(item.difficulty), "الصعوبة");
  } else {
    need(blank(item.title), "العنوان");
    need(blank(item.body), "النص");
    need(kind === "desire" && blank(item.action), "الخطوة الواقعية للرغبة");
    need(
      item.minutes !== undefined &&
        !(
          Number.isInteger(item.minutes) &&
          item.minutes >= 1 &&
          item.minutes <= 120
        ),
      "مدة بين 1 و120 دقيقة",
    );
  }
  need(!isLevel(item.intensity), "الجرأة");
  need(
    item.topics.length === 0 ||
      item.topics.some((t) => !TOPIC_KEYS.some((key) => key === t)),
    "موضوع واحد على الأقل من القائمة",
  );
  need(
    item.constraints.some((c) => !CONSTRAINT_KEYS.some((key) => key === c)),
    "قيود جسدية من القائمة فقط",
  );
  if (kind === "position") {
    need(!item.image && !item.imageId, "الرسم");
    need(blank(item.imageAlt), "النص البديل للرسم");
    need(blank(item.imageRights), "حقوق الرسم");
  }
  return out;
}

/** The refusal a publisher reads when publishing too early; null when nothing is missing. */
export function publishError(kind: Kind, item: Content) {
  const gaps = missing(kind, item);
  return gaps.length > 0 ? `لا يُنشر قبل إكمال: ${gaps.join("، ")}.` : null;
}
