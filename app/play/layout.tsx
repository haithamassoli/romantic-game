import type { Metadata } from "next";
import Link from "next/link";
import { ClearDataButton } from "../providers";
import { NeedsLimits, PairBar } from "./pair";
import { EndSession, Session } from "./session";

export const metadata: Metadata = {
  title: "العبا معًا — معًا",
  description:
    "بطاقات وعجلة وتوافق رغبات ووضعيات ومسار لليلة لزوجين بالغين، لا يظهر فيها إلا ما يقبله كلاكما.",
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
        <PairBar />
        <NeedsLimits>{children}</NeedsLimits>
        <footer className="site-footer wrap">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              ✳
            </span>
            معًا
          </Link>
          <p>
            على جهاز واحد لا تُحفظ حدودكما واختياراتكما ولا تُرسل، وتُمحى بإنهاء
            الجلسة أو إغلاق الصفحة. على هاتفين تبقى في جلستكما على الخادم لا
            يراها الطرف الآخر، وتُحذف بإنهاء الجلسة أو بعد يوم بلا نشاط. يبقى على
            هذا الجهاز تفضيل المؤقت وخطوات مسار الليلة التي أنهيتماها فقط.
          </p>
          <ClearDataButton />
        </footer>
      </main>
    </Session>
  );
}
