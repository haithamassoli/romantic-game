import type { Metadata } from "next";
import { Amiri, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
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

export const metadata: Metadata = {
  // Absolute links for the share image: set SITE_URL to the public address.
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3100"),
  title: { default: "معًا — مساحة لكما وحدكما", template: "%s — معًا" },
  description:
    "أفكار وألعاب للحظات تجمعكما، تختارانها معًا وفق رغباتكما وحدودكما. للأزواج البالغين.",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
