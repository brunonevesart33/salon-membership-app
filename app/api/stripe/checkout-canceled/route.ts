import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { locales } from "@/lib/i18n";
export async function GET(req: Request) {
  const url = new URL(req.url); const sessionId = url.searchParams.get("session_id"); const rawLocale = url.searchParams.get("locale") || "pt";
  const locale = (locales as readonly string[]).includes(rawLocale) ? rawLocale : "pt";
  const clientSession = await getSession();
  if (!clientSession || clientSession.role !== "CLIENT") return NextResponse.redirect(new URL(`/${locale}/entrar`, req.url), 303);
  if (stripe && sessionId) {
    const checkout = await stripe.checkout.sessions.retrieve(sessionId);
    const subscriptionId = checkout.metadata?.subscriptionId;
    const subscription = subscriptionId ? await db.subscription.findFirst({ where: { id: subscriptionId, clientId: clientSession.id } }) : null;
    if (subscription && checkout.status === "open") {
      await stripe.checkout.sessions.expire(sessionId);
      await db.subscription.updateMany({ where: { id: subscription.id, status: "PENDING_PAYMENT" }, data: { status: "CANCELED", canceledAt: new Date(), activeKey: null } });
    }
  }
  return NextResponse.redirect(new URL(`/${locale}/conta?paid=cancel`, req.url), 303);
}
