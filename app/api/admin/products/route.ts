import { NextResponse } from "next/server";
import { Category } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
export async function POST(req: Request) {
  const user = await getSession(); if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const form = await req.formData(); const id = String(form.get("id") || "").trim(); const name = String(form.get("name") || "").trim(); const priceShort = Number(form.get("monthlyPriceCentsShort")); const priceLong = Number(form.get("monthlyPriceCentsLong")); const description = String(form.get("description") || "").trim();
  if (!name || !Number.isSafeInteger(priceShort) || priceShort < 0 || !Number.isSafeInteger(priceLong) || priceLong < 0 || !description) return NextResponse.json({ error: "Invalid product details" }, { status: 400 });
  const stores = await db.store.findMany({ where: { isActive: true } }); const selected = stores.filter((s) => form.getAll("storeIds").includes(s.id));
  if (!selected.length) return NextResponse.json({ error: "Select at least one salon" }, { status: 400 });
  const category = String(form.get("category") || "HAIRDRESSING"); const sessions = Number(form.get("sessionsPerMonth") || 0); const people = Number(form.get("maxPeople") || 1);
  if (!Number.isInteger(people) || people < 1 || people > 4 || (category === "HEAD_SPA" && (!Number.isInteger(sessions) || sessions < 1 || sessions > 4))) return NextResponse.json({ error: "Invalid people or session count" }, { status: 400 });
  const data = { name, description, monthlyPriceCentsShort: priceShort, monthlyPriceCentsLong: priceLong, maxPeople: people, category: category === "HEAD_SPA" ? Category.HEAD_SPA : Category.HAIRDRESSING, sessionsPerMonth: category === "HEAD_SPA" ? sessions : null, isActive: form.get("isActive") === "on" };
  const overrides = selected.map((store) => ({
    store,
    rawShort: String(form.get(`storePriceShort_${store.id}`) || "").trim(),
    rawLong: String(form.get(`storePriceLong_${store.id}`) || "").trim(),
  })).filter((item) => item.rawShort !== "" || item.rawLong !== "").map((item) => ({
    store: item.store,
    centsShort: item.rawShort === "" ? null : Number(item.rawShort),
    centsLong: item.rawLong === "" ? null : Number(item.rawLong),
  }));
  if (overrides.some(({ centsShort, centsLong }) => (centsShort !== null && (!Number.isSafeInteger(centsShort) || centsShort < 0)) || (centsLong !== null && (!Number.isSafeInteger(centsLong) || centsLong < 0)))) return NextResponse.json({ error: "Invalid salon price" }, { status: 400 });
  if (id) {
    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data });
      await tx.productStore.deleteMany({ where: { productId: id } });
      await tx.productStore.createMany({ data: selected.map((store) => ({ productId: id, storeId: store.id })) });
      await tx.planStorePrice.deleteMany({ where: { productId: id, storeId: { notIn: selected.map((store) => store.id) } } });
      await tx.planStorePrice.deleteMany({ where: { productId: id, storeId: { in: selected.map((store) => store.id), notIn: overrides.map(({ store }) => store.id) } } });
      for (const { store, centsShort, centsLong } of overrides) await tx.planStorePrice.upsert({ where: { productId_storeId: { productId: id, storeId: store.id } }, update: { monthlyPriceCentsShort: centsShort, monthlyPriceCentsLong: centsLong }, create: { productId: id, storeId: store.id, monthlyPriceCentsShort: centsShort, monthlyPriceCentsLong: centsLong } });
    });
  } else {
    await db.product.create({ data: { ...data, stores: { create: selected.map((store) => ({ storeId: store.id })) }, storePrices: { create: overrides.map(({ store, centsShort, centsLong }) => ({ storeId: store.id, monthlyPriceCentsShort: centsShort, monthlyPriceCentsLong: centsLong })) } } });
  }
  return NextResponse.redirect(new URL("/admin/planos", req.url), 303);
}
