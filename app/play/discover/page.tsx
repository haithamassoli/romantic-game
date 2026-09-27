"use client";

import Image from "next/image";
import Link from "next/link";
import { POSITION_IMAGE_SIZE } from "@/lib/site-images";
import { DIFFICULTY } from "@/lib/tags";
import { readList, useStored } from "../../providers";
import { Loading, SecretPicks, useAllowedPositions } from "../session";

export default function DiscoverPage() {
  const positions = useAllowedPositions();
  const excluded = readList(useStored("excluded"));
  if (!positions) return <Loading />;
  // Only what both accept, minus what this device excluded in the guide.
  const pool = positions.filter((p) => !excluded.includes(p.slug));

  return (
    <SecretPicks
      game="discover"
      title="اكتشاف الوضعيات"
      intro="يتصفح كلٌّ منكما الوضعيات وحده ويحدد ما يودّ تجربته، ثم تظهر الوضعيات التي اختارها كلاكما فقط. لا تظهر هنا الوضعيات التي استبعدتماها في الدليل."
      pool={pool}
      ask="ما تودّ تجربته"
      hint="لا يرى شريكك اختياراتك، ولا يظهر منها إلا ما اختاره هو أيضًا."
      grid
      option={(p) => (
        <>
          <span>
            <strong>{p.name}</strong>
            <small>{DIFFICULTY[p.difficulty]}</small>
          </span>
          {/* After the name so the checkbox reads it first; CSS shows the drawing on top. */}
          <Image
            className="pick-art"
            src={p.image}
            alt={p.imageAlt}
            {...POSITION_IMAGE_SIZE}
            sizes="(max-width: 720px) 45vw, 16rem"
          />
        </>
      )}
      reveal={(matches) => (
        <>
          <p className="matches-note">
            يُفتح شرح كل وضعية في صفحة جديدة، فتبقى نتيجتكما هنا.
          </p>
          {matches.map((p) => (
            <article className="act-card match-pos" key={p.slug}>
              <Image
                className="match-art"
                src={p.image}
                alt={p.imageAlt}
                {...POSITION_IMAGE_SIZE}
                sizes="7rem"
              />
              <span className="act-kind">وضعية مشتركة</span>
              <h2>{p.name}</h2>
              <p>{p.summary}</p>
              <p className="act-meta">
                <span>
                  <span className="sr-only">الصعوبة: </span>
                  {DIFFICULTY[p.difficulty]}
                </span>
              </p>
              <Link
                className="button"
                href={`/positions/${p.slug}`}
                target="_blank"
              >
                الخطوات والراحة والسلامة
                <span className="sr-only"> (في صفحة جديدة)</span>
              </Link>
            </article>
          ))}
        </>
      )}
    />
  );
}
