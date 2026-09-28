import type { Metadata, Viewport } from "next";
import { Amiri, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "../lib/site";
import { Providers } from "./providers";

const display = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-display-face",
  display: "swap",
});

const sans = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans-face",
  display: "swap",
});

const description =
  "أفكار وألعاب للحظات تجمعكما، تختارانها معًا وفق رغباتكما وحدودكما. للأزواج البالغين.";

export const metadata: Metadata = {
  // Absolute links for share images, canonical, and the sitemap.
  metadataBase: new URL(SITE_URL),
  title: { default: "معًا — مساحة لكما وحدكما", template: "%s — معًا" },
  description,
  applicationName: "معًا",
  openGraph: {
    type: "website",
    siteName: "معًا",
    locale: "ar_AR",
  },
  twitter: { card: "summary_large_image" },
  // Tells SafeSearch this is adult content, so it is only shown to adults.
  other: { rating: "adult" },
};

// Outside the age gate, so crawlers read it in the first HTML.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "معًا",
  url: SITE_URL,
  inLanguage: "ar",
  isFamilyFriendly: false,
};

export const viewport: Viewport = {
  themeColor: "#110c10",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
