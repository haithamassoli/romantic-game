"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useSyncExternalStore } from "react";
import { localKeys, PREFIX } from "@/lib/play";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string,
);

const CHANGE = "maan:change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

/** The raw stored string; `undefined` while rendering on the server. */
export function useStored(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(PREFIX + key),
    () => undefined,
  );
}

export function store(key: string, value: string) {
  localStorage.setItem(PREFIX + key, value);
  window.dispatchEvent(new Event(CHANGE));
}

export function readList(raw: string | null | undefined): string[] {
  try {
    const list = JSON.parse(raw ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Adds or removes `slug`; a slug is never both favorite and excluded. */
export function toggleSlug(key: "favorites" | "excluded", slug: string) {
  const other = key === "favorites" ? "excluded" : "favorites";
  const list = readList(localStorage.getItem(PREFIX + key));
  const on = !list.includes(slug);
  store(
    key,
    JSON.stringify(on ? [...list, slug] : list.filter((s) => s !== slug)),
  );
  if (on) {
    const rest = readList(localStorage.getItem(PREFIX + other));
    store(other, JSON.stringify(rest.filter((s) => s !== slug)));
  }
}

export function ClearDataButton() {
  return (
    <button
      type="button"
      className="clear-data"
      onClick={() => {
        if (
          !window.confirm(
            "سيُمسح من هذا الجهاز تأكيد العمر والمفضلة والمستبعدة والتصفية وتفضيلات اللعب. متابعة؟",
          )
        )
          return;
        for (const key of localKeys(Object.keys(localStorage))) {
          localStorage.removeItem(key);
        }
        window.dispatchEvent(new Event(CHANGE));
      }}
    >
      مسح البيانات المحلية
    </button>
  );
}

function AgeGate({ children }: { children: React.ReactNode }) {
  const age = useStored("age");
  if (age === "18+") return children;
  // Server render and first paint: a quiet veil, so no content flashes before the check.
  if (age === undefined) return <div className="gate" aria-busy="true" />;
  return (
    <main className="gate">
      <div className="gate-card">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          معًا
        </span>
        <h1>قبل أن تدخلا</h1>
        <p>
          هنا رسوم وشروح جنسية صريحة لأزواج بالغين يختاران معًا. ادخلا فقط إن كان
          كلٌّ منكما في الثامنة عشرة أو أكثر، وكان هذا المحتوى مسموحًا حيث تقيمان.
        </p>
        <div className="gate-actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              store("age", "18+");
              // Land keyboard and screen-reader users on the page they just unlocked.
              requestAnimationFrame(() => {
                const heading = document.querySelector<HTMLElement>("main h1");
                heading?.setAttribute("tabindex", "-1");
                heading?.focus();
              });
            }}
          >
            عمري 18 عامًا أو أكثر، أدخل
          </button>
          <a className="text-link" href="https://www.google.com">
            عمري أقل من 18، أغادر
          </a>
        </div>
        <small>يُحفظ تأكيدك على هذا الجهاز فقط، وتستطيع مسحه متى شئت.</small>
      </div>
    </main>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <AgeGate>{children}</AgeGate>
    </ConvexProvider>
  );
}
