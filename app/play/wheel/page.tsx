"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pick, type Spin, seeded, wheelSegments } from "@/lib/play";
import {
  ActivityCard,
  Empty,
  focusOnMount,
  GameHead,
  kindLabel,
  Loading,
  useAllowed,
  useShared,
} from "../session";

const SPINS: { value: Spin; label: string }[] = [
  { value: "activity", label: "نشاطًا" },
  { value: "topic", label: "موضوعًا" },
  { value: "intensity", label: "درجة جرأة" },
];
const SPIN_MS = 4200;
const COLORS = ["#5a3346", "#2a1b24", "#7d4c5f", "#3b2530"];

/** Segments as conic stops, each closed by a thin gold rule. */
function paint(count: number) {
  const a = 360 / count;
  const stops = Array.from({ length: count }, (_, i) => {
    const end = (i + 1) * a;
    return `${COLORS[i % COLORS.length]} ${i * a}deg ${end - 0.7}deg, var(--gold) ${end - 0.7}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function WheelPage() {
  const cards = useAllowed("card");
  const challenges = useAllowed("challenge");
  // On two phones both wheels turn together and stop on the same result.
  const [wheel, setWheel] = useShared("wheel", {
    spin: "activity",
    seed: 0.5,
    turn: 0,
    result: null,
  });
  const { spin, seed, turn } = wheel;
  // The turn whose result shows; a new turn spins first, on whichever phone started it.
  const [landed, setLanded] = useState(turn);
  const spinning = turn !== landed;
  // Focus waits on the hub while the wheel turns, then moves to the result.
  const hub = useRef<HTMLButtonElement>(null);

  const pool = useMemo(
    () => (cards && challenges ? [...cards, ...challenges] : undefined),
    [cards, challenges],
  );
  const segments = useMemo(
    () => (pool ? wheelSegments(pool, spin, seeded(seed)) : []),
    [pool, spin, seed],
  );

  useEffect(() => {
    if (turn === landed) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => setLanded(turn), still ? 0 : SPIN_MS);
    return () => clearTimeout(id);
  }, [turn, landed]);

  if (!pool) return <Loading />;
  const result = spinning
    ? null
    : (pool.find((item) => item.slug === wheel.result) ?? null);

  function go() {
    if (!pool || spinning) return;
    hub.current?.focus();
    // Decide the landing now, from the same seeded segments the wheel will render.
    const nextSeed = Math.random();
    const next = wheelSegments(pool, spin, seeded(nextSeed));
    const index = Math.floor(Math.random() * next.length);
    const a = 360 / next.length;
    const land = 360 - (index + 0.5 + (Math.random() - 0.5) * 0.6) * a;
    const item = pick(next[index].items);
    setWheel({
      spin,
      seed: nextSeed,
      turn: turn - (turn % 360) + 5 * 360 + land,
      result: item.slug,
    });
  }

  const angle = 360 / segments.length;

  return (
    <>
      <GameHead title="عجلة الاختيار">
        دعا العجلة تختار عنكما نشاطًا، أو موضوعًا، أو درجة جرأة. لا تتوقف إلا عند
        ما يقبله كلاكما.
      </GameHead>
      {segments.length === 0 ? (
        <Empty />
      ) : (
        <section className="wrap wheel-game" aria-label="العجلة">
          <fieldset className="spin-kinds" disabled={spinning}>
            <legend>تختار العجلة</legend>
            {SPINS.map((s) => (
              <label className="chip" key={s.value}>
                <input
                  type="radio"
                  name="spin"
                  checked={spin === s.value}
                  onChange={() =>
                    setWheel({ ...wheel, spin: s.value, result: null })
                  }
                />
                {s.label}
              </label>
            ))}
          </fieldset>

          <div className="wheel-wrap">
            <span className="wheel-pointer" aria-hidden="true" />
            <div
              className="wheel"
              aria-hidden="true"
              style={{
                transform: `rotate(${turn}deg)`,
                background: paint(segments.length),
              }}
            >
              {segments.map((s, i) => {
                const middle = (i + 0.5) * angle;
                // Labels resting on the left half turn around, so none reads upside down once the wheel stops.
                const flip = (middle + turn) % 360 > 180;
                return (
                  <span
                    key={s.label}
                    className={`wheel-label${flip ? " is-flipped" : ""}`}
                    style={{
                      transform: `rotate(${middle + (flip ? 90 : -90)}deg)`,
                    }}
                  >
                    {s.label}
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              className="wheel-hub"
              ref={hub}
              onClick={go}
              aria-disabled={spinning}
            >
              أديرا
            </button>
          </div>
          <p className="sr-only">
            على العجلة: {segments.map((s) => s.label).join("، ")}
          </p>

          <div aria-live="polite">
            {spinning && <p className="sr-only">العجلة تدور…</p>}
            {/* What it stopped on was hidden since; the card goes, and says so. */}
            {!spinning && wheel.result && !result && (
              <p className="play-state" ref={focusOnMount} tabIndex={-1}>
                لم يعد ما توقفت عنده العجلة متاحًا. أديرا مجددًا.
              </p>
            )}
            {result && (
              <>
                <ActivityCard
                  key={turn}
                  item={result}
                  label={kindLabel(result)}
                  focus
                />
                <div className="play-actions">
                  <button type="button" className="button" onClick={go}>
                    أديرا مجددًا
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setWheel({ ...wheel, result: null });
                      hub.current?.focus();
                    }}
                  >
                    تخطَّيا
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}
