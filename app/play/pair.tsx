"use client";

import { useConvexConnectionState, useMutation } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { isCode, isSecret, joinCode, readCode, secret } from "@/lib/pair";
import { games } from "@/lib/site-images";
import {
  Boundaries,
  LimitsForm,
  Loading,
  useSession,
  type View,
  Waiting,
} from "./session";

const REFUSED =
  "لا يفتح هذا الرمز أو الرابط جلسة: ربما انتهت صلاحيته، أو دخل به هاتف آخر، أو أُنهيت الجلسة. اطلب من شريكك رمزًا جديدًا.";

/**
 * Games ask for boundaries first. One device: both partners', in turn. Two
 * phones: a partner, then each phone's own limits, then the other's.
 */
export function NeedsLimits({ children }: { children: React.ReactNode }) {
  const { limits, pair, leaving, setLimits } = useSession();
  if (usePathname() === "/play") return children;
  if (leaving) return null;
  if (!pair) return limits ? children : <Boundaries />;
  const { view } = pair;
  if (!view) return <Loading />;
  if (!view.partner) {
    return (
      <Waiting title="بانتظار شريكك">
        <Invite invite={view.invite} pairKey={pair.key} />
      </Waiting>
    );
  }
  if (!view.limits.me) {
    return (
      <LimitsForm who="على هاتفك" done="احفظ حدودي وأخفِها" onDone={setLimits} />
    );
  }
  if (!view.limits.partner) {
    return (
      <Waiting title="بانتظار حدود شريكك">
        <p>
          حُفظت حدودك في جلستكما، ولن يراها شريكك. تبدأ اللعبة حين يحدد حدوده على
          هاتفه.
        </p>
        <button
          type="button"
          className="ghost-button"
          onClick={() => setLimits(null)}
        >
          عدّل حدودي
        </button>
      </Waiting>
    );
  }
  return children;
}

/** Opens a session from this phone; its key, link token and code are drawn here. */
async function openWith(
  open: (args: {
    key: string;
    invite: string;
    code: string;
  }) => Promise<boolean>,
  key: string,
) {
  // A taken code (vanishingly rare) just means another draw.
  for (let tries = 0; tries < 3; tries++) {
    if (await open({ key, invite: secret(), code: joinCode() })) return true;
  }
  return false;
}

/** The code and link a waiting host passes on; both lapse after ten minutes or at the first join. */
function Invite({
  invite,
  pairKey,
}: {
  invite: View["invite"];
  pairKey: string;
}) {
  const open = useMutation(api.sessions.open);
  const [now, setNow] = useState(Date.now);
  const [note, setNote] = useState("");
  const until = invite?.until ?? 0;
  useEffect(() => {
    const id = setTimeout(() => setNow(Date.now()), until - Date.now());
    return () => clearTimeout(id);
  }, [until]);

  if (!invite || now >= until) {
    return (
      <div className="invite">
        <p>
          انتهت صلاحية الرمز والرابط، فلا يدخل بهما أحد. أنشئ رمزًا جديدًا وأرسله
          إلى شريكك.
        </p>
        <button
          type="button"
          className="button"
          onClick={async () => {
            await openWith(open, pairKey);
            setNow(Date.now());
          }}
        >
          رمز جديد
        </button>
      </div>
    );
  }
  // The token rides after "#", so it never reaches a server log or a link preview.
  const link = `${location.origin}/play#${invite.link}`;
  const time = new Intl.DateTimeFormat("ar-u-nu-latn", {
    timeStyle: "short",
  }).format(until);
  return (
    <div className="invite">
      <p className="invite-code">
        <span className="sr-only">
          رمز الجلسة: {[...invite.code].join(" ")}
        </span>
        <span aria-hidden="true" dir="ltr">
          {invite.code.slice(0, 4)} {invite.code.slice(4)}
        </span>
      </p>
      <p>
        يكتبه شريكك في «ادخل برمز» على صفحة الألعاب في هاتفه، أو أرسل إليه
        الرابط.
      </p>
      <button
        type="button"
        className="button"
        onClick={async () => {
          const copy = async () => {
            await navigator.clipboard.writeText(link);
            setNote("نُسخ الرابط. أرسله إلى شريكك وحده.");
          };
          if (!navigator.share) return copy();
          // Cancelling the share sheet is a choice; any other failure copies instead.
          await navigator
            .share({ title: "معًا", text: "جلستنا على هاتفين", url: link })
            .catch((error: Error) =>
              error.name === "AbortError" ? undefined : copy(),
            );
        }}
      >
        أرسل الرابط
      </button>
      <p className="invite-note" role="status">
        {note || `الرمز والرابط صالحان حتى ${time}، ولهاتف واحد فقط.`}
      </p>
    </div>
  );
}

