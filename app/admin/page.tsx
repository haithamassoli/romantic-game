"use client";

import { useConvex, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import Image from "next/image";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { type Kind, missing } from "@/lib/content";
import { POSITION_IMAGE_SIZE } from "@/lib/site-images";
import {
  CONSTRAINT_KEYS,
  CONSTRAINTS,
  type Constraint,
  DIFFICULTY,
  INTENSITY,
  LEVELS,
  type Level,
  TOPIC_KEYS,
  TOPICS,
  type Topic,
} from "@/lib/tags";

// The publisher's token stays in this tab's sessionStorage: closing the tab or
// "خروج" forgets it. Every call sends it, and Convex checks it (convex/admin.ts).
const KEY = "maan:admin";

type Catalogue = NonNullable<FunctionReturnType<typeof api.admin.list>>;
type Row = Catalogue["positions"][number] | Catalogue["activities"][number];
type Status = Row["status"];

const KINDS = [
  { kind: "position", label: "الوضعيات", add: "وضعية جديدة" },
  { kind: "card", label: "البطاقات", add: "بطاقة جديدة" },
  { kind: "challenge", label: "التحديات", add: "تحدٍّ جديد" },
  { kind: "desire", label: "الرغبات", add: "رغبة جديدة" },
] as const;

const STATUS: Record<Status, string> = {
  draft: "مسودة",
  published: "منشور",
  hidden: "مخفي",
};

/** One editable item, whatever its kind; each save sends only its kind's fields. */
type Form = {
  id?: string;
  kind: Kind;
  slug: string;
  status: Status;
  name: string;
  summary: string;
  description: string;
  steps: string[];
  care: string[];
  difficulty?: Level;
  intensity?: Level;
  topics: Topic[];
  constraints: Constraint[];
  imageId?: Id<"_storage">;
  imageUrl?: string | null;
  imageAlt: string;
  imageRights: string;
  title: string;
  body: string;
  action: string;
  minutes?: number;
};

const blank = (kind: Kind): Form => ({
  kind,
  slug: "",
  status: "draft",
  name: "",
  summary: "",
  description: "",
  steps: [],
  care: [],
  // A position is always جريء and a position (convex/admin.ts).
  intensity: kind === "position" ? 3 : undefined,
  topics: kind === "position" ? ["positions"] : [],
  constraints: [],
  imageAlt: "",
  imageRights: "",
  title: "",
  body: "",
  action: "",
});

const toForm = (kind: Kind, row: Row): Form => ({
  ...blank(kind),
  ...row,
  id: row._id,
});

// Stable, so it runs once per mounted heading: where keyboard focus and the view land.
const focusHere = (el: HTMLElement | null) => el?.focus();

const gapsOf = (f: Form) =>
  missing(f.kind, { ...f, image: f.imageUrl ?? undefined });
const titleOf = (f: Form) => (f.kind === "position" ? f.name : f.title);

function useSave(token: string) {
  const savePosition = useMutation(api.admin.savePosition);
  const saveActivity = useMutation(api.admin.saveActivity);
  return async (f: Form): Promise<string | null> => {
    const shared = {
      token,
      slug: f.slug,
      status: f.status,
      topics: f.topics,
      constraints: f.constraints,
    };
    try {
      // A refusal (incomplete, slug taken) comes back as a message; a wrong token throws.
      return f.kind === "position"
        ? await savePosition({
            ...shared,
            id: f.id as Id<"positions"> | undefined,
            name: f.name,
            summary: f.summary,
            description: f.description,
            steps: f.steps,
            care: f.care,
            difficulty: f.difficulty,
            imageId: f.imageId,
            imageAlt: f.imageAlt,
            imageRights: f.imageRights,
          })
        : await saveActivity({
            ...shared,
            id: f.id as Id<"activities"> | undefined,
            kind: f.kind,
            intensity: f.intensity,
            title: f.title,
            body: f.body,
            minutes: f.minutes,
            action: f.kind === "desire" ? f.action : undefined,
          });
    } catch (error) {
      return error instanceof ConvexError
        ? String(error.data)
        : "تعذّر الحفظ. تحقق من الاتصال وحاول مجددًا.";
    }
  };
}

export default function AdminPage() {
  const [token, setToken] = useState(
    () => globalThis.sessionStorage?.getItem(KEY) ?? null,
  );
  const [note, setNote] = useState("");
  const data = useQuery(api.admin.list, token ? { token } : "skip");

  // A token the server no longer accepts (rotated or removed): sign in again.
  if (token && data === null) {
    sessionStorage.removeItem(KEY);
    setToken(null);
    setNote("لم يعد هذا الرمز مقبولًا. ادخل بالرمز الحالي.");
  }
  if (!token) {
    return (
      <SignIn
        note={note}
        onIn={(next) => {
          sessionStorage.setItem(KEY, next);
          setToken(next);
          setNote("");
        }}
      />
    );
  }
  if (!data) {
    return (
      <p className="wrap play-status" aria-busy="true">
        جارٍ تحميل المحتوى…
      </p>
    );
  }
  return (
    <Catalogue
      token={token}
      data={data}
      onOut={() => {
        sessionStorage.removeItem(KEY);
        setToken(null);
        setNote("خرجت، ولم يبقَ الرمز في هذه النافذة.");
      }}
    />
  );
}

function SignIn({
  note,
  onIn,
}: {
  note: string;
  onIn: (token: string) => void;
}) {
  const convex = useConvex();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="wrap bounds admin-gate"
      onSubmit={async (event) => {
        event.preventDefault();
        const token = String(
          new FormData(event.currentTarget).get("token"),
        ).trim();
        setBusy(true);
        const ok = await convex
          .query(api.admin.check, { token })
          .catch(() => false);
        setBusy(false);
        if (ok) onIn(token);
        else setError("هذا ليس رمز الناشر. تحقّق منه وأعد لصقه.");
      }}
    >
      <span className="bounds-glyph" aria-hidden="true">
        ✳
      </span>
      <h1>إدارة المحتوى</h1>
      <p>
        للناشر وحده. الصق رمز الناشر لتدخل؛ يبقى في هذه النافذة فقط حتى تغلقها
        أو تخرج.
      </p>
      <label className="admin-field">
        رمز الناشر
        <input
          name="token"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          required
          aria-describedby="admin-error"
        />
      </label>
      <button type="submit" className="button" disabled={busy}>
        ادخل
      </button>
      <p id="admin-error" className="admin-note" role="alert">
        {error || note}
      </p>
    </form>
  );
}

