// Only here for the tab title and canonical link; the game itself is a client page.
export const metadata = {
  title: "توافق الرغبات — معًا",
  alternates: { canonical: "/play/desires" },
};

export default function Layout({ children }: LayoutProps<"/play/desires">) {
  return children;
}
