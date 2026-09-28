// Only here for the tab title and canonical link; the game itself is a client page.
export const metadata = {
  title: "مسار الليلة — معًا",
  alternates: { canonical: "/play/path" },
};

export default function Layout({ children }: LayoutProps<"/play/path">) {
  return children;
}
