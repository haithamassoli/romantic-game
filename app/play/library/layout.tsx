// Only here for the tab title and canonical link; the game itself is a client page.
export const metadata = {
  title: "مكتبة التحديات — معًا",
  alternates: { canonical: "/play/library" },
};

export default function Layout({ children }: LayoutProps<"/play/library">) {
  return children;
}
