import type { Metadata } from "next";
import { Amiri, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

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
  title: "معًا — مساحة لكما وحدكما",
  description:
    "أفكار وألعاب للحظات تجمعكما، تختارانها معًا وفق رغباتكما وحدودكما. للأزواج البالغين.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
