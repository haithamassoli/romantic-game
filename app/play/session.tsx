"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { allowedFor } from "@/lib/play";
import {
  CONSTRAINT_KEYS,
  CONSTRAINTS,
  combineLimits,
  INTENSITY,
  LEVELS,
  type Limits,
  TOPIC_KEYS,
  TOPICS,
} from "@/lib/tags";
import { useStored } from "../providers";

export type Activity = Doc<"activities">;

type SessionValue = {
  limits: Limits | null;
  setLimits: (limits: Limits | null) => void;
  end: () => void;
  ended: boolean;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const session = use(SessionContext);
  if (!session) throw new Error("useSession needs <Session>");
  return session;
}

/**
 * The couple's combined limits, held in React memory only: never localStorage,
 * the URL, or Convex. Closing the tab, reloading, or ending the session forgets them.
 */
export function Session({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [limits, setLimits] = useState<Limits | null>(null);
  const [ended, setEnded] = useState<"no" | "leaving" | "yes">("no");
  // Forget the limits once back on the hub, so the boundaries screen never flashes on the way out.
  if (ended === "leaving" && pathname === "/play") {
    setEnded("yes");
    setLimits(null);
  }
  const value: SessionValue = {
    limits,
    setLimits: (next) => {
      setLimits(next);
      setEnded("no");
    },
    end: () => {
      setEnded("leaving");
      router.push("/play");
    },
    ended: ended === "yes",
  };
  return <SessionContext value={value}>{children}</SessionContext>;
}

/** Games ask for both partners' boundaries first; the hub doesn't. */
export function NeedsLimits({ children }: { children: React.ReactNode }) {
  const { limits } = useSession();
  return usePathname() === "/play" || limits ? children : <Boundaries />;
}

export function EndSession() {
  const { limits, end } = useSession();
  if (usePathname() === "/play" && !limits) return null;
  return (
    <button type="button" className="end-session" onClick={end}>
      إنهاء الجلسة
    </button>
  );
}

/** The one filter: published activities both partners accept; undefined while loading. */
export function useAllowed(kind: "card" | "challenge") {
  const { limits } = useSession();
  const items = useQuery(api.activities.list, { kind });
  return useMemo(
    () => (items && limits ? allowedFor(items, limits) : undefined),
    [items, limits],
  );
}

// Stable, so it runs once per mounted step rather than on every render.
const focusOnMount = (el: HTMLElement | null) => el?.focus();
const focusInPlace = (el: HTMLElement | null) =>
  el?.focus({ preventScroll: true });
const revealOnMount = (el: HTMLElement | null) =>
  el?.scrollIntoView({ block: "nearest" });

type Step = "intro" | "first" | "handoff" | "second";

function Boundaries() {
  const { setLimits } = useSession();
  const [step, setStep] = useState<Step>("intro");
  // Partner one's answers wait here, unrendered, until partner two is done.
  const first = useRef<Limits | null>(null);

  if (step === "intro") {
    return (
      <section className="wrap bounds" key={step}>
        <span className="bounds-glyph" aria-hidden="true">
          ✳
        </span>
        <h1 ref={focusOnMount} tabIndex={-1}>
          قبل أن تلعبا
        </h1>
        <p>
          يحدد كلٌّ منكما حدوده وحده، ثم يسلّم الهاتف للآخر. لن يرى أحدكما إجابات
          الآخر، ولن تظهر في اللعبة إلا الأنشطة التي يقبلها كلاكما.
        </p>
        <p className="bounds-note">
          لا تُحفظ الإجابات على الجهاز ولا تُرسل إلى أي مكان، وتُمحى بإنهاء الجلسة
          أو إغلاق الصفحة.
        </p>
        <p>ليحمل أحدكما الهاتف، وليُشِح الآخر بنظره.</p>
        <button
          type="button"
          className="button"
          onClick={() => setStep("first")}
        >
          أنا الطرف الأول، أبدأ
        </button>
      </section>
    );
  }
  if (step === "handoff") {
    return (
      <section className="wrap bounds bounds-handoff" key={step}>
        <span className="bounds-glyph" aria-hidden="true">
          ✳
        </span>
        <h1 ref={focusOnMount} tabIndex={-1}>
          أعطِ الهاتف لشريكك
        </h1>
        <p>أُخفيت إجاباتك، ولن تظهر مرة أخرى.</p>
        <button
          type="button"
          className="button"
          onClick={() => setStep("second")}
        >
          أنا الطرف الثاني، أبدأ
        </button>
      </section>
    );
  }
  return (
    <LimitsForm
      key={step}
      who={step === "first" ? "الطرف الأول" : "الطرف الثاني"}
      done={step === "first" ? "انتهيت، أخفِ إجاباتي" : "انتهيت، لنبدأ"}
      onDone={(mine) => {
        if (step === "first") {
          first.current = mine;
          setStep("handoff");
        } else {
          setLimits(combineLimits(first.current ?? mine, mine));
          first.current = null;
          window.scrollTo(0, 0);
        }
      }}
    />
  );
}

const LEVEL_HINTS = {
  1: "حديث وقبلات ولمسات فوق الملابس",
  2: "إثارة وتدليك وتعرٍّ",
  3: "جنس صريح بكل أشكاله",
} as const;

function toggle<T>(list: T[], value: T) {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function LimitsForm({
  who,
  done,
  onDone,
}: {
  who: string;
  done: string;
  onDone: (limits: Limits) => void;
}) {
  // Starts at the calmest level: going bolder is always an explicit choice.
  const [mine, setMine] = useState<Limits>({
    maxIntensity: 1,
    blockedTopics: [],
    blockedConstraints: [],
  });
  return (
    <form
      className="wrap bounds bounds-form"
      onSubmit={(event) => {
        event.preventDefault();
        onDone(mine);
      }}
    >
      <span className="bounds-who">{who}</span>
      <h1 ref={focusOnMount} tabIndex={-1}>
        حدودك الليلة
      </h1>
      <p>لا يراها شريكك. اختر بصدق، فلا يظهر إلا ما يقبله كلاكما.</p>

      <fieldset>
        <legend>أقبل جرأةً حتى</legend>
        {LEVELS.map((level) => (
          <label className="level-option" key={level}>
            <input
              type="radio"
              name="intensity"
              checked={mine.maxIntensity === level}
              onChange={() => setMine({ ...mine, maxIntensity: level })}
            />
            <span>
              <strong>{INTENSITY[level]}</strong>
              <small>{LEVEL_HINTS[level]}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>لا أريد الليلة</legend>
        {TOPIC_KEYS.map((t) => (
          <label className="chip" key={t}>
            <input
              type="checkbox"
              checked={mine.blockedTopics.includes(t)}
              onChange={() =>
                setMine({
                  ...mine,
                  blockedTopics: toggle(mine.blockedTopics, t),
                })
              }
            />
            {TOPICS[t]}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>أتجنّب ما يُجهد</legend>
        {CONSTRAINT_KEYS.map((c) => (
          <label className="chip" key={c}>
            <input
              type="checkbox"
              checked={mine.blockedConstraints.includes(c)}
              onChange={() =>
                setMine({
                  ...mine,
                  blockedConstraints: toggle(mine.blockedConstraints, c),
                })
              }
            />
            {CONSTRAINTS[c]}
          </label>
        ))}
      </fieldset>

      <button type="submit" className="button">
        {done}
      </button>
    </form>
  );
}

export function GameHead({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <header className="wrap play-head">
      <Link className="back-link" href="/play">
        <span aria-hidden="true">→</span> كل الألعاب
      </Link>
      <h1 ref={focusInPlace} tabIndex={-1}>
        {title}
      </h1>
      <p>{children}</p>
    </header>
  );
}

export function Loading() {
  return (
    <p className="wrap play-status" aria-busy="true">
      جارٍ تحضير اللعبة…
    </p>
  );
}

/** Nothing both partners accept is left. Never says who excluded what. */
export function Empty() {
  const { setLimits, end } = useSession();
  return (
    <section className="wrap play-empty" ref={revealOnMount}>
      <h2>لا شيء هنا يناسبكما معًا الليلة</h2>
      <p>
        حدودكما معًا لا تترك في هذه اللعبة نشاطًا يقبله كلاكما، وهذا جواب محترم
        تمامًا. جرّبا لعبة أخرى، أو أعيدا تحديد الحدود إن تغيّر المزاج.
      </p>
      <div className="play-actions">
        <Link className="button" href="/play">
          لعبة أخرى
        </Link>
        <button
          type="button"
          className="ghost-button"
          onClick={() => setLimits(null)}
        >
          أعيدا تحديد الحدود
        </button>
        <button type="button" className="ghost-button" onClick={end}>
          إنهاء الجلسة
        </button>
      </div>
    </section>
  );
}

export function kindLabel(item: Activity) {
  if (item.kind === "challenge") return "تحدٍّ واقعي";
  return item.topics.includes("talk") ? "سؤال" : "تحدٍّ";
}

export function minutesLabel(n: number) {
  if (n === 1) return "دقيقة واحدة";
  if (n === 2) return "دقيقتان";
  if (n <= 10) return `${n} دقائق`;
  return `${n} دقيقة`;
}

/** A real-world action: what to do, how bold it is, and an optional timer. */
export function ActivityCard({
  item,
  label,
}: {
  item: Activity;
  label: string;
}) {
  const timer = useStored("timer") !== "off";
  return (
    <article className="act-card" ref={revealOnMount}>
      <span className="act-kind">{label}</span>
      <h2>{item.title}</h2>
      <p>{item.body}</p>
      <p className="act-meta">
        <span data-level={item.intensity}>
          <span className="sr-only">الجرأة: </span>
          {INTENSITY[item.intensity]}
        </span>
        {item.minutes && <span>{minutesLabel(item.minutes)}</span>}
      </p>
      {item.minutes && timer && <Timer minutes={item.minutes} />}
    </article>
  );
}

function clock(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Counts down from an end time, so a locked phone doesn't slow it down. */
function Timer({ minutes }: { minutes: number }) {
  const full = minutes * 60_000;
  const [left, setLeft] = useState(full);
  const [endsAt, setEndsAt] = useState<number | null>(null);

  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => {
      const rest = Math.max(0, endsAt - Date.now());
      setLeft(rest);
      if (rest === 0) {
        setEndsAt(null);
        navigator.vibrate?.(300);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const running = endsAt !== null;
  const idle = !running && left === full;
  return (
    <div className="timer">
      {!idle && (
        <>
          <p className="timer-time" role="timer" aria-live="off">
            {clock(left)}
          </p>
          <div className="timer-bar" aria-hidden="true">
            <span style={{ width: `${(left / full) * 100}%` }} />
          </div>
          <p className="timer-done" aria-live="polite">
            {left === 0 ? "انتهى الوقت. تابعا إن أردتما، فالوقت لكما." : ""}
          </p>
        </>
      )}
      <div className="timer-actions">
        {/* One main button that changes role, so keyboard focus stays on it. */}
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            if (running) {
              setLeft(Math.max(0, endsAt - Date.now()));
              setEndsAt(null);
            } else if (left === 0) setLeft(full);
            else setEndsAt(Date.now() + left);
          }}
        >
          {running
            ? "إيقاف مؤقت"
            : left === 0
              ? "إعادة المؤقت"
              : idle
                ? "ابدآ المؤقت"
                : "متابعة"}
        </button>
        {!idle && left > 0 && (
          <button
            type="button"
            className="ghost-button"
            onClick={(event) => {
              setEndsAt(null);
              setLeft(full);
              // This button leaves with the reset; hand focus to the main one.
              (
                event.currentTarget.previousElementSibling as HTMLElement
              ).focus();
            }}
          >
            إيقاف
          </button>
        )}
      </div>
    </div>
  );
}
