// The Arabic guide library: docs/guides-ar, built by scripts/build-guides.mjs,
// grouped into the sections couples browse at /guides.
import classics from "../docs/guides-ar/classics.json" with { type: "json" };
import foreplay from "../docs/guides-ar/foreplay.json" with { type: "json" };
import health from "../docs/guides-ar/health.json" with { type: "json" };
import kink from "../docs/guides-ar/kink.json" with { type: "json" };
import men from "../docs/guides-ar/men.json" with { type: "json" };
import oral from "../docs/guides-ar/oral.json" with { type: "json" };
import orgasm from "../docs/guides-ar/orgasm.json" with { type: "json" };
import positions from "../docs/guides-ar/positions.json" with { type: "json" };
import relationship from "../docs/guides-ar/relationship.json" with {
  type: "json",
};
import safety from "../docs/guides-ar/safety.json" with { type: "json" };
import women from "../docs/guides-ar/women.json" with { type: "json" };

export type Guide = {
  id: string;
  audience: "couple" | "wife" | "husband";
  title_ar: string;
  summary_ar: string;
  sections_ar?: { heading_ar: string; text_ar: string }[];
  points_ar: string[];
  source: {
    title_en: string;
    url: string;
    publisher: string;
    author: string;
    license: string;
    license_url: string;
    attribution: string;
  };
};

export const AUDIENCE: Record<Guide["audience"], string> = {
  couple: "للزوجين",
  wife: "للزوجة",
  husband: "للزوج",
};

const section = (
  slug: string,
  title: string,
  blurb: string,
  ...files: { guides: unknown[] }[]
) => ({
  slug,
  title,
  blurb,
  guides: files.flatMap((file) => file.guides) as Guide[],
});

/** Sections in reading order: the relationship first, the old books last. */
export const SECTIONS = [
  section(
    "relationship",
    "العلاقة والتواصل",
    "الحديث عن الرغبة، والرضا، والقرب العاطفي، ومراحل الحياة معًا.",
    relationship,
  ),
  section(
    "foreplay",
    "المداعبة واللمس",
    "القبلات، والتدليك، ومناطق الإثارة، وكل ما يسبق الجماع.",
    foreplay,
  ),
  section(
    "positions",
    "الجماع والوضعيات",
    "الوضعيات الأساسية، والمزلّقات، والأدوات، والجماع أثناء الحمل.",
    positions,
  ),
  section(
    "orgasm",
    "الإثارة والنشوة",
    "كيف تعمل الاستجابة الجنسية، والنشوة وصعوباتها، والتحكم في القذف.",
    orgasm,
  ),
  section(
    "oral",
    "الجنس الفموي والنظافة",
    "الجنس الفموي بأنواعه، وتشريح الأعضاء، والنظافة والوقاية.",
    oral,
  ),
  section(
    "kink",
    "اللعب الجريء",
    "لعب الأدوار، والسيطرة والخضوع، والحدود والرعاية بعد اللعب.",
    kink,
  ),
  section(
    "women",
    "صحة الزوجة",
    "ألم الجماع، وقاع الحوض، والدورة، وانقطاع الطمث، وما بعد الولادة.",
    women,
  ),
  section(
    "men",
    "صحة الزوج",
    "الانتصاب، وسرعة القذف وتأخره، والهرمونات، ومشكلات القضيب.",
    men,
  ),
  section(
    "health",
    "الصحة والوقاية",
    "الرغبة، والخصوبة، ومنع الحمل، والأمراض المنقولة جنسيًا.",
    health,
    safety,
  ),
  section(
    "classics",
    "من الكتب الكلاسيكية",
    "مختارات من كاما سوترا، والروض العطر، وكتب الزواج القديمة.",
    classics,
  ),
];

export type Section = (typeof SECTIONS)[number];

export const sectionBySlug = (slug: string) =>
  SECTIONS.find((s) => s.slug === slug);

export const GUIDE_COUNT = SECTIONS.reduce((n, s) => n + s.guides.length, 0);

export function guidesLabel(n: number) {
  if (n === 1) return "دليل واحد";
  if (n === 2) return "دليلان";
  if (n <= 10) return `${n} أدلة`;
  return `${n} دليلًا`;
}
