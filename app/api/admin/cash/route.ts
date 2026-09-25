import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { addUtcMonths } from "@/lib/dates";
export async function POST(req: Request) {
  const user = await getSession(); if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const form = await req.formData(); const id = String(form.get("id") || "");
  const sub = await db.subscription.findUnique({ where: { id } });
  if (!sub || sub.paymentMethod !== "CASH" || !["PENDING_PAYMENT", "ACTIVE"].includes(sub.status) || (sub.status === "ACTIVE" && sub.currentPeriodEnd > new Date())) return NextResponse.json({ error: "Payment cannot be confirmed" }, { status: 400 });
  const amount = sub.priceCents;
  if (amount <= 0) return NextResponse.json({ error: "Set a confirmed price before recording this payment" }, { status: 409 });
  const now = new Date(); const end = addUtcMonths(now, 1);
  await db.$transaction(async (tx) => {
    const changed = await tx.subscription.updateMany({ where: { id, status: sub.status, ...(sub.status === "ACTIVE" ? { currentPeriodEnd: { lte: now } } : {}) }, data: { status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: end } });
    if (!changed.count) throw new Error("Already confirmed");
    await tx.payment.create({ data: { subscriptionId: id, amountCents: amount, status: "MANUAL_CASH", recordedByAdminId: user.id } });
  });
  return NextResponse.redirect(new URL("/admin", req.url), 303);
}
