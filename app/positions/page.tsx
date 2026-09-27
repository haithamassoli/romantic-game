"use client";

import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { POSITION_IMAGE_SIZE } from "@/lib/site-images";
import {
  CONSTRAINT_KEYS,
  CONSTRAINTS,
  DIFFICULTY,
  INTENSITY,
  isAllowed,
  LEVELS,
  type Level,
  type Limits,
  NO_LIMITS,
  TOPIC_KEYS,
  TOPICS,
} from "@/lib/tags";
import { readList, store, useStored } from "../providers";

type Filters = Limits & {
  maxDifficulty: Level;
  favoritesOnly: boolean;
  showExcluded: boolean;
};

const DEFAULTS: Filters = {
  ...NO_LIMITS,
  maxDifficulty: 3,
  favoritesOnly: false,
  showExcluded: false,
};

function readFilters(raw: string | null | undefined): Filters {
  try {
    return { ...DEFAULTS, ...JSON.parse(raw ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

/** "Easy only" / "Easy and medium" / "All" from a level vocabulary. */
function upTo(labels: Record<Level, string>, level: Level) {
  if (level === 1) return `${labels[1]} فقط`;
  if (level === 2) return `${labels[1]} و${labels[2]}`;
  return "الكل";
}

function countLabel(n: number) {
  if (n === 0) return "لا وضعيات";
  if (n === 1) return "وضعية واحدة";
  if (n === 2) return "وضعيتان";
  if (n <= 10) return `${n} وضعيات`;
  return `${n} وضعية`;
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export default function PositionsPage() {
  const positions = useQuery(api.positions.list);
  const filters = readFilters(useStored("filters"));
  const favorites = readList(useStored("favorites"));
  const excluded = readList(useStored("excluded"));

  const set = (patch: Partial<Filters>) =>
    store("filters", JSON.stringify({ ...filters, ...patch }));
  const reset = () => store("filters", JSON.stringify(DEFAULTS));

  const shown = (positions ?? []).filter(
    (p) =>
      isAllowed(p, filters) &&
      p.difficulty <= filters.maxDifficulty &&
      (!filters.favoritesOnly || favorites.includes(p.slug)) &&
      (filters.showExcluded || !excluded.includes(p.slug)),
  );
  // Only offer topics the published positions actually carry.
  const topics = TOPIC_KEYS.filter(
    (t) => t !== "positions" && positions?.some((p) => p.topics.includes(t)),
  );
  const active =
    Number(filters.maxDifficulty < 3) +
    Number(filters.maxIntensity < 3) +
    filters.blockedConstraints.length +
    filters.blockedTopics.length +
    Number(filters.favoritesOnly) +
    Number(filters.showExcluded);

  return (
    <>
      <section className="wrap pos-intro" aria-labelledby="positions-title">
        <h1 id="positions-title">دليل الوضعيات</h1>
        <p>
          رسوم مرتبة من الأسهل إلى الأكثر تطلبًا، ولكل وضعية شرح وخطوات وما
          يحتاجه الجسد. اختارا ما يناسبكما، واحفظا ما يعجبكما، واستبعدا ما لا
          تريدانه.
        </p>
        <p className="pos-consent">
          اتفقا على كلمة للتوقف قبل أن تبدآ، واجعلا المزلّق قريبًا. أي ألم يعني
          التوقف، لا المتابعة.
        </p>
      </section>

      <details className="filters wrap">
        <summary>
          التصفية
          {active > 0 && <span className="filter-count">{active}</span>}
        </summary>
        <div className="filter-body">
          <fieldset>
            <legend>الصعوبة</legend>
            {LEVELS.map((level) => (
              <label className="chip" key={level}>
                <input
                  type="radio"
                  name="difficulty"
                  checked={filters.maxDifficulty === level}
                  onChange={() => set({ maxDifficulty: level })}
                />
                {upTo(DIFFICULTY, level)}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>الجرأة</legend>
            {LEVELS.map((level) => (
              <label className="chip" key={level}>
                <input
                  type="radio"
                  name="intensity"
                  checked={filters.maxIntensity === level}
                  onChange={() => set({ maxIntensity: level })}
                />
                {upTo(INTENSITY, level)}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>تجنّبا ما يُجهد</legend>
            {CONSTRAINT_KEYS.map((c) => (
              <label className="chip" key={c}>
                <input
                  type="checkbox"
                  checked={filters.blockedConstraints.includes(c)}
                  onChange={() =>
                    set({
                      blockedConstraints: toggle(filters.blockedConstraints, c),
                    })
                  }
                />
                {CONSTRAINTS[c]}
              </label>
            ))}
          </fieldset>
          {topics.length > 0 && (
            <fieldset>
              <legend>تجنّبا ما يتضمن</legend>
              {topics.map((t) => (
                <label className="chip" key={t}>
                  <input
                    type="checkbox"
                    checked={filters.blockedTopics.includes(t)}
                    onChange={() =>
                      set({ blockedTopics: toggle(filters.blockedTopics, t) })
                    }
                  />
                  {TOPICS[t]}
                </label>
              ))}
            </fieldset>
          )}
          <fieldset>
            <legend>ما حفظتماه</legend>
            <label className="chip">
              <input
                type="checkbox"
                checked={filters.favoritesOnly}
                onChange={() => set({ favoritesOnly: !filters.favoritesOnly })}
              />
              المفضلة فقط
            </label>
            <label className="chip">
              <input
                type="checkbox"
                checked={filters.showExcluded}
                onChange={() => set({ showExcluded: !filters.showExcluded })}
              />
              إظهار المستبعدة
            </label>
          </fieldset>
          <button type="button" className="text-button" onClick={reset}>
            إعادة ضبط التصفية
          </button>
        </div>
      </details>

      <section className="wrap" aria-label="الوضعيات" aria-busy={!positions}>
        <p className="pos-count" aria-live="polite">
          {positions ? countLabel(shown.length) : "جارٍ تحميل الوضعيات…"}
        </p>
        {positions && shown.length === 0 && (
          <div className="pos-status">
            <p>
              {filters.favoritesOnly && favorites.length === 0
                ? "لم تحفظا وضعية في المفضلة بعد. افتحا وضعية واضغطا «المفضلة»."
                : "لا وضعية تناسب هذه التصفية. خففا بعض القيود لتظهر خيارات أكثر."}
            </p>
            <button type="button" className="button" onClick={reset}>
              إعادة ضبط التصفية
            </button>
          </div>
        )}
        <ul className="pos-grid">
          {shown.map((p, index) => {
            const isFavorite = favorites.includes(p.slug);
            const isExcluded = excluded.includes(p.slug);
            return (
              <li key={p.slug}>
                <Link
                  href={`/positions/${p.slug}`}
                  className={`pos-card${isExcluded ? " is-excluded" : ""}`}
                >
                  <span className="pos-name">{p.name}</span>
                  <span className="pos-meta">
                    <span>
                      <span className="sr-only">الصعوبة: </span>
                      {DIFFICULTY[p.difficulty]}
                    </span>
                    <span data-level={p.intensity}>
                      <span className="sr-only">الجرأة: </span>
                      {INTENSITY[p.intensity]}
                    </span>
                  </span>
                  {isFavorite && (
                    <span className="pos-flag">
                      <span aria-hidden="true">♥ </span>في المفضلة
                    </span>
                  )}
                  {isExcluded && <span className="pos-flag">مستبعدة</span>}
                  {/* After the text so the link reads its name first; CSS shows it on top. */}
                  <Image
                    src={p.image}
                    alt={p.imageAlt}
                    {...POSITION_IMAGE_SIZE}
                    sizes="(max-width: 720px) 50vw, (max-width: 1080px) 33vw, 25vw"
                    loading={index < 2 ? "eager" : "lazy"}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
