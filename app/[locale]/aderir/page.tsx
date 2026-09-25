import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { messages, productLabel } from "@/lib/i18n";
export default async function Join({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ product?: string; store?: string }> }) {
  const { locale } = await params; const q = await searchParams; const t = messages(locale); const user = await getSession();
  const store = await db.store.findUnique({ where: { slug: q.store || "portimao" } });
  const product = q.product && store ? await db.product.findFirst({ where: { id: q.product, stores: { some: { storeId: store.id } } }, include: { storePrices: { where: { storeId: store.id } } } }) : null;
  if (!user || user.role !== "CLIENT") return <main className="shell"><section className="formcard"><h1>{t.join}</h1><p>{t.signIn} {t.hasAccount}</p><Link className="btn" href={`/${locale}/entrar?product=${q.product}&store=${q.store}`}>{t.login}</Link><p className="sub">{t.noAccount}</p><Link href={`/${locale}/registar?product=${q.product}&store=${q.store}`}>{t.register}</Link></section></main>;
  if (!product || !store) return <main className="shell"><section className="formcard"><h1>{t.error}</h1><Link href={`/${locale}/planos`}>{t.learnMore}</Link></section></main>;
  const price = product.storePrices[0]?.monthlyPriceCents ?? product.monthlyPriceCents;
  return <main className="shell"><section className="formcard"><div className="eyebrow">{store.name}</div><h1>{productLabel(locale, product)}</h1>{product.category === "HEAD_SPA" && product.maxPeople > 1 && <p className="sub">{t.familySessionsShared}</p>}{product.category === "HEAD_SPA" && <p className="sub">{t.sessionRollover}</p>}<p className="price">{price > 0 ? `€${(price / 100).toFixed(2)}` : t.placeholder}<small>{t.month}</small></p>{product.longDiscountPercent > 0 && <div className="notice">{t.long}: {product.longDiscountPercent}%</div>}
    <form action="/api/subscribe" method="post"><input type="hidden" name="productId" value={product.id}/><input type="hidden" name="storeId" value={store.id}/><input type="hidden" name="locale" value={locale}/><div className="field"><label>{t.long} / {t.short}</label><select name="commitment"><option value="SHORT">{t.short}</option><option value="LONG">{t.long}{product.longDiscountPercent > 0 ? ` · ${product.longDiscountPercent}%` : ""}</option></select></div><div className="field"><label>{t.payment}</label><select name="method"><option value="CASH">{t.cash}</option><option value="STRIPE" disabled={price <= 0 || process.env.STRIPE_BILLING_ENABLED !== "true" || !process.env.STRIPE_SECRET_KEY}>{t.stripe}</option></select></div><button className="btn" type="submit">{t.join}</button></form>
  </section></main>;
}
