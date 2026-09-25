import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { sendNotice } from "@/lib/email";
import { locales } from "@/lib/i18n";
export async function POST(req: Request) {
  const user = await getSession(); if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const form = await req.formData(); const id = String(form.get("id") || ""); const rawLocale = String(form.get("locale") || "pt"); const locale = (locales as readonly string[]).includes(rawLocale) ? rawLocale : "pt";
  const sub = await db.subscription.findUnique({ where: { id } });
  if (!sub || (user.role === "CLIENT" && sub.clientId !== user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sub.cancelAtPeriodEnd || sub.status === "CANCELED") return NextResponse.redirect(new URL(user.role === "ADMIN" ? "/admin" : `/${locale}/conta`, req.url), 303);
  if (sub.paymentMethod === "STRIPE" && sub.providerSubscriptionId && stripe && sub.currentPeriodEnd > new Date()) await stripe.subscriptions.update(sub.providerSubscriptionId, { cancel_at_period_end: true });
  const immediate = sub.currentPeriodEnd <= new Date();
  const changed = await db.subscription.updateMany({ where: { id, cancelAtPeriodEnd: false, status: { not: "CANCELED" } }, data: { cancelAtPeriodEnd: true, canceledAt: new Date(), ...(immediate ? { status: "CANCELED", activeKey: null } : {}) } });
  if (changed.count) { const client = await db.client.findUnique({ where: { id: sub.clientId }, select: { email: true, preferredLanguage: true } }); if (client) await sendNotice(client.email, client.preferredLanguage, "canceled").catch(() => {}); }
  return NextResponse.redirect(new URL(user.role === "ADMIN" ? "/admin" : `/${locale}/conta`, req.url), 303);
}
