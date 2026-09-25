import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { locales } from "@/lib/i18n";

async function openPortal(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.redirect(new URL("/pt/entrar", req.url), 303);
  if (!stripe) return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  const form = req.method === "POST" ? await req.formData() : null;
  const id = String(form?.get("id") || ""); const rawLocale = String(form?.get("locale") || "pt");
  const locale = (locales as readonly string[]).includes(rawLocale) ? rawLocale : "pt";
  const subscription = await db.subscription.findFirst({ where: { id, clientId: session.id, paymentMethod: "STRIPE", providerSubscriptionId: { not: null } } });
  if (!subscription?.providerSubscriptionId) return NextResponse.redirect(new URL(`/${locale}/conta?payment=unavailable`, req.url), 303);
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.providerSubscriptionId);
  const customerId = typeof stripeSubscription.customer === "string" ? stripeSubscription.customer : stripeSubscription.customer.id;
  const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${process.env.APP_URL}/${locale}/conta` });
  return NextResponse.redirect(portal.url, 303);
}

export async function POST(req: Request) { return openPortal(req); }