function Catalogue({
  token,
  data,
  onOut,
}: {
  token: string;
  data: Catalogue;
  onOut: () => void;
}) {
  const save = useSave(token);
  const [kind, setKind] = useState<Kind>("position");
  const [editing, setEditing] = useState<Form | null>(null);
  const [note, setNote] = useState("");
  const [back, setBack] = useState(false);

  if (editing) {
    return (
      <Editor
        token={token}
        initial={editing}
        save={save}
        onDone={(done) => {
          setEditing(null);
          setNote(done);
          setBack(true);
        }}
      />
    );
  }

  const of = (k: Kind) =>
    k === "position"
      ? [...data.positions].sort((a, b) => a.order - b.order)
      : data.activities.filter((a) => a.kind === k);
  const rows = of(kind).map((row) => toForm(kind, row));
  const add = KINDS.find((k) => k.kind === kind)?.add;

  return (
    <section className="wrap admin" aria-labelledby="admin-title">
      <div className="admin-head">
        <h1 id="admin-title" ref={back ? focusHere : undefined} tabIndex={-1}>
          المحتوى
        </h1>
        <button type="button" className="text-button" onClick={onOut}>
          خروج
        </button>
      </div>
      <p className="admin-lede">
        لا يرى الزوجان إلا المنشور؛ المسودة والمخفي هنا فقط. لا يُنشر عنصر قبل أن
        تكتمل نصوصه ووسومه، وللوضعية رسم ونص بديل وحقوق.
      </p>
      <fieldset className="lib-filter">
        <legend>النوع</legend>
        {KINDS.map((k) => (
          <label className="chip" key={k.kind}>
            <input
              type="radio"
              name="kind"
              checked={kind === k.kind}
              onChange={() => {
                setKind(k.kind);
                setNote("");
              }}
            />
            {k.label} ({of(k.kind).length})
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className="button admin-add"
        onClick={() => setEditing(blank(kind))}
      >
        {add}
      </button>
      <ul className="admin-list">
        {rows.map((row) => {
          const gaps = gapsOf(row);
          const title = titleOf(row) || "بلا عنوان";
          const set = async (status: Status) => {
            const error = await save({ ...row, status });
            setNote(
              error ??
                `${status === "published" ? "نُشر" : "أُخفي"}: «${title}».`,
            );
          };
          return (
            <li className="admin-row" data-status={row.status} key={row.id}>
              {row.imageUrl && (
                <Image
                  className="admin-thumb"
                  src={row.imageUrl}
                  alt=""
                  {...POSITION_IMAGE_SIZE}
                  sizes="4rem"
                />
              )}
              <div className="admin-row-body">
                <strong className="admin-title">{title}</strong>
                <span className="admin-meta">
                  <span className="admin-status">{STATUS[row.status]}</span>
                  {row.intensity && <span>{INTENSITY[row.intensity]}</span>}
                  <span dir="ltr">{row.slug}</span>
                </span>
                {gaps.length > 0 && (
                  <small>ينقصه للنشر: {gaps.join("، ")}</small>
                )}
              </div>
              <div className="admin-row-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setEditing(row)}
                >
                  تعديل<span className="sr-only"> «{title}»</span>
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    set(row.status === "published" ? "hidden" : "published")
                  }
                >
                  {row.status === "published" ? "إخفاء" : "نشر"}
                  <span className="sr-only"> «{title}»</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {/* After the list, so it rides the bottom of the screen beside the button pressed. */}
      <p className="admin-note admin-toast" role="status">
        {note}
      </p>
    </section>
  );
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function Editor({
  token,
  initial,
  save,
  onDone,
}: {
  token: string;
  initial: Form;
  save: (form: Form) => Promise<string | null>;
  onDone: (note: string) => void;
}) {
  const uploadUrl = useMutation(api.admin.uploadUrl);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const position = form.kind === "position";
  const gaps = gapsOf(form);
  const lines = (key: "steps" | "care", label: string, hint: string) => (
    <label className="admin-field">
      {label}
      <textarea
        rows={4}
        value={form[key].join("\n")}
        onChange={(e) => set({ [key]: e.target.value.split("\n") })}
      />
      <small>{hint}</small>
    </label>
  );

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const url = await uploadUrl({ token });
      const sent = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await sent.json();
      set({ imageId: storageId, imageUrl: URL.createObjectURL(file) });
    } catch {
      setError("تعذّر رفع الرسم. تحقق من الاتصال وحاول مجددًا.");
    }
    setBusy(false);
  }

  return (
    <form
      className="wrap admin admin-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        const refused = await save(form);
        setBusy(false);
        if (refused) setError(refused);
        else onDone(`حُفظ «${titleOf(form)}»: ${STATUS[form.status]}.`);
      }}
    >
      <button
        type="button"
        className="back-link text-button"
        onClick={() => onDone("")}
      >
        <span aria-hidden="true">→</span> كل المحتوى، دون حفظ
      </button>
      <h1 ref={focusHere} tabIndex={-1}>
        {form.id
          ? `تعديل «${titleOf(initial)}»`
          : KINDS.find((k) => k.kind === form.kind)?.add}
      </h1>

      {form.id ? (
        <p className="admin-lede">
          الرابط: <span dir="ltr">{form.slug}</span> (لا يتغير بعد الإنشاء)
        </p>
      ) : (
        <label className="admin-field">
          الرابط
          <input
            dir="ltr"
            value={form.slug}
            onChange={(e) => set({ slug: e.target.value.trim() })}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={60}
            autoCapitalize="none"
            spellCheck={false}
          />
          <small>
            أحرف لاتينية صغيرة وأرقام وشرطات، مثل slow-kiss. يبقى ثابتًا لأن
            المفضلة والجلسات تشير إليه.
          </small>
        </label>
      )}

      {position ? (
        <>
          <label className="admin-field">
            الاسم
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>
          <label className="admin-field">
            الملخص
            <textarea
              rows={2}
              value={form.summary}
              onChange={(e) => set({ summary: e.target.value })}
            />
          </label>
          <label className="admin-field">
            الشرح
            <textarea
              rows={5}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </label>
          {lines("steps", "الخطوات", "خطوة في كل سطر، من 3 إلى 5.")}
          {lines("care", "الراحة والسلامة", "ملاحظة في كل سطر.")}
          <fieldset>
            <legend>الصعوبة</legend>
            {LEVELS.map((l) => (
              <label className="chip" key={l}>
                <input
                  type="radio"
                  name="difficulty"
                  checked={form.difficulty === l}
                  onChange={() => set({ difficulty: l })}
                />
                {DIFFICULTY[l]}
              </label>
            ))}
          </fieldset>
        </>
      ) : (
        <>
          <label className="admin-field">
            العنوان
            <input
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </label>
          <label className="admin-field">
            {form.kind === "desire" ? "الرغبة كما يختارها كلٌّ منكما" : "النص"}

            <textarea
              rows={4}
              value={form.body}
              onChange={(e) => set({ body: e.target.value })}
            />
            {form.kind === "card" && (
              <small>
                بطاقة موسومة «حديث وأسئلة» تُسحب سؤالًا، وغيرها تحديًا.
              </small>
            )}
          </label>
          {form.kind === "desire" && (
            <label className="admin-field">
              الخطوة الواقعية حين يختارها كلاهما
              <textarea
                rows={4}
                value={form.action}
                onChange={(e) => set({ action: e.target.value })}
              />
            </label>
          )}
          <label className="admin-field admin-short">
            المدة بالدقائق (اختيارية، للمؤقت)
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              value={form.minutes ?? ""}
              onChange={(e) =>
                set({
                  minutes:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </label>
        </>
      )}

      {!position && (
        <fieldset>
          <legend>الجرأة</legend>
          {LEVELS.map((l) => (
            <label className="chip" key={l}>
              <input
                type="radio"
                name="intensity"
                checked={form.intensity === l}
                onChange={() => set({ intensity: l })}
              />
              {INTENSITY[l]}
            </label>
          ))}
        </fieldset>
      )}
      <fieldset>
        <legend>الموضوعات (يختفي العنصر عمّن يرفض أيًّا منها)</legend>
        {TOPIC_KEYS.map((t) => (
          <label className="chip" key={t}>
            <input
              type="checkbox"
              checked={form.topics.includes(t)}
              disabled={position && t === "positions"}
              onChange={() => set({ topics: toggle(form.topics, t) })}
            />
            {TOPICS[t]}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>ما يُجهده (اتركها فارغة إن لم يُجهد شيئًا)</legend>
        {CONSTRAINT_KEYS.map((c) => (
          <label className="chip" key={c}>
            <input
              type="checkbox"
              checked={form.constraints.includes(c)}
              onChange={() => set({ constraints: toggle(form.constraints, c) })}
            />
            {CONSTRAINTS[c]}
          </label>
        ))}
      </fieldset>

      {position && (
        <>
          <div className="admin-field">
            الرسم
            {form.imageUrl && (
              <Image
                className="admin-preview"
                src={form.imageUrl}
                alt={form.imageAlt}
                {...POSITION_IMAGE_SIZE}
                unoptimized
              />
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label={form.imageUrl ? "استبدال الرسم" : "رفع الرسم"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <small>
              رسم عمودي بنسبة الرسوم الحالية (1145×1374)، لبالغين وبلا ملامح
              وجوه، ويملك الناشر حقوقه. يُحفظ مع العنصر.
            </small>
          </div>
          <label className="admin-field">
            النص البديل للرسم
            <textarea
              rows={2}
              value={form.imageAlt}
              onChange={(e) => set({ imageAlt: e.target.value })}
            />
            <small>ما يظهر في الرسم لمن لا يراه.</small>
          </label>
          <label className="admin-field">
            حقوق الرسم
            <input
              value={form.imageRights}
              onChange={(e) => set({ imageRights: e.target.value })}
            />
            <small>من رسمه، ومن يملكه، وبأي إذن يُنشر هنا.</small>
          </label>
        </>
      )}

      <fieldset>
        <legend>الحالة</legend>
        {(["draft", "published", "hidden"] as const).map((s) => (
          <label className="chip" key={s}>
            <input
              type="radio"
              name="status"
              checked={form.status === s}
              onChange={() => set({ status: s })}
            />
            {STATUS[s]}
          </label>
        ))}
      </fieldset>
      <div className="admin-bar">
        <p className="admin-gaps">
          {gaps.length > 0
            ? `ينقص للنشر: ${gaps.join("، ")}.`
            : "مكتمل، ويمكن نشره."}
        </p>
        <p className="admin-note" role="alert">
          {error}
        </p>
        <button type="submit" className="button" disabled={busy}>
          {busy ? "جارٍ…" : "حفظ"}
        </button>
      </div>
    </form>
  );
}
