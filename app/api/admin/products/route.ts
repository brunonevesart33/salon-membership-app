import { NextResponse } from "next/server";
import { Category } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
export async function POST(req: Request) {
  const user = await getSession(); if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const form = await req.formData(); const id = String(form.get("id") || "").trim(); const name = String(form.get("name") || "").trim(); const price = Number(form.get("monthlyPriceCents")); const description = String(form.get("description") || "").trim(); const longDiscountPercent = Number(form.get("longDiscountPercent") || 0);
  if (!name || !Number.isSafeInteger(price) || price < 0 || !description || !Number.isInteger(longDiscountPercent) || longDiscountPercent < 0 || longDiscountPercent > 100) return NextResponse.json({ error: "Invalid product details" }, { status: 400 });
  const stores = await db.store.findMany({ where: { isActive: true } }); const selected = stores.filter((s) => form.getAll("storeIds").includes(s.id));
  if (!selected.length) return NextResponse.json({ error: "Select at least one salon" }, { status: 400 });
  const category = String(form.get("category") || "HAIRDRESSING"); const sessions = Number(form.get("sessionsPerMonth") || 0); const people = Number(form.get("maxPeople") || 1);
  if (!Number.isInteger(people) || people < 1 || people > 4 || (category === "HEAD_SPA" && (!Number.isInteger(sessions) || sessions < 1 || sessions > 4))) return NextResponse.json({ error: "Invalid people or session count" }, { status: 400 });
  const data = { name, description, monthlyPriceCents: price, longDiscountPercent, maxPeople: people, category: category === "HEAD_SPA" ? Category.HEAD_SPA : Category.HAIRDRESSING, sessionsPerMonth: category === "HEAD_SPA" ? sessions : null, isActive: form.get("isActive") === "on" };
  const overrides = selected.map((store) => ({ store, raw: String(form.get(`storePrice_${store.id}`) || "").trim() })).filter((item) => item.raw !== "").map((item) => ({ ...item, cents: Number(item.raw) }));
  if (overrides.some(({ cents }) => !Number.isSafeInteger(cents) || cents < 0)) return NextResponse.json({ error: "Invalid salon price" }, { status: 400 });
  if (id) {
    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data });
      await tx.productStore.deleteMany({ where: { productId: id } });
      await tx.productStore.createMany({ data: selected.map((store) => ({ productId: id, storeId: store.id })) });
      await tx.planStorePrice.deleteMany({ where: { productId: id, storeId: { notIn: selected.map((store) => store.id) } } });
      await tx.planStorePrice.deleteMany({ where: { productId: id, storeId: { in: selected.map((store) => store.id), notIn: overrides.map(({ store }) => store.id) } } });
      for (const { store, cents } of overrides) await tx.planStorePrice.upsert({ where: { productId_storeId: { productId: id, storeId: store.id } }, update: { monthlyPriceCents: cents }, create: { productId: id, storeId: store.id, monthlyPriceCents: cents } });
    });
  } else {
    await db.product.create({ data: { ...data, stores: { create: selected.map((store) => ({ storeId: store.id })) }, storePrices: { create: overrides.map(({ store, cents }) => ({ storeId: store.id, monthlyPriceCents: cents })) } } });
  }
  return NextResponse.redirect(new URL("/admin/planos", req.url), 303);
}
