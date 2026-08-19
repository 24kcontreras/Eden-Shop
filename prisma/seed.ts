import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    id: "chenille",
    name: "Conjunto Chenille",
    desc: "Sweater cuello tortuga + pantalón wide leg. Suavecito, abrigado y combina con todo.",
    material: "50% acrílico · 30% lana · 20% nylon. Tejido grueso con trenzas, no pica.",
    price: 9990,
    offerPrice: null,
    sizes: ["Estándar"],
    stock: { Estándar: 4 },
    colors: ["#C1194F", "#A9A19B", "#93A6C6", "#6E7A5A", "#232323", "#8B4A22", "#CBB09A"],
    img: "/products/chenille.jpg",
    imgPos: "center 30%",
    published: true,
  },
  {
    id: "body",
    name: "Body Cruzado",
    desc: "Escote cruzado off-shoulder, tela con caída y súper elástica. Tu carta ganadora de la noche.",
    material: "92% poliéster · 8% elastano. Tela suave con caída y harto elástico.",
    price: 6990,
    offerPrice: 5490,
    sizes: ["S", "M", "L"],
    stock: { S: 2, M: 4, L: 0 },
    colors: ["#E8A6BE", "#F5F3F0", "#1A1A1A", "#C6AB7E"],
    img: "/products/body-aura.jpg",
    imgPos: "center 24%",
    published: true,
  },
  {
    id: "flare",
    name: "Flare Jeans Beige",
    desc: "Tiro alto y corte flare que estiliza sin esfuerzo. El beige que reemplaza al negro.",
    material: "98% algodón · 2% elastano. Denim firme, cede un poquito con el uso.",
    price: 12990,
    offerPrice: null,
    sizes: ["36", "38", "40", "42", "44", "46"],
    stock: { "36": 1, "38": 3, "40": 2, "42": 0, "44": 2, "46": 1 },
    colors: [],
    img: "/products/flare-beige.jpg",
    imgPos: "center 42%",
    published: true,
  },
  {
    id: "trento",
    name: "Pantalón Trento",
    desc: "Knit tailoring con cinturón incluido. Se ve formal, se siente pijama.",
    material: "65% poliéster · 33% viscosa · 2% elastano. Paño liviano que no se arruga.",
    price: 7500,
    offerPrice: null,
    sizes: ["Estándar"],
    stock: { Estándar: 2 },
    colors: ["#F0EAE0", "#B7B4B0", "#1B1B20"],
    img: "/products/trento.jpg",
    imgPos: "center 45%",
    published: true,
  },
];

const looks = [
  { id: "l1", name: "El look completo", productIds: ["body", "flare"], price: 17900 },
  { id: "l2", name: "Domingo en casa", productIds: ["chenille"], price: 8990 },
];

async function main() {
  for (const p of products) {
    await prisma.product.upsert({ where: { id: p.id }, create: p, update: p });
  }
  for (const l of looks) {
    await prisma.look.upsert({ where: { id: l.id }, create: l, update: l });
  }
  console.log(`Seed listo: ${products.length} productos, ${looks.length} looks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
