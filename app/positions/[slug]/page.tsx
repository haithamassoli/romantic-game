"use client";

import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { use, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { POSITION_IMAGE_SIZE } from "@/lib/site-images";
import { CONSTRAINTS, DIFFICULTY } from "@/lib/tags";
import { readList, toggleSlug, useStored } from "../../providers";

export default function PositionPage({
  params,
}: PageProps<"/positions/[slug]">) {
  const { slug } = use(params);
  const position = useQuery(api.positions.get, { slug });
  const favorites = readList(useStored("favorites"));
  const excluded = readList(useStored("excluded"));
  const zoom = useRef<HTMLDialogElement>(null);
  const zoomScroll = useRef<HTMLDivElement>(null);
  const [actualSize, setActualSize] = useState(false);

  if (position === undefined) {
    return (
      <p className="wrap pos-status" aria-busy="true">
        جارٍ تحميل الوضعية…
      </p>
    );
  }
  if (position === null) {
    return (
      <section className="wrap pos-status">
        <h1>لا وضعية بهذا الرابط</h1>
        <p>ربما أُخفيت أو تغيّر رابطها.</p>
        <Link className="button" href="/positions">
          كل الوضعيات
        </Link>
      </section>
    );
  }

  const isFavorite = favorites.includes(slug);
  const isExcluded = excluded.includes(slug);
  const image = {
    src: position.image,
    alt: position.imageAlt,
    ...POSITION_IMAGE_SIZE,
    sizes: "(max-width: 720px) 100vw, 45vw",
  };

  return (
    <article className="wrap pos-detail">
      <title>{`${position.name} — دليل الوضعيات — معًا`}</title>
      <Link className="back-link" href="/positions">
        <span aria-hidden="true">→</span> كل الوضعيات
      </Link>
      <div className="pos-detail-grid">
        <button
          type="button"
          className="pos-figure"
          onClick={() => zoom.current?.showModal()}
          aria-haspopup="dialog"
        >
          <Image {...image} loading="eager" />
          <span className="zoom-hint">اضغطا لتكبير الرسم</span>
        </button>

        <div className="pos-body">
          <h1>{position.name}</h1>
          <p className="pos-summary">{position.summary}</p>
          <dl className="pos-facts">
            <div>
              <dt>الصعوبة</dt>
              <dd>{DIFFICULTY[position.difficulty]}</dd>
            </div>
            <div>
              <dt>تُجهد</dt>
              <dd>
                {position.constraints.map((c) => CONSTRAINTS[c]).join("، ") ||
                  "لا جهد خاص"}
              </dd>
            </div>
          </dl>
          <div className="pos-actions">
            <button
              type="button"
              aria-pressed={isFavorite}
              onClick={() => toggleSlug("favorites", slug)}
            >
              <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span> المفضلة
            </button>
            <button
              type="button"
              aria-pressed={isExcluded}
              onClick={() => toggleSlug("excluded", slug)}
            >
              <span aria-hidden="true">{isExcluded ? "⊘" : "○"}</span> استبعاد
            </button>
          </div>
          <p className="pos-status-line" aria-live="polite">
            {isFavorite
              ? "محفوظة في مفضلتكما على هذا الجهاز."
              : isExcluded
                ? "مستبعدة؛ لن تظهر في القائمة إلا إن اخترتما إظهار المستبعدة."
                : ""}
          </p>

          <p>{position.description}</p>

          <h2>الخطوات</h2>
          <ol className="pos-steps">
            {position.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <h2>الراحة والسلامة</h2>
          <ul className="pos-care">
            {position.care.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </div>

      <dialog
        ref={zoom}
        className={`zoom${actualSize ? " is-actual" : ""}`}
        aria-label={`رسم ${position.name} مكبّرًا`}
        closedby="any"
        onClose={() => setActualSize(false)}
      >
        <div className="zoom-bar">
          <button
            type="button"
            aria-pressed={actualSize}
            onClick={() => {
              setActualSize(!actualSize);
              // Start the full-size view on the middle of the drawing (RTL scrollLeft is negative).
              requestAnimationFrame(() => {
                const el = zoomScroll.current;
                el?.scrollTo(
                  -(el.scrollWidth - el.clientWidth) / 2,
                  (el.scrollHeight - el.clientHeight) / 2,
                );
              });
            }}
          >
            الحجم الكامل
          </button>
          <form method="dialog">
            <button type="submit">إغلاق</button>
          </form>
        </div>
        <div className="zoom-scroll" ref={zoomScroll}>
          {/* Fit view reuses the figure's cached file; full size asks for the drawing's real pixels. */}
          <Image
            {...image}
            sizes={actualSize ? `${POSITION_IMAGE_SIZE.width}px` : image.sizes}
            loading="eager"
          />
        </div>
      </dialog>
    </article>
  );
}
