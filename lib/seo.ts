import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

/** Forma mínima de producto que necesitan los datos estructurados. */
export interface SeoProduct {
  id: string;
  name: string;
  desc: string;
  material: string;
  price: number;
  offerPrice: number | null;
  sizes: string[];
  stock: Record<string, number>;
  colors: string[];
  img: string;
}

/**
 * Cada producto del catálogo como schema.org/Product dentro de un ItemList.
 * Es lo que permite que Google muestre precio y disponibilidad en los resultados.
 */
export function buildCatalogJsonLd(products: SeoProduct[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Catálogo ${SITE_NAME}`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => {
      const stockTotal = Object.values(p.stock ?? {}).reduce(
        (sum, n) => sum + (typeof n === "number" ? n : 0),
        0
      );
      const price = p.offerPrice ?? p.price;
      const url = `${SITE_URL}/#producto-${p.id}`;

      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          "@id": url,
          name: p.name,
          description: p.desc,
          image: [absoluteUrl(p.img)],
          url,
          sku: p.id,
          ...(p.material ? { material: p.material } : {}),
          ...(p.colors?.length ? { color: p.colors.join(", ") } : {}),
          ...(p.sizes?.length ? { size: p.sizes } : {}),
          brand: { "@type": "Brand", name: SITE_NAME },
          offers: {
            "@type": "Offer",
            url,
            price,
            priceCurrency: "CLP",
            availability:
              stockTotal > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@id": `${SITE_URL}/#store` },
          },
        },
      };
    }),
  };
}

/** Serializa JSON-LD escapando `<` para evitar inyección de HTML. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
