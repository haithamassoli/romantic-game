// Only here for the tab title; the game itself is a client page.
export const metadata = { title: "مسار الليلة — معًا" };

export default function Layout({ children }: LayoutProps<"/play/path">) {
  return children;
}
