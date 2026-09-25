import { PrismaClient, Category } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const stores = await Promise.all([
    prisma.store.upsert({ where: { slug: "portimao" }, update: {}, create: { slug: "portimao", name: "Portimão" } }),
    prisma.store.upsert({ where: { slug: "tavira" }, update: {}, create: { slug: "tavira", name: "Tavira" } }),
  ]);
  const products = [
    ...["Pro", "Pro+", "Premium", "Family"].map((name, i) => ({ category: Category.HAIRDRESSING, name, description: `Hair membership · ${i === 3 ? "up to 4 people" : "1 person"}`, monthlyPriceCents: 0, maxPeople: i === 3 ? 4 : 1, sessionsPerMonth: null })),
    ...[1, 2, 3, 4].flatMap((n) => [
      { category: Category.HEAD_SPA, name: `Head Spa ${n}x · Individual`, description: `${n} session${n > 1 ? "s" : ""} per month`, monthlyPriceCents: 0, maxPeople: 1, sessionsPerMonth: n },
      { category: Category.HEAD_SPA, name: `Head Spa ${n}x · Family`, description: `${n} shared session${n > 1 ? "s" : ""} per month · up to 4 people`, monthlyPriceCents: 0, maxPeople: 4, sessionsPerMonth: n },
    ]),
  ];
  for (const product of products) {
    const found = await prisma.product.findFirst({ where: { name: product.name, category: product.category } });
    const saved = found ?? await prisma.product.create({ data: product });
    for (const store of stores) await prisma.productStore.upsert({ where: { productId_storeId: { productId: saved.id, storeId: store.id } }, update: {}, create: { productId: saved.id, storeId: store.id } });
  }
  const emails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const password = process.env.ADMIN_PASSWORD;
  if (emails.length && password && password !== "change-this-before-first-run") {
    for (const [index, email] of emails.entries()) await prisma.adminUser.upsert({ where: { email }, update: {}, create: { email, passwordHash: await bcrypt.hash(password, 12), name: `Salon manager ${index + 1}` } });
  }
}
main().finally(() => prisma.$disconnect());
