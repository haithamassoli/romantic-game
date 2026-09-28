// Shared tag vocabulary and the one limits filter, used by the client and Convex.

export const LEVELS = [1, 2, 3] as const;
export type Level = (typeof LEVELS)[number];

export const INTENSITY: Record<Level, string> = {
  1: "هادئ",
  2: "دافئ",
  3: "جريء",
};

export const DIFFICULTY: Record<Level, string> = {
  1: "سهلة",
  2: "متوسطة",
  3: "متقدمة",
};

export const TOPIC_KEYS = [
  "talk",
  "kiss",
  "touch",
  "massage",
  "undress",
  "oral",
  "roleplay",
  "props",
  "positions",
  "outside",
] as const;
export type Topic = (typeof TOPIC_KEYS)[number];

export const TOPICS: Record<Topic, string> = {
  talk: "حديث وأسئلة",
  kiss: "تقبيل",
  touch: "لمس ومداعبة",
  massage: "تدليك",
  undress: "تعرٍّ",
  oral: "فموي",
  roleplay: "تقمّص أدوار",
  props: "أدوات خفيفة",
  positions: "وضعيات",
  outside: "خارج غرفة النوم",
};

export const CONSTRAINT_KEYS = [
  "knees",
  "back",
  "hips",
  "balance",
  "strength",
  "flexibility",
] as const;
export type Constraint = (typeof CONSTRAINT_KEYS)[number];

export const CONSTRAINTS: Record<Constraint, string> = {
  knees: "الركبتان",
  back: "الظهر",
  hips: "الوركان",
  balance: "التوازن",
  strength: "القوة والتحمل",
  flexibility: "المرونة",
};

export type Limits = {
  maxIntensity: Level;
  blockedTopics: Topic[];
  blockedConstraints: Constraint[];
};

export const NO_LIMITS: Limits = {
  maxIntensity: 3,
  blockedTopics: [],
  blockedConstraints: [],
};

export type Tagged = {
  intensity: number;
  topics: readonly string[];
  constraints: readonly string[];
};

/** Two partners' limits: the lower intensity, and everything either blocked. */
export function combineLimits(a: Limits, b: Limits): Limits {
  return {
    maxIntensity: Math.min(a.maxIntensity, b.maxIntensity) as Level,
    blockedTopics: [...new Set([...a.blockedTopics, ...b.blockedTopics])],
    blockedConstraints: [
      ...new Set([...a.blockedConstraints, ...b.blockedConstraints]),
    ],
  };
}

export function isAllowed(item: Tagged, limits: Limits): boolean {
  return (
    item.intensity <= limits.maxIntensity &&
    !item.topics.some((t) => limits.blockedTopics.includes(t as Topic)) &&
    !item.constraints.some((c) =>
      limits.blockedConstraints.includes(c as Constraint),
    )
  );
}

/** "٣ وضعيات" / "١١ وضعية": Arabic counts change the noun. */
export function positionsLabel(n: number) {
  if (n === 0) return "لا وضعيات";
  if (n === 1) return "وضعية واحدة";
  if (n === 2) return "وضعيتان";
  if (n <= 10) return `${n} وضعيات`;
  return `${n} وضعية`;
}
