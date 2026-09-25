import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sendNotice } from "@/lib/email";

function localStatus(status: Stripe.Subscription.Status) {
  if (status === "active" || status === "trialing") return "ACTIVE" as const;
  if (status === "past_due") return "PAST_DUE" as const;
  if (status === "incomplete") return "PENDING_PAYMENT" as const;
  if (status === "unpaid" || status === "incomplete_expired") return "UNPAID" as const;
  if (status === "canceled") return "CANCELED" as const;
  return null;
}

async function syncStripeSubscription(internalId: string, stripeSubId: string) {
  const current = await stripe!.subscriptions.retrieve(stripeSubId);
  const status = localStatus(current.status);
  await db.subscription.update({ where: { id: internalId }, data: {
    providerSubscriptionId: current.id,
    ...(status ? { status } : {}),
    currentPeriodStart: new Date(current.current_period_start * 1000),
    currentPeriodEnd: new Date(current.current_period_end * 1000),
    ...(status === "CANCELED" ? { canceledAt: current.canceled_at ? new Date(current.canceled_at * 1000) : new Date(), activeKey: null } : {}),
  } });
  return { status, current };
}

export async function POST(req: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  const body = await req.text(); const signature = req.headers.get("stripe-signature"); if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let event: Stripe.Event; try { event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET); } catch { return NextResponse.json({ error: "Invalid signature" }, { status: 400 }); }
  const object = event.data.object;
  let internalId = (object as { metadata?: { subscriptionId?: string } }).metadata?.subscriptionId;
  let stripeSubId: string | null = null;
  if (event.type.startsWith("checkout.session.")) { const value = (object as Stripe.Checkout.Session).subscription; stripeSubId = typeof value === "string" ? value : value?.id ?? null; }
  else if (event.type.startsWith("invoice.")) { const value = (object as Stripe.Invoice).subscription; stripeSubId = typeof value === "string" ? value : value?.id ?? null; }
  else if ("id" in object) stripeSubId = object.id;
  if (!internalId && typeof stripeSubId === "string") {
    internalId = (await db.subscription.findFirst({ where: { providerSubscriptionId: stripeSubId }, select: { id: true } }))?.id;
    if (!internalId) { try { internalId = (await stripe.subscriptions.retrieve(stripeSubId)).metadata.subscriptionId; } catch { /* Stripe can deliver unrelated events to a shared endpoint. */ } }
  }
  if (!internalId) { await db.processedWebhook.createMany({ data: { id: event.id }, skipDuplicates: true }); return NextResponse.json({ received: true }); }
  const existing = await db.subscription.findUnique({ where: { id: internalId }, include: { client: true } }); if (!existing) { await db.processedWebhook.createMany({ data: { id: event.id }, skipDuplicates: true }); return NextResponse.json({ received: true }); }
  const wasProcessed = await db.processedWebhook.findUnique({ where: { id: event.id }, select: { id: true } }); if (wasProcessed) return NextResponse.json({ received: true });
  if (event.type === "checkout.session.completed") {
    const session = object as Stripe.Checkout.Session;
    const id = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (id) await syncStripeSubscription(internalId, id);
  } else if (event.type === "checkout.session.expired") {
    await db.subscription.updateMany({ where: { id: internalId, status: "PENDING_PAYMENT" }, data: { status: "CANCELED", canceledAt: new Date(), activeKey: null } });
  } else if (event.type === "invoice.paid") {
    const invoice = object as Stripe.Invoice;
    if (typeof stripeSubId === "string") await syncStripeSubscription(internalId, stripeSubId);
    if (invoice.amount_paid > 0) await db.payment.createMany({ data: { subscriptionId: internalId, amountCents: invoice.amount_paid, status: "SUCCEEDED", providerChargeId: `invoice_${invoice.id}` }, skipDuplicates: true });
  } else if (event.type === "invoice.payment_failed") {
    const invoice = object as Stripe.Invoice;
    let currentStatus: ReturnType<typeof localStatus> = "PAST_DUE";
    if (typeof stripeSubId === "string") currentStatus = (await syncStripeSubscription(internalId, stripeSubId)).status;
    const inserted = await db.payment.createMany({ data: { subscriptionId: internalId, amountCents: invoice.amount_due, status: "FAILED", providerChargeId: `failure_${event.id}` }, skipDuplicates: true });
    if (inserted.count && (currentStatus === "PAST_DUE" || currentStatus === "UNPAID")) await sendNotice(existing.client.email, existing.client.preferredLanguage, "payment_failed").catch(() => {});
  } else if (event.type === "checkout.session.async_payment_failed") {
    const checkout = object as Stripe.Checkout.Session;
    let currentStatus: ReturnType<typeof localStatus> = "PAST_DUE";
    if (typeof stripeSubId === "string") currentStatus = (await syncStripeSubscription(internalId, stripeSubId)).status;
    const inserted = await db.payment.createMany({ data: { subscriptionId: internalId, amountCents: checkout.amount_total ?? 0, status: "FAILED", providerChargeId: `failure_${event.id}` }, skipDuplicates: true });
    if (inserted.count && (currentStatus === "PAST_DUE" || currentStatus === "UNPAID")) await sendNotice(existing.client.email, existing.client.preferredLanguage, "payment_failed").catch(() => {});
  } else if (event.type === "customer.subscription.updated") {
    const stripeSub = object as Stripe.Subscription;
    await syncStripeSubscription(internalId, stripeSub.id);
  } else if (event.type === "customer.subscription.deleted") {
    await db.subscription.update({ where: { id: internalId }, data: { status: "CANCELED", canceledAt: new Date(), activeKey: null } });
  }
  await db.processedWebhook.createMany({ data: { id: event.id }, skipDuplicates: true });
  return NextResponse.json({ received: true });
}
