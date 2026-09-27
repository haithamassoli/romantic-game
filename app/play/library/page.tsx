"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { pick } from "@/lib/play";
import {
  INTENSITY,
  LEVELS,
  type Level,
  TOPIC_KEYS,
  TOPICS,
  type Topic,
} from "@/lib/tags";
import {
  type Activity,
  ActivityCard,
  Empty,
  focusOnMount,
  GameHead,
  kindLabel,
  Loading,
  minutesLabel,
  useAllowed,
  useShared,
} from "../session";

export default function LibraryPage() {
  const challenges = useAllowed("challenge");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  // Each phone browses on its own; a chosen challenge shows on both.
  const [{ chosen: slug }, setShared] = useShared("library", { chosen: null });
  const setChosen = (c: Activity | null) =>
    setShared({ chosen: c?.slug ?? null });

  if (!challenges) return <Loading />;
  const chosen = challenges.find((c) => c.slug === slug) ?? null;
  // The challenge on screen was hidden, or left the couple's limits, since it was chosen.
  const withdrawn = slug !== null && !chosen;

  // Only categories and levels that hold an allowed challenge are offered.
  const topics = TOPIC_KEYS.filter((t) =>
    challenges.some((c) => c.topics.includes(t)),
  );
  const levels = LEVELS.filter((l) =>
    challenges.some((c) => c.intensity === l),
  );
  const shown = challenges.filter(
    (c) =>
      (!topic || c.topics.includes(topic)) && (!level || c.intensity === level),
  );
  // Skipping prefers the current filter, then any other allowed challenge.
  const skip = () => {
    const rest = (list: Activity[]) =>
      list.filter((c) => c.slug !== chosen?.slug);
    const next = rest(shown).length > 0 ? rest(shown) : rest(challenges);
    setChosen(next.length > 0 ? pick(next) : null);
  };
  // Back in the list, focus returns to the challenge just seen, or to the count above the list.
  const back = () => {
    const slug = chosen?.slug;
    flushSync(() => setChosen(null));
    (
      document.querySelector<HTMLElement>(`[data-slug="${slug}"]`) ??
      document.querySelector<HTMLElement>(".library .pos-count")
    )?.focus();
  };

  return (
    <>
      <GameHead title="مكتبة التحديات">
        تحديات تنفذانها بعيدًا عن الشاشة. تصفحا حسب الموضوع أو الجرأة، واختارا
        واحدًا، وشغّلا المؤقت إن أردتما.
      </GameHead>
      {challenges.length === 0 ? (
        <Empty />
      ) : chosen ? (
        <section className="wrap library" aria-label="التحدي المختار">
          <ActivityCard
            key={chosen.slug}
            item={chosen}
            label={kindLabel(chosen)}
            focus
          />
          <div className="play-actions">
            <button type="button" className="button" onClick={skip}>
              تخطَّيا، تحدٍّ آخر
            </button>
            <button type="button" className="ghost-button" onClick={back}>
              العودة إلى المكتبة
            </button>
          </div>
        </section>
      ) : (
        <section className="wrap library" aria-label="التحديات">
          {withdrawn && (
            <p className="play-state" ref={focusOnMount} tabIndex={-1}>
              لم يعد التحدي الذي كان أمامكما متاحًا، فعدتما إلى المكتبة. اختارا
              غيره.
            </p>
          )}
          <fieldset className="lib-filter">
            <legend>الموضوع</legend>
            <label className="chip">
              <input
                type="radio"
                name="topic"
                checked={topic === null}
                onChange={() => setTopic(null)}
              />
              الكل
            </label>
            {topics.map((t) => (
              <label className="chip" key={t}>
                <input
                  type="radio"
                  name="topic"
                  checked={topic === t}
                  onChange={() => setTopic(t)}
                />
                {TOPICS[t]}
              </label>
            ))}
          </fieldset>
          <fieldset className="lib-filter">
            <legend>الجرأة</legend>
            <label className="chip">
              <input
                type="radio"
                name="level"
                checked={level === null}
                onChange={() => setLevel(null)}
              />
              الكل
            </label>
            {levels.map((l) => (
              <label className="chip" key={l}>
                <input
                  type="radio"
                  name="level"
                  checked={level === l}
                  onChange={() => setLevel(l)}
                />
                {INTENSITY[l]}
              </label>
            ))}
          </fieldset>

          <div className="lib-bar">
            <p className="pos-count" aria-live="polite" tabIndex={-1}>
              {shown.length === 0
                ? "لا تحدي بهذا الاختيار؛ جرّبا موضوعًا أو درجة أخرى."
                : `${shown.length} من ${challenges.length}`}
            </p>
            {shown.length > 0 && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => setChosen(pick(shown))}
              >
                تحدٍّ عشوائي
              </button>
            )}
          </div>

          <ul className="lib-list">
            {shown.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  className="lib-item"
                  data-slug={c.slug}
                  onClick={() => setChosen(c)}
                >
                  <strong>{c.title}</strong>
                  <small>{c.body}</small>
                  <span className="act-meta">
                    <span data-level={c.intensity}>
                      <span className="sr-only">الجرأة: </span>
                      {INTENSITY[c.intensity]}
                    </span>
                    {c.minutes && <span>{minutesLabel(c.minutes)}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
