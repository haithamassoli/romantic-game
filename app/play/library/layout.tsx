// Only here for the tab title; the game itself is a client page.
export const metadata = { title: "مكتبة التحديات — معًا" };

export default function Layout({ children }: LayoutProps<"/play/library">) {
  return children;
}
