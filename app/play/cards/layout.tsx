// Only here for the tab title; the game itself is a client page.
export const metadata = { title: "بطاقات التحدي — معًا" };

export default function Layout({ children }: LayoutProps<"/play/cards">) {
  return children;
}
