import { prisma } from "@/lib/prisma";
import AdminPanel, { type Product, type Look, type Order } from "./AdminPanel";

// No DATABASE_URL is configured at build time yet, so this page must not be
// prerendered — force it to render dynamically at request time.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [rawProducts, rawLooks, rawOrders, settings] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.look.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.settings.upsert({ where: { id: "singleton" }, create: {}, update: {} }),
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

  const orders: Order[] = rawOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    items: o.items as Order["items"],
    total: o.total,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <AdminPanel
      initialProducts={products}
      initialLooks={looks}
      initialOrders={orders}
      initialTickerText={settings.tickerText}
    />
  );
}