/** The hub's two ways to play; on two phones, how to connect and how it stands. */
export function PlayModes() {
  const { pair, pairUp } = useSession();
  const open = useMutation(api.sessions.open);
  const join = useMutation(api.sessions.join);
  const [two, setTwo] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function enter(invite: string) {
    setBusy(true);
    setError("");
    const key = secret();
    const ok = await join({ key, invite }).catch(() => false);
    setBusy(false);
    if (ok) pairUp(key);
    else setError(REFUSED);
  }

  // A shared link lands here with its token after "#": used once, then dropped from the address.
  useEffect(() => {
    const token = location.hash.slice(1);
    if (!isSecret(token)) return;
    history.replaceState(null, "", location.pathname);
    setTwo(true);
    if (!pair) void enter(token);
  });

  if (pair) {
    const view = pair.view;
    return (
      <section className="wrap pair" aria-labelledby="pair-title">
        {!view ? (
          <p className="play-state">جارٍ الاتصال بجلستكما…</p>
        ) : view.partner ? (
          <>
            <h2 id="pair-title" className="play-subtitle">
              هاتفاكما متصلان
            </h2>
            <p>
              اختارا لعبة. تظهر البطاقة والعجلة والمسار نفسها على الهاتفين،
              ويحدد كلٌّ منكما حدوده على هاتفه، ويستطيع أيٌّ منكما التخطي أو إنهاء
              الجلسة متى شاء.
            </p>
          </>
        ) : (
          <>
            <h2 id="pair-title" className="play-subtitle">
              بانتظار شريكك
            </h2>
            <Invite invite={view.invite} pairKey={pair.key} />
          </>
        )}
      </section>
    );
  }

  return (
    <>
      <fieldset className="wrap play-modes">
        <legend>كيف تلعبان؟</legend>
        <label className="mode">
          <input
            type="radio"
            name="mode"
            checked={!two}
            onChange={() => setTwo(false)}
          />
          <strong>على جهاز واحد</strong>
          <small>تتبادلان الهاتف، وتبقى حدود كلٍّ منكما مخفية عن الآخر.</small>
        </label>
        <label className="mode">
          <input
            type="radio"
            name="mode"
            checked={two}
            onChange={() => setTwo(true)}
          />
          <strong>على هاتفين</strong>
          <small>رمز يربط هاتفيكما، ويختار كلٌّ منكما على هاتفه.</small>
        </label>
      </fieldset>
      {two && (
        <section className="wrap pair" aria-labelledby="pair-title">
          <h2 id="pair-title" className="play-subtitle">
            اربطا هاتفيكما
          </h2>
          <p>
            ينشئ أحدكما الجلسة ويرسل الرابط أو يقرأ الرمز، ويدخل الآخر من هاتفه.
            لا حساب ولا أسماء، وتُحذف الجلسة بكل ما فيها حين تنهيانها، أو بعد يوم
            بلا نشاط.
          </p>
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const key = secret();
              const ok = await openWith(open, key).catch(() => false);
              setBusy(false);
              if (ok) pairUp(key);
              else
                setError("تعذّر إنشاء الجلسة. تحقّقا من الاتصال وحاولا مجددًا.");
            }}
          >
            أنشئ جلسة
          </button>
          <form
            className="pair-join"
            onSubmit={(event) => {
              event.preventDefault();
              const code = readCode(
                String(new FormData(event.currentTarget).get("code")),
              );
              if (isCode(code)) void enter(code);
              else
                setError(
                  "الرمز ستة أحرف وأرقام، مثل K7MX2P. تحقّق منه وأعد كتابته.",
                );
            }}
          >
            <label htmlFor="pair-code">أو ادخل برمز من شريكك</label>
            <div>
              <input
                id="pair-code"
                name="code"
                dir="ltr"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="go"
                maxLength={12}
                placeholder="K7MX 2PQR"
                aria-describedby="pair-error"
              />
              <button type="submit" className="ghost-button" disabled={busy}>
                ادخل
              </button>
            </div>
          </form>
          <p id="pair-error" className="pair-error" role="alert">
            {error}
          </p>
        </section>
      )}
    </>
  );
}

const TITLES: Record<string, string> = Object.fromEntries(
  games.map((game) => [game.href, game.title]),
);

const STATES = {
  offline: "انقطع اتصال هاتفك. نعيد المحاولة، ولا يضيع شيء من جلستكما.",
  waiting: "بانتظار شريكك.",
  away: "انقطع اتصال شريكك. تبقى الجلسة كما هي حتى يعود.",
  here: "شريكك متصل.",
};

/** How the two phones stand: waiting, together, or one of them gone quiet. */
export function PairBar() {
  const { pair } = useSession();
  const pathname = usePathname();
  const { isWebSocketConnected, hasEverConnected } = useConvexConnectionState();
  const view = pair?.view;
  const state: keyof typeof STATES | null = !pair
    ? null
    : hasEverConnected && !isWebSocketConnected
      ? "offline"
      : !view
        ? null
        : !view.partner
          ? "waiting"
          : view.partner.here
            ? "here"
            : "away";
  // Coming back is news for a few seconds; then the plain state again.
  const [last, setLast] = useState(state);
  const [news, setNews] = useState("");
  if (state !== last) {
    setLast(state);
    setNews(
      state !== "here"
        ? ""
        : last === "waiting"
          ? "انضم شريكك إلى الجلسة."
          : last === "away"
            ? "عاد شريكك إلى الجلسة."
            : last === "offline"
              ? "عاد اتصال هاتفك."
              : "",
    );
  }
  useEffect(() => {
    if (!news) return;
    const id = setTimeout(() => setNews(""), 8000);
    return () => clearTimeout(id);
  }, [news]);

  if (!pair) return null;
  const page = state === "here" ? view?.partner?.page : null;
  const there = page && page !== pathname ? TITLES[page] : null;
  return (
    <div className="wrap pair-bar" data-state={state ?? "waiting"}>
      <span className="pair-thread" aria-hidden="true" />
      <p role="status">
        {news || (state ? STATES[state] : "جارٍ الاتصال بجلستكما…")}
      </p>
      {page && there && <Link href={page}>شريكك في «{there}»</Link>}
    </div>
  );
}
