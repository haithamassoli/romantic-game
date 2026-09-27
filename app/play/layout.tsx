import type { Metadata } from "next";
import Link from "next/link";
import { ClearDataButton } from "../providers";
import { EndSession, NeedsLimits, Session } from "./session";

export const metadata: Metadata = {
  title: "العبا معًا — معًا",
  description:
    "بطاقات وعجلة ومكتبة تحديات لزوجين بالغين، لا يظهر فيها إلا ما يقبله كلاكما.",
};

export default function PlayLayout({ children }: LayoutProps<"/play">) {
  return (
    <Session>
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
          <EndSession />
        </header>
        <NeedsLimits>{children}</NeedsLimits>
        <footer className="site-footer wrap">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              ✳
            </span>
            معًا
          </Link>
          <p>
            حدودكما لا تُحفظ ولا تُرسل، وتُمحى بإنهاء الجلسة أو إغلاق الصفحة. يبقى
            على هذا الجهاز تفضيل المؤقت فقط.
          </p>
          <ClearDataButton />
        </footer>
      </main>
    </Session>
  );
}
