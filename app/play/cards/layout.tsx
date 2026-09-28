// Only here for the tab title and canonical link; the game itself is a client page.
export const metadata = {
  title: "بطاقات التحدي — معًا",
  alternates: { canonical: "/play/cards" },
};

export default function Layout({ children }: LayoutProps<"/play/cards">) {
  return children;
}
