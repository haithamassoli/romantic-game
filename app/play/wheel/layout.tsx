// Only here for the tab title and canonical link; the game itself is a client page.
export const metadata = {
  title: "عجلة الاختيار — معًا",
  alternates: { canonical: "/play/wheel" },
};

export default function Layout({ children }: LayoutProps<"/play/wheel">) {
  return children;
}
