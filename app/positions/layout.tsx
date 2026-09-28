import type { Metadata } from "next";
import Link from "next/link";
import { ClearDataButton } from "../providers";
import { SiteNav } from "../site-nav";

export const metadata: Metadata = {
  title: "دليل الوضعيات",
  alternates: { canonical: "/positions" },
  description:
    "وضعيات مرسومة مع شرح مباشر وخطوات واعتبارات الراحة والسلامة، للأزواج البالغين.",
};

export default function PositionsLayout({
  children,
}: LayoutProps<"/positions">) {
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
        <p>المفضلة والمستبعدة محفوظة على هذا الجهاز وحده، من دون حساب.</p>
        <ClearDataButton />
      </footer>
    </main>
  );
}
