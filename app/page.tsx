import { prisma } from "@/lib/prisma";
import Store, { type Product, type Look } from "./components/Store";

// No DATABASE_URL is configured at build time yet, so this page must not be
// prerendered — force it to render dynamically at request time.
export const dynamic = "force-dynamic";

export default async function Page() {
  const [rawProducts, rawLooks] = await Promise.all([
    prisma.product.findMany({ where: { published: true }, orderBy: { createdAt: "asc" } }),
    prisma.look.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const products: Product[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    desc: p.desc,
    material: p.material,
    price: p.price,
    offerPrice: p.offerPrice,
    sizes: p.sizes as string[],
    stock: p.stock as Record<string, number>,
    colors: p.colors as string[],
    img: p.img,
    imgPos: p.imgPos,
    published: p.published,
  }));

  const looks: Look[] = rawLooks.map((l) => ({
    id: l.id,
    name: l.name,
    productIds: l.productIds as string[],
    price: l.price,
  }));

  return <Store products={products} looks={looks} />;
}
