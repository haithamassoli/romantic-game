import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "إدارة المحتوى",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main>
      <div className="grain" aria-hidden="true" />
      <header className="site-header wrap">
        <Link className="brand" href="/" aria-label="معًا، الصفحة الرئيسية">
          <span className="brand-mark" aria-hidden="true" />
          معًا
        </Link>
        <span className="adult-note">إدارة المحتوى</span>
      </header>
      {children}
    </main>
  );
}
