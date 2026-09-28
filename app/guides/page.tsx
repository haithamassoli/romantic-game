import Link from "next/link";
import { ViewTransition } from "react";
import { GUIDE_COUNT, guidesLabel, SECTIONS } from "@/lib/guides";

export default function GuidesPage() {
  return (
    <>
      <section className="wrap pos-intro" aria-labelledby="guides-title">
        <h1 id="guides-title">مكتبة الأدلة</h1>
        <p>
          {guidesLabel(GUIDE_COUNT)} عربيًا مختصرًا، مرتبة في أقسام: من الحديث عن
          الرغبة إلى المداعبة والنشوة والصحة. لكل دليل شرح ونقاط عملية ورابط
          لمصدره المفتوح.
        </p>
        <p className="pos-consent">
          الأدلة للتثقيف لا للتشخيص. عند ألم مستمر أو قلق صحي، راجعا مختصًا.
        </p>
      </section>

      <ul className="wrap guides-sections">
        {SECTIONS.map((s) => (
          <li key={s.slug}>
            <Link className="guides-section-card" href={`/guides/${s.slug}`}>
              <ViewTransition
                name={`section-${s.slug}`}
                share="morph"
                default="none"
              >
                <h2>{s.title}</h2>
              </ViewTransition>
              <span className="guides-count">
                {guidesLabel(s.guides.length)}
              </span>
              <p>{s.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
