import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db, syncExpiredCancellations } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { addUtcMonths } from "@/lib/dates";
import { locales } from "@/lib/i18n";
import { priceForHairLength } from "@/lib/pricing";

export async function POST(req: Request) {
  const form = await req.formData();
  const productId = String(form.get("productId") || ""); const storeId = String(form.get("storeId") || "");
  const hairLength = String(form.get("hairLength") || "SHORT"); const method = String(form.get("method") || "CASH");
  const rawLocale = String(form.get("locale") || "pt"); const locale = (locales as readonly string[]).includes(rawLocale) ? rawLocale : "pt";
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.redirect(new URL(`/${locale}/entrar`, req.url), 303);
  await syncExpiredCancellations();
  if (!["SHORT", "LONG"].includes(hairLength) || !["CASH", "STRIPE"].includes(method)) return NextResponse.json({ error: "Invalid selection" }, { status: 400 });

  const product = await db.product.findFirst({ where: { id: productId, isActive: true, stores: { some: { storeId } } }, include: { storePrices: { where: { storeId } } } });
  if (!product) return NextResponse.json({ error: "Membership unavailable" }, { status: 404 });
  const selectedPrice = priceForHairLength(product, product.storePrices[0], hairLength as "SHORT" | "LONG");
  if (method === "STRIPE" && (!stripe || selectedPrice <= 0)) return NextResponse.json({ error: "Online recurring payment is not configured for this membership yet." }, { status: 400 });

  const activeKey = `${session.id}:${productId}:${storeId}`;
  let subscription = await db.subscription.findUnique({ where: { activeKey } });
  if (subscription?.providerCheckoutSessionId && subscription.paymentMethod === "STRIPE" && stripe) {
    const checkout = await stripe.checkout.sessions.retrieve(subscription.providerCheckoutSessionId);
    if (checkout.status === "open" && checkout.url) return NextResponse.redirect(checkout.url, 303);
    if (checkout.status === "complete") return NextResponse.redirect(new URL(`/${locale}/conta?paid=success`, req.url), 303);
    await db.subscription.updateMany({ where: { id: subscription.id, status: "PENDING_PAYMENT" }, data: { status: "CANCELED", canceledAt: new Date(), activeKey: null } });
    subscription = null;
  }
  const canRetryCheckout = subscription?.status === "UNPAID" && subscription.paymentMethod === "STRIPE" && method === "STRIPE" && !subscription.providerSubscriptionId;
  if (subscription && !canRetryCheckout) return NextResponse.redirect(new URL(`/${locale}/conta?subscription=exists`, req.url), 303);
  if (canRetryCheckout && subscription) {
    if (!stripe) return NextResponse.redirect(new URL(`/${locale}/conta?paid=error`, req.url), 303);
    const client = await db.client.findUniqueOrThrow({ where: { id: session.id } });
    try {
      const checkout = await stripe.checkout.sessions.create({ mode: "subscription", payment_method_types: ["card", "sepa_debit"], customer_email: client.email, line_items: [{ price_data: { currency: "eur", unit_amount: subscription.priceCents, recurring: { interval: "month" }, product_data: { name: product.name } }, quantity: 1 }], metadata: { subscriptionId: subscription.id }, subscription_data: { metadata: { subscriptionId: subscription.id } }, success_url: `${process.env.APP_URL}/${locale}/conta?paid=success`, cancel_url: `${process.env.APP_URL}/api/stripe/checkout-canceled?session_id={CHECKOUT_SESSION_ID}&locale=${locale}` }, { idempotencyKey: `salon-checkout-${subscription.id}` });
      await db.subscription.update({ where: { id: subscription.id }, data: { status: "PENDING_PAYMENT", providerCheckoutSessionId: checkout.id } });
      return NextResponse.redirect(checkout.url!, 303);
    } catch { return NextResponse.redirect(new URL(`/${locale}/conta?paid=error`, req.url), 303); }
  }

  const now = new Date(); const end = addUtcMonths(now, 1);
  try {
    subscription = await db.subscription.create({ data: { clientId: session.id, productId, storeId, activeKey, hairLength: hairLength as "SHORT" | "LONG", priceCents: selectedPrice, paymentMethod: method as "CASH" | "STRIPE", status: "PENDING_PAYMENT", currentPeriodStart: now, currentPeriodEnd: end } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.redirect(new URL(`/${locale}/conta?subscription=exists`, req.url), 303);
    throw error;
  }
  if (method === "CASH") return NextResponse.redirect(new URL(`/${locale}/conta?cash=pending`, req.url), 303);
  const client = await db.client.findUniqueOrThrow({ where: { id: session.id } });
  try {
    const checkout = await stripe!.checkout.sessions.create({ mode: "subscription", payment_method_types: ["card", "sepa_debit"], customer_email: client.email, line_items: [{ price_data: { currency: "eur", unit_amount: selectedPrice, recurring: { interval: "month" }, product_data: { name: product.name } }, quantity: 1 }], metadata: { subscriptionId: subscription.id }, subscription_data: { metadata: { subscriptionId: subscription.id } }, success_url: `${process.env.APP_URL}/${locale}/conta?paid=success`, cancel_url: `${process.env.APP_URL}/api/stripe/checkout-canceled?session_id={CHECKOUT_SESSION_ID}&locale=${locale}` }, { idempotencyKey: `salon-checkout-${subscription.id}` });
    await db.subscription.update({ where: { id: subscription.id }, data: { providerCheckoutSessionId: checkout.id } });
    return NextResponse.redirect(checkout.url!, 303);
  } catch {
    await db.subscription.update({ where: { id: subscription.id }, data: { status: "UNPAID" } });
    return NextResponse.redirect(new URL(`/${locale}/conta?paid=error`, req.url), 303);
  }
}
