import type { Metadata, Viewport } from "next";
import { jsonLdScript } from "@/lib/seo";
import {
  BRAND_COLOR,
  INSTAGRAM_URL,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
  WHATSAPP_NUMBER,
} from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  // Base para que canonical, OG e imágenes se resuelvan como URLs absolutas.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Eden Shop — Tienda de ropa online en Chile con envíos a todo el país",
    template: "%s · Eden Shop",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "tienda de ropa online",
    "ropa mujer Chile",
    "moda online Chile",
    "comprar ropa por internet Chile",
    "envíos a todo Chile",
    "Eden Shop",
    "otoño invierno 2026",
    "ropa femenina",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "shopping",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: "/",
    title: "Eden Shop — Tienda de ropa online en Chile",
    description: SITE_DESCRIPTION,
    // Las imágenes las aporta app/opengraph-image.tsx automáticamente.
  },
  twitter: {
    card: "summary_large_image",
    title: "Eden Shop — Tienda de ropa online en Chile",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Pega el código de Google Search Console en GOOGLE_SITE_VERIFICATION.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  formatDetection: {
    telephone: true,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_COLOR,
  colorScheme: "light",
};

/**
 * Datos estructurados del negocio. Le dicen a Google que esto es una tienda
 * (no un blog), con qué contactarla y qué cuentas sociales son las oficiales.
 */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "@id": `${SITE_URL}/#store`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/eden-logo.png`,
  image: `${SITE_URL}/brand/eden-logo.png`,
  description: SITE_DESCRIPTION,
  slogan: "Eden Shop es chiquita, y así nos gusta",
  telephone: `+${WHATSAPP_NUMBER}`,
  sameAs: [INSTAGRAM_URL],
  areaServed: {
    "@type": "Country",
    name: "Chile",
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "CL",
  },
  currenciesAccepted: "CLP",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    telephone: `+${WHATSAPP_NUMBER}`,
    availableLanguage: ["Spanish"],
    areaServed: "CL",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  inLanguage: "es-CL",
  publisher: { "@id": `${SITE_URL}/#store` },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Italiana&family=Quicksand:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
      </head>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(websiteJsonLd),
          }}
        />
      </body>
    </html>
  );
}
