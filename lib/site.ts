/**
 * Datos del sitio usados por el SEO (metadata, sitemap, robots, JSON-LD).
 *
 * La URL sale de NEXT_PUBLIC_SITE_URL para que preview y producción no compartan
 * el mismo canonical. En Vercel, VERCEL_PROJECT_PRODUCTION_URL se completa sola.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "https://www.edenshop.cl";
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "Eden Shop";

export const SITE_DESCRIPTION =
  "Tienda de ropa online en Chile. Prendas seleccionadas de a poco, con medidas reales y stock real. Envíos express en 24 a 48 horas por Starken y Bluexpress a todo el país.";

/** Texto corto para el hero del OG image y el manifest. */
export const SITE_TAGLINE = "Tu ropa favorita, envíos a todo Chile";

export const SITE_LOCALE = "es_CL";

export const INSTAGRAM_URL = "https://www.instagram.com/eden.shop._";

/** Fallback: la fuente real del número es Settings.whatsappNumber en la base de datos. */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "56946312281";

export const BRAND_COLOR = "#B25C71";
export const BRAND_BACKGROUND = "#FDF7F5";

/** Convierte una ruta relativa (o una URL ya absoluta) en URL absoluta para JSON-LD y OG. */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
