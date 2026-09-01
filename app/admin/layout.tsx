import type { Metadata } from "next";

// El panel es privado: aunque robots.txt ya lo excluye, esta cabecera evita
// que se indexe si alguien llega por un enlace externo.
export const metadata: Metadata = {
  title: "Panel",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
