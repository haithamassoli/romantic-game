"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { nightPath, PATH_MINUTES, pathAt, remember } from "@/lib/play";
import { INTENSITY, LEVELS, type Level } from "@/lib/tags";
import { readList, store, useStored } from "../../providers";
import {
  ActivityCard,
  Empty,
  focusOnMount,
  GameHead,
  Loading,
  minutesLabel,
  useAllowed,
  useShared,
} from "../session";

const CEILINGS: Record<Level, string> = {
  1: "هادئ فقط",
  2: "حتى الدافئ",
  3: "حتى الجريء",
};

export default function PathPage() {
  const cards = useAllowed("card");
  const challenges = useAllowed("challenge");
  // Finished steps from earlier nights: content slugs only, never a pick or a limit.
  const finished = readList(useStored("path"));
  const [minutes, setMinutes] = useState<number>(30);
  const [ceiling, setCeiling] = useState<Level | null>(null);
  // On two phones both follow the same steps, and either can finish, skip or stop one.
  const [run, setRun] = useShared("path", {
    steps: null,
    marks: [],
    stopped: false,
  });
  const { marks, stopped } = run;

  const pool = useMemo(
    () => (cards && challenges ? [...cards, ...challenges] : undefined),
    [cards, challenges],
  );
  if (!pool) return <Loading />;

  // A step hidden since the path was drawn is passed over, never shown.
  const drawn = run.steps && pathAt(run.steps, pool, marks.length);
  const path = drawn?.steps.filter((s) => s !== undefined) ?? null;
  // The ceiling goes only as high as something both partners accept.
  const top = Math.max(0, ...pool.map((i) => i.intensity));
  const levels = LEVELS.filter((l) => l <= top);
  const upTo = Math.min(ceiling ?? top, top);
  const at = drawn?.at ?? -1;
  const step = drawn?.steps[at];
  // Marks follow the drawn slugs, so withdrawn steps passed over count as skipped.
  const mark = (m: "done" | "skipped") =>
    setRun({
      ...run,
      marks: [
        ...marks,
        ...Array.from({ length: at - marks.length }, () => "skipped" as const),
        m,
      ],
    });

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
            setRun({
              steps: nightPath(pool, minutes, upTo, finished).map(
                (s) => s.slug,
              ),
              marks: [],
              stopped: false,
            });
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
    // Only a finished last step completes the path; a skipped one just ends it.
    const completed = marks.at(-1) === "done";
    return (
      <>
        {head}
        <section className="wrap play-empty">
          <h2 ref={focusOnMount} tabIndex={-1}>
            {stopped
              ? "توقّف المسار"
              : completed
                ? "اكتمل المسار"
                : "انتهت خطوات المسار"}
          </h2>
          <p>
            {stopped
              ? "توقفتما، وهذا جواب محترم تمامًا. لا شيء يُحتسب هنا ولا شيء يضيع."
              : completed
                ? "وصلتما إلى آخر خطوة. ما بعدها لكما وحدكما."
                : "تخطّيتما الخطوة الأخيرة، وهذا جواب محترم تمامًا. ما بعدها لكما وحدكما."}{" "}
            يتذكر هذا الجهاز الخطوات التي أنهيتماها فقط، كي لا تتكرر في ليلة
            قادمة.
          </p>
          <div className="play-actions">
            <button
              type="button"
              className="button"
              onClick={() => {
                flushSync(() =>
                  setRun({ steps: null, marks: [], stopped: false }),
                );
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

  const last = step === path.at(-1);
  return (
    <>
      {head}
      <section className="wrap path" aria-label="المسار">
        <ActivityCard
          key={at}
          item={step}
          label={`الخطوة ${path.indexOf(step) + 1} من ${path.length}`}
          focus
        />
        <div className="play-actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              store("path", remember(finished, step.slug));
              mark("done");
            }}
          >
            {last ? "تمّت، أنهينا المسار" : "تمّت، إلى التالية"}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => mark("skipped")}
          >
            تخطَّيا هذه الخطوة
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setRun({ ...run, stopped: true })}
          >
            أوقفا المسار
          </button>
        </div>
        <ol className="path-steps" aria-label="خطوات المسار">
          {drawn?.steps.map(
            (s, i) =>
              s && (
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
              ),
          )}
        </ol>
      </section>
    </>
  );
}
