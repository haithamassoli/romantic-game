import type { Metadata } from "next";
import Link from "next/link";
import { ClearDataButton } from "../providers";

export const metadata: Metadata = {
  title: "دليل الوضعيات",
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
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          معًا
        </Link>
        <nav aria-label="التنقل الرئيسي">
          <Link href="/positions">الوضعيات</Link>
          <Link href="/play">الألعاب</Link>
        </nav>
        <span className="adult-note">
          للبالغين فقط <b>+18</b>
        </span>
      </header>
      {children}
      <footer className="site-footer wrap">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          معًا
        </Link>
        <p>المفضلة والمستبعدة محفوظة على هذا الجهاز وحده، من دون حساب.</p>
        <ClearDataButton />
      </footer>
    </main>
  );
}
