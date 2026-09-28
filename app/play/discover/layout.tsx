// Only here for the tab title and canonical link; the game itself is a client page.
export const metadata = {
  title: "اكتشاف الوضعيات — معًا",
  alternates: { canonical: "/play/discover" },
};

export default function Layout({ children }: LayoutProps<"/play/discover">) {
  return children;
}
