"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
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
import { HEARTBEAT_MS, PAIR_KEY } from "@/lib/pair";
import { allowedFor, match } from "@/lib/play";
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
/** What this phone may see of a two-phone session (lib/pair.ts decides). */
export type View = NonNullable<FunctionReturnType<typeof api.sessions.view>>;

type SessionValue = {
  limits: Limits | null;
  setLimits: (limits: Limits | null) => void;
  end: () => void;
  /** Which session just ended, once back on the hub. */
  ended: "one" | "two" | null;
  leaving: boolean;
  /** Two phones: this phone's player key and its view, undefined while loading. */
  pair: { key: string; view: View | undefined } | null;
  pairUp: (key: string) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const session = use(SessionContext);
  if (!session) throw new Error("useSession needs <Session>");
  return session;
}

/**
 * One device: the couple's combined limits, held in React memory only: never
 * localStorage, the URL, or Convex. Closing the tab, reloading, or ending the
 * session forgets them. Two phones: only this phone's player key is kept here;
 * each partner's limits and picks live in the session on the server, never
 * sent to the other phone, and are deleted with it.
 */
export function Session({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [limits, setLimits] = useState<Limits | null>(null);
  const [ended, setEnded] = useState<{ two: boolean; back: boolean } | null>(
    null,
  );
  // The key sits in localStorage, so a reload, a dropped connection, or a
  // closed tab rejoins; the session itself still dies after a day idle.
  const [key, setKey] = useState(
    () => globalThis.localStorage?.getItem(PAIR_KEY) ?? null,
  );
  const view = useQuery(api.sessions.view, key ? { key } : "skip");
  const endPair = useMutation(api.sessions.end);
  const setPairLimits = useMutation(api.sessions.setLimits);
  const heartbeat = useMutation(api.sessions.heartbeat);

  // Forget the limits once back on the hub, so the boundaries screen never flashes on the way out.
  if (ended && !ended.back && pathname === "/play") {
    setEnded({ ...ended, back: true });
    setLimits(null);
  }

  // Ended on the other phone, or deleted after a day idle: back to the hub.
  useEffect(() => {
    if (!key || view !== null) return;
    localStorage.removeItem(PAIR_KEY);
    setKey(null);
    setEnded({ two: true, back: false });
    router.push("/play");
  }, [key, view, router]);

  // Presence: a beat now, on every page change, on return to the tab, and every few seconds.
  useEffect(() => {
    if (!key) return;
    const beat = () => {
      if (document.visibilityState === "visible") {
        void heartbeat({ key, page: pathname });
      }
    };
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [key, pathname, heartbeat]);

  const value: SessionValue = {
    limits,
    setLimits: (next) => {
      if (key) void setPairLimits({ key, limits: next });
      else setLimits(next);
      setEnded(null);
    },
    end: () => {
      if (key) {
        void endPair({ key });
        localStorage.removeItem(PAIR_KEY);
        setKey(null);
      }
      setEnded({ two: Boolean(key), back: false });
      router.push("/play");
    },
    ended: ended?.back ? (ended.two ? "two" : "one") : null,
    leaving: Boolean(ended && !ended.back),
    pair: key ? { key, view: view ?? undefined } : null,
    pairUp: (next) => {
      localStorage.setItem(PAIR_KEY, next);
      setKey(next);
      setLimits(null);
      setEnded(null);
    },
  };
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function EndSession() {
  const { limits, end, pair } = useSession();
  if (usePathname() === "/play" && !limits && !pair) return null;
  return (
    <button type="button" className="end-session" onClick={end}>
      إنهاء الجلسة
    </button>
  );
}

/**
 * The one filter: published activities both partners accept; undefined while
 * loading. On two phones the server applies it and sends only what passes.
 */
export function useAllowed(kind: Activity["kind"]) {
  const { limits, pair } = useSession();
  const items = useQuery(api.activities.list, pair ? "skip" : { kind });
  const shared = useQuery(
    api.sessions.pool,
    pair ? { key: pair.key, kind } : "skip",
  );
  return useMemo(
    () => shared ?? (items && limits ? allowedFor(items, limits) : undefined),
    [shared, items, limits],
  );
}

/** Published positions both partners accept, the same way. */
export function useAllowedPositions() {
  const { limits, pair } = useSession();
  const items = useQuery(api.positions.list, pair ? "skip" : {});
  const shared = useQuery(
    api.sessions.positions,
    pair ? { key: pair.key } : "skip",
  );
  return useMemo(
    () => shared ?? (items && limits ? allowedFor(items, limits) : undefined),
    [shared, items, limits],
  );
}

type Games = Pick<View, "cards" | "wheel" | "library" | "path">;
type Shared = { [G in keyof Games]?: NonNullable<Games[G]> };

/**
 * A game's state: React state on one device; on two phones the session's, so
 * both show the same card, spin, challenge or step, and either can move it on.
 */
export function useShared<G extends keyof Games>(
  game: G,
  initial: NonNullable<Games[G]>,
): [NonNullable<Games[G]>, (next: NonNullable<Games[G]>) => void] {
  const { pair } = useSession();
  const [local, setLocal] = useState(initial);
  // Shown at once on this phone; the server confirms or rolls it back.
  const play = useMutation(api.sessions.play).withOptimisticUpdate(
    (store, { key, ...games }) => {
      const view = store.getQuery(api.sessions.view, { key });
      if (view)
        store.setQuery(api.sessions.view, { key }, { ...view, ...games });
    },
  );
  if (!pair) return [local, setLocal];
  return [
    pair.view?.[game] ?? initial,
    (next) => void play({ key: pair.key, ...({ [game]: next } as Shared) }),
  ];
}

// Stable, so it runs once per mounted step rather than on every render.
export const focusOnMount = (el: HTMLElement | null) => el?.focus();
const focusInPlace = (el: HTMLElement | null) =>
  el?.focus({ preventScroll: true });
const revealOnMount = (el: HTMLElement | null) =>
  el?.scrollIntoView({ block: "nearest" });
// Runs after its children's refs, so the verdict above revealed cards shows first.
const topOnMount = (el: HTMLElement | null) => {
  if (el) window.scrollTo(0, 0);
};

type Step = "intro" | "first" | "handoff" | "second";

export function Boundaries() {
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
      <HandOff onReady={() => setStep("second")}>
        أُخفيت إجاباتك، ولن تظهر مرة أخرى.
      </HandOff>
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

/** A pause while the other partner takes their turn. */
export function Waiting({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="wrap bounds bounds-handoff">
      <span className="bounds-glyph" aria-hidden="true">
        ✳
      </span>
      <h1 ref={focusOnMount} tabIndex={-1}>
        {title}
      </h1>
      {children}
    </section>
  );
}

/** Partner one is done: nothing of theirs is left on screen for partner two. */
function HandOff({
  onReady,
  children,
}: {
  onReady: () => void;
  children: React.ReactNode;
}) {
  return (
    <Waiting title="أعطِ الهاتف لشريكك">
      <p>{children}</p>
      <button type="button" className="button" onClick={onReady}>
        أنا الطرف الثاني، أبدأ
      </button>
    </Waiting>
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

export function LimitsForm({
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

type PickStep = "intro" | "first" | "handoff" | "second" | "reveal";

/**
 * Desire match and position discovery: each partner picks alone, and only what
 * both picked is ever rendered. On one device they pick in turn; partner one's
 * picks wait unrendered in a ref, and both lists are dropped the moment the
 * overlap is known. On two phones each picks at once on their own phone; the
 * server holds the lists until both are in, then keeps only the overlap.
 */
export function SecretPicks<T extends { slug: string }>({
  game,
  title,
  intro,
  pool,
  ask,
  hint,
  option,
  grid = false,
  reveal,
}: {
  game: "desires" | "discover";
  title: string;
  intro: string;
  pool: T[];
  ask: string;
  hint: string;
  option: (item: T) => React.ReactNode;
  grid?: boolean;
  reveal: (matches: T[]) => React.ReactNode;
}) {
  const { pair } = useSession();
  const [step, setStep] = useState<PickStep>("intro");
  const first = useRef<string[]>([]);
  const [matches, setMatches] = useState<T[]>([]);
  const send = useMutation(api.sessions.pick).withOptimisticUpdate(
    (store, { key, game, picks }) => {
      const view = store.getQuery(api.sessions.view, { key });
      if (!view) return;
      const round = picks
        ? { ...view[game], me: true }
        : { me: false, partner: false, matches: null };
      store.setQuery(
        api.sessions.view,
        { key },
        game === "desires"
          ? { ...view, desires: round }
          : { ...view, discover: round },
      );
    },
  );
  // On two phones the session's round decides the stage.
  const round = pair?.view?.[game];
  const stage: PickStep = !round
    ? step
    : round.matches
      ? "reveal"
      : round.me
        ? "handoff"
        : step === "first"
          ? "first"
          : "intro";
  const shown = round?.matches
    ? pool.filter((item) => round.matches?.includes(item.slug))
    : matches;

  if (stage === "handoff") {
    return pair ? (
      <Waiting title="بانتظار شريكك">
        <p>
          وصلت اختياراتك مخفية. حين ينهي شريكك اختياره على هاتفه، يظهر لكما ما
          اختاره كلاكما فقط.
        </p>
        {/* Nav is hidden on phones: without this, only ending the session leaves. */}
        <Link className="ghost-button" href="/play">
          لعبة أخرى
        </Link>
      </Waiting>
    ) : (
      <HandOff onReady={() => setStep("second")}>
        أُخفيت اختياراتك. لن يظهر منها إلا ما يختاره شريكك أيضًا.
      </HandOff>
    );
  }
  if (stage === "first" || stage === "second") {
    return (
      <PickForm
        key={stage}
        who={
          pair
            ? "على هاتفك"
            : stage === "first"
              ? "الطرف الأول"
              : "الطرف الثاني"
        }
        ask={ask}
        hint={hint}
        pool={pool}
        option={option}
        grid={grid}
        done={
          pair
            ? "انتهيت، أرسل اختياراتي سرًّا"
            : stage === "first"
              ? "انتهيت، أخفِ اختياراتي"
              : "انتهيت، لنرَ ما يجمعنا"
        }
        onDone={(mine) => {
          window.scrollTo(0, 0);
          if (pair) {
            setStep("intro");
            void send({ key: pair.key, game, picks: mine });
          } else if (stage === "first") {
            first.current = mine;
            setStep("handoff");
          } else {
            setMatches(match(pool, first.current, mine));
            first.current = [];
            setStep("reveal");
          }
        }}
      />
    );
  }
  const again = (
    <div className="play-actions">
      <button
        type="button"
        className="button"
        onClick={() => {
          setMatches([]);
          setStep("first");
          if (pair) void send({ key: pair.key, game, picks: null });
        }}
      >
        {pair ? "جولة جديدة" : "جولة جديدة، يبدأ الطرف الأول"}
      </button>
      <Link className="ghost-button" href="/play">
        لعبة أخرى
      </Link>
    </div>
  );
  if (stage === "reveal") {
    const none = shown.length === 0;
    return (
      <>
        <GameHead title={none ? "لا توافق هذه المرة" : "هنا تلتقيان"}>
          {none
            ? "لم تلتقِ اختياراتكما عند شيء في هذه الجولة، ولن يعرف أحدكما ما اختاره الآخر. جرّبا جولة أخرى، أو لعبة مختلفة."
            : "هذا ما اختاره كلاكما، ولا شيء غيره. ما اختاره أحدكما وحده بقي سرًّا، ومُحي الآن."}
        </GameHead>
        <section className="wrap matches" aria-label="النتيجة" ref={topOnMount}>
          {!none && reveal(shown)}
          {again}
        </section>
      </>
    );
  }
  return (
    <>
      <GameHead title={title}>{intro}</GameHead>
      {pool.length === 0 ? (
        <Empty />
      ) : (
        <section className="wrap picks-start">
          <p>
            {pair
              ? "يختار كلٌّ منكما على هاتفه في الوقت نفسه، ولا يرى أحدكما اختيارات الآخر."
              : "ليحمل أحدكما الهاتف وليُشِح الآخر بنظره. حين ينتهي الأول يسلّمه للثاني."}
          </p>
          {round?.partner && (
            <p className="play-state">أنهى شريكك اختياره، والدور لك.</p>
          )}
          <button
            type="button"
            className="button"
            onClick={() => setStep("first")}
          >
            {pair ? "أبدأ الاختيار" : "أنا الطرف الأول، أختار"}
          </button>
        </section>
      )}
    </>
  );
}

function PickForm<T extends { slug: string }>({
  who,
  ask,
  hint,
  pool,
  option,
  grid,
  done,
  onDone,
}: {
  who: string;
  ask: string;
  hint: string;
  pool: T[];
  option: (item: T) => React.ReactNode;
  grid: boolean;
  done: string;
  onDone: (mine: string[]) => void;
}) {
  const [mine, setMine] = useState<string[]>([]);
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
        {ask}
      </h1>
      <p>{hint}</p>
      <fieldset className={grid ? "pick-grid" : undefined}>
        <legend>اختر ما شئت، أو لا شيء</legend>
        {pool.map((item) => (
          <label
            className={grid ? "pick-card" : "level-option"}
            key={item.slug}
          >
            <input
              type="checkbox"
              checked={mine.includes(item.slug)}
              onChange={() => setMine(toggle(mine, item.slug))}
            />
            {option(item)}
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
  const { setLimits, end, pair } = useSession();
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
          {/* On two phones each partner owns, and resets, only their own. */}
          {pair ? "أعد تحديد حدودك" : "أعيدا تحديد الحدود"}
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

/**
 * A real-world action: what to do, how bold it is, and an optional timer.
 * `focus` lands keyboard and screen-reader users on it when it replaces the
 * control they used.
 */
export function ActivityCard({
  item,
  label,
  focus = false,
}: {
  item: Activity;
  label: string;
  focus?: boolean;
}) {
  const timer = useStored("timer") !== "off";
  return (
    <article className="act-card" ref={revealOnMount}>
      <span className="act-kind">{label}</span>
      <h2 ref={focus ? focusInPlace : undefined} tabIndex={-1}>
        {item.title}
      </h2>
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
