import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { api } from "@/convex/_generated/api";

// The page renders on the client; this gives shared links and crawlers its name.
export async function generateMetadata({
  params,
}: LayoutProps<"/positions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const position = await fetchQuery(api.positions.get, { slug });
  if (!position) return { robots: { index: false } };
  return {
    title: `${position.name} — دليل الوضعيات — معًا`,
    description: position.summary,
    alternates: { canonical: `/positions/${slug}` },
  };
}

export default function Layout({ children }: LayoutProps<"/positions/[slug]">) {
  return children;
}
