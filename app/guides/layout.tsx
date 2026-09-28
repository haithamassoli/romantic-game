import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "../site-nav";

export const metadata: Metadata = {
  title: "مكتبة الأدلة",
  alternates: { canonical: "/guides" },
  description:
    "أدلة عربية مختصرة للأزواج البالغين عن التواصل والمداعبة والنشوة والصحة الجنسية، من مصادر مفتوحة مع نسبة كل دليل إلى مصدره.",
};

export default function GuidesLayout({ children }: LayoutProps<"/guides">) {
  return (
    <main>
      <div className="grain" aria-hidden="true" />
      <header className="site-header wrap">
        <Link className="brand" href="/" aria-label="معًا، الصفحة الرئيسية">
          <span className="brand-mark" aria-hidden="true" />
          معًا
        </Link>
        <SiteNav>
          <Link href="/positions">الوضعيات</Link>
          <Link href="/guides">الأدلة</Link>
          <Link href="/play">الألعاب</Link>
        </SiteNav>
        <span className="adult-note">
          للبالغين فقط <b>+18</b>
        </span>
      </header>
      {children}
      <footer className="site-footer wrap">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true" />
          معًا
        </Link>
        <p>معلومات تثقيفية للأزواج البالغين، لا تغني عن استشارة مختص.</p>
      </footer>
    </main>
  );
}
