import Link from "next/link";
import { redirect } from "next/navigation";
import { db, syncExpiredCancellations } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { messages, productLabel } from "@/lib/i18n";
export default async function Account({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ cash?: string; paid?: string; payment?: string; subscription?: string; password?: string }> }) {
  const { locale } = await params; const q = await searchParams; const t = messages(locale); const user = await getSession();
  if (!user || user.role !== "CLIENT") redirect(`/${locale}/entrar`);
  await syncExpiredCancellations();
  const client = await db.client.findUnique({
    where: { id: user.id },
    include: { subscriptions: { include: { product: true, store: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!client) redirect(`/${locale}/entrar`);
  return <main className="shell dashboard"><div className="eyebrow">{client.name}</div><h1 className="page-title">{t.account}</h1>
    {q.cash === "pending" && <div className="notice">{t.pending}</div>}{q.paid === "success" && <div className="notice">{t.success}</div>}{q.paid === "error" && <div className="notice">{t.error}</div>}{q.subscription === "exists" && <div className="notice">{t.error}</div>}{q.payment === "unavailable" && <div className="notice">{t.error}</div>}{q.password === "success" && <div className="notice">{t.success}</div>}{q.password === "error" && <div className="notice">{t.error}</div>}
    <div className="grid">{client.subscriptions.map((s) => <article className="card" key={s.id}>
      <span className="pill">{s.status === "ACTIVE" ? t.active : s.status === "PAST_DUE" ? t.pastDue : s.status === "UNPAID" ? t.unpaid : s.status === "CANCELED" ? t.canceled : t.pending}</span>
      <h3>{productLabel(locale, s.product)}</h3><p>{s.store.name} · {s.commitment === "LONG" ? t.long : t.short}</p><p>{s.priceCents > 0 ? `€${(s.priceCents / 100).toFixed(2)}` : t.placeholder}{t.month}</p>
      {(s.status === "PAST_DUE" || s.status === "UNPAID") && s.paymentMethod === "STRIPE" && s.providerSubscriptionId && <form action="/api/stripe/portal" method="post" style={{ marginBottom: 12 }}><input type="hidden" name="id" value={s.id}/><input type="hidden" name="locale" value={locale}/><button className="btn" type="submit">{t.updatePayment}</button></form>}
      {s.cancelAtPeriodEnd ? <p>{t.cancel} · {s.currentPeriodEnd.toLocaleDateString(locale)}</p> : s.status !== "CANCELED" && <form action="/api/subscriptions/cancel" method="post"><input type="hidden" name="id" value={s.id}/><input type="hidden" name="locale" value={locale}/>{s.commitmentEndsAt && s.commitmentEndsAt > new Date() && <div className="notice">{t.longWarning} · {s.commitmentEndsAt.toLocaleDateString(locale)}</div>}<button className="btn secondary" type="submit">{t.cancel}</button></form>}
    </article>)}</div>
    {client.subscriptions.length === 0 && <p className="empty">{t.learnMore} · <Link href={`/${locale}/planos`}>{t.join}</Link></p>}
    <section className="section"><h2>{t.password}</h2><form action="/api/auth/password" method="post" className="card" style={{ maxWidth: 460, minHeight: 0 }}><input type="hidden" name="locale" value={locale}/><div className="field"><label>{t.password}</label><input name="currentPassword" type="password" required/></div><div className="field"><label>{t.password} (10+)</label><input name="newPassword" type="password" minLength={10} required/></div><button className="btn" type="submit">{t.password}</button></form></section>
    <form action="/api/auth/logout" method="post" style={{ marginTop: 28 }}><button className="btn secondary">{t.logout}</button></form>
  </main>;
}
