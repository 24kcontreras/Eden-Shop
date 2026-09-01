import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * El catálogo vive completo en la home (no hay una URL por producto), así que
 * el sitemap declara esa única página. No consulta la base de datos a propósito:
 * así se genera en el build aunque DATABASE_URL no esté disponible.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
