"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { nightPath, PATH_MINUTES, remember } from "@/lib/play";
import { INTENSITY, LEVELS, type Level } from "@/lib/tags";
import { readList, store, useStored } from "../../providers";
import {
  type Activity,
  ActivityCard,
  Empty,
  focusOnMount,
  GameHead,
  Loading,
  minutesLabel,
  useAllowed,
  useSession,
} from "../session";

const CEILINGS: Record<Level, string> = {
  1: "هادئ فقط",
  2: "حتى الدافئ",
  3: "حتى الجريء",
};

type Mark = "done" | "skipped";

export default function PathPage() {
  const { limits } = useSession();
  const cards = useAllowed("card");
  const challenges = useAllowed("challenge");
  // Finished steps from earlier nights: content slugs only, never a pick or a limit.
  const finished = readList(useStored("path"));
  const [minutes, setMinutes] = useState<number>(30);
  const [ceiling, setCeiling] = useState<Level | null>(null);
  const [path, setPath] = useState<Activity[] | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [stopped, setStopped] = useState(false);

  const pool = useMemo(
    () => (cards && challenges ? [...cards, ...challenges] : undefined),
    [cards, challenges],
  );
  if (!pool || !limits) return <Loading />;

  // The ceiling can only go as high as both partners accept.
  const levels = LEVELS.filter((l) => l <= limits.maxIntensity);
  const upTo = Math.min(ceiling ?? limits.maxIntensity, limits.maxIntensity);
  const at = marks.length;
  const step = path?.[at];

  const head = (
    <GameHead title="مسار الليلة">
      اختارا المدة وأقصى جرأة، فنرسم لكما خطوات تبدأ هادئة وتشتدّ شيئًا فشيئًا.
      تخطَّيا ما لا يعجبكما، وأوقفا المسار متى شئتما.
    </GameHead>
  );

  if (pool.length === 0) {
    return (
      <>
        {head}
        <Empty />
      </>
    );
  }

  if (!path || path.length === 0) {
    return (
      <>
        {head}
        <form
          className="wrap path-setup"
          onSubmit={(event) => {
            event.preventDefault();
            setPath(nightPath(pool, minutes, upTo, finished));
            setMarks([]);
            setStopped(false);
          }}
        >
          <fieldset className="lib-filter">
            <legend>المدة</legend>
            {PATH_MINUTES.map((m) => (
              <label className="chip" key={m}>
                <input
                  type="radio"
                  name="minutes"
                  checked={minutes === m}
                  onChange={() => setMinutes(m)}
                />
                {minutesLabel(m)}
              </label>
            ))}
          </fieldset>
          <fieldset className="lib-filter">
            <legend>أقصى جرأة</legend>
            {levels.map((l) => (
              <label className="chip" key={l}>
                <input
                  type="radio"
                  name="ceiling"
                  checked={upTo === l}
                  onChange={() => setCeiling(l)}
                />
                {CEILINGS[l]}
              </label>
            ))}
          </fieldset>
          <p className="play-state" role="status">
            {path
              ? "لا خطوات تناسب هذا الاختيار. جرّبا مدة أطول أو جرأة أعلى."
              : ""}
          </p>
          <button type="submit" className="button">
            ارسما المسار
          </button>
          {finished.length > 0 && (
            <p className="path-note">
              يتجنب المسار ما أنهيتماه في ليالٍ سابقة، ما دام غيره يكفي.
            </p>
          )}
        </form>
      </>
    );
  }

  if (stopped || !step) {
    return (
      <>
        {head}
        <section className="wrap play-empty">
          <h2 ref={focusOnMount} tabIndex={-1}>
            {stopped ? "توقّف المسار" : "اكتمل المسار"}
          </h2>
          <p>
            {stopped
              ? "توقفتما، وهذا جواب محترم تمامًا. لا شيء يُحتسب هنا ولا شيء يضيع."
              : "وصلتما إلى آخر خطوة. ما بعدها لكما وحدكما."}{" "}
            يتذكر هذا الجهاز الخطوات التي أنهيتماها فقط، كي لا تتكرر في ليلة
            قادمة.
          </p>
          <div className="play-actions">
            <button
              type="button"
              className="button"
              onClick={() => {
                flushSync(() => setPath(null));
                document
                  .querySelector<HTMLElement>(".path-setup :checked")
                  ?.focus();
              }}
            >
              مسار جديد
            </button>
            <Link className="ghost-button" href="/play">
              لعبة أخرى
            </Link>
          </div>
        </section>
      </>
    );
  }

  const last = at === path.length - 1;
  return (
    <>
      {head}
      <section className="wrap path" aria-label="المسار">
        <ActivityCard
          key={at}
          item={step}
          label={`الخطوة ${at + 1} من ${path.length}`}
          focus
        />
        <div className="play-actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              store("path", remember(finished, step.slug));
              setMarks([...marks, "done"]);
            }}
          >
            {last ? "تمّت، أنهينا المسار" : "تمّت، إلى التالية"}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setMarks([...marks, "skipped"])}
          >
            تخطَّيا هذه الخطوة
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setStopped(true)}
          >
            أوقفا المسار
          </button>
        </div>
        <ol className="path-steps" aria-label="خطوات المسار">
          {path.map((s, i) => (
            <li
              key={s.slug}
              data-level={s.intensity}
              data-state={marks[i] ?? (i === at ? "now" : "next")}
              aria-current={i === at ? "step" : undefined}
            >
              <strong>{s.title}</strong>
              <small>
                {INTENSITY[s.intensity]}
                {marks[i] === "done" && "، تمّت"}
                {marks[i] === "skipped" && "، تخطّيتماها"}
              </small>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
