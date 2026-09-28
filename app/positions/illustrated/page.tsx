import type { Metadata } from "next";
import Link from "next/link";
import { ILLUSTRATED } from "@/lib/illustrated";
import { CatalogGrid } from "../catalog/grid";

export const metadata: Metadata = {
  title: "وضعيات مصوّرة",
  alternates: { canonical: "/positions/illustrated" },
  description:
    "وضعيات جديدة للأزواج البالغين، لكل منها رسم وشرح وخطوات وملاحظات للراحة.",
};

export default function IllustratedPage() {
  return (
    <>
      <section className="wrap pos-intro" aria-labelledby="illustrated-title">
        <Link className="back-link" href="/positions">
          <span aria-hidden="true">→</span> دليل الوضعيات
        </Link>
        <h1 id="illustrated-title">وضعيات مصوّرة</h1>
        <p>
          {ILLUSTRATED.length} وضعية جمعناها من أدلة مرسومة، لكل منها شرح وخطوات
          وما يحتاجه الجسد. ابحثا بالاسم العربي أو الإنجليزي.
        </p>
        <p className="pos-consent">
          اتفقا على كلمة للتوقف قبل أن تبدآ، واجعلا المزلّق قريبًا. أي ألم يعني
          التوقف، لا المتابعة.
        </p>
      </section>
      <CatalogGrid
        base="/positions/illustrated"
        items={ILLUSTRATED.map(({ slug, name, englishName, imageUrl }) => ({
          slug,
          name,
          name_en: englishName,
          image: imageUrl,
        }))}
      />
    </>
  );
}
