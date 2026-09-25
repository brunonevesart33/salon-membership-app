import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { messages } from "@/lib/i18n";

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session || session.role !== "ADMIN") redirect("/pt/entrar?admin=1");
  const { id } = await params; const t = messages("pt");
  const client = await db.client.findUnique({
    where: { id },
    include: { homeStore: true, subscriptions: { include: { store: true, product: true, payments: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" } } },
  });
  if (!client) notFound();
  const payments = client.subscriptions.flatMap((sub) => sub.payments.map((payment) => ({ ...payment, productName: sub.product.name, storeName: sub.store.name }))).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return <main className="shell dashboard"><Link href="/admin">← {t.subscribers}</Link><div className="eyebrow" style={{ marginTop: 28 }}>{client.homeStore.name}</div><h1 className="page-title">{client.name}</h1><p>{client.email} · {client.phone}</p><p className="sub">Idioma: {client.preferredLanguage.toUpperCase()} · Registado: {client.createdAt.toLocaleDateString("pt-PT")}</p>
    <h2>Subscrições</h2><div className="grid">{client.subscriptions.map((sub) => <article className="card" key={sub.id}><span className="pill">{sub.status}</span><h3>{sub.product.name}</h3><p>{sub.store.name} · {sub.commitment} · €{(sub.priceCents / 100).toFixed(2)}/mês</p><p>Método: {sub.paymentMethod} · Próximo fim de período: {sub.currentPeriodEnd.toLocaleDateString("pt-PT")}</p>{!sub.cancelAtPeriodEnd && sub.status !== "CANCELED" && <form action="/api/subscriptions/cancel" method="post"><input type="hidden" name="id" value={sub.id}/>{sub.commitmentEndsAt && sub.commitmentEndsAt > new Date() && <div className="notice">{t.longWarning} · {sub.commitmentEndsAt.toLocaleDateString("pt-PT")}</div>}<button className="btn secondary">Cancelar no fim do período</button></form>}</article>)}</div>
    <h2 style={{ marginTop: 38 }}>Histórico de pagamentos</h2><div className="tablewrap"><table><thead><tr><th>Data</th><th>Plano</th><th>Loja</th><th>Valor</th><th>Estado</th><th>Referência</th><th>Exportado</th></tr></thead><tbody>{payments.map((p) => <tr key={p.id}><td>{p.createdAt.toLocaleDateString("pt-PT")}</td><td>{p.productName}</td><td>{p.storeName}</td><td>€{(p.amountCents / 100).toFixed(2)}</td><td>{p.status}</td><td>{p.providerChargeId || "—"}</td><td>{p.exportedToInvoicing ? "Sim" : "Não"}</td></tr>)}</tbody></table>{!payments.length && <p className="empty">Sem pagamentos registados.</p>}</div>
  </main>;
}
