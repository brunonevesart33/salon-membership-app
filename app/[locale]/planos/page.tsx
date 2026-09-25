import Link from "next/link";
import { db } from "@/lib/db";
import { messages, productLabel } from "@/lib/i18n";
import { StoreSelect } from "@/components/StoreSelect";
export default async function Plans({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ store?: string }> }) {
  const { locale } = await params; const query = await searchParams; const t = messages(locale);
  const stores = await db.store.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const store = stores.find((s) => s.slug === query.store) ?? stores[0];
  const products = store ? await db.product.findMany({ where: { isActive: true, stores: { some: { storeId: store.id } } }, include: { storePrices: { where: { storeId: store.id } } }, orderBy: [{ category: "asc" }, { name: "asc" }] }) : [];
  const hair = products.filter((p) => p.category === "HAIRDRESSING"); const spa = products.filter((p) => p.category === "HEAD_SPA");
  const group = (title: string, items: typeof products) => <section className="section"><h2>{title}</h2><p className="sub">{t.long} · {t.short}</p><div className="grid">{items.map((p) => { const price = p.storePrices[0]?.monthlyPriceCents ?? p.monthlyPriceCents; return <article className="card" key={p.id}><span className="pill">{p.category === "HEAD_SPA" ? t.spa : t.hair}</span><h3>{productLabel(locale, p)}</h3><p>{p.maxPeople} {t.people}{p.sessionsPerMonth ? ` · ${p.sessionsPerMonth} ${t.sessions}` : ""}</p>{p.category === "HEAD_SPA" && p.maxPeople > 1 && <p className="sub">{t.familySessionsShared}</p>}{p.category === "HEAD_SPA" && <p className="sub">{t.sessionRollover}</p>}<div className="price">{price ? `€${(price / 100).toFixed(2)}` : t.placeholder}<small>{t.month}</small></div><Link className="btn" href={`/${locale}/aderir?product=${p.id}&store=${store?.slug}`}>{t.join}</Link></article>; })}</div></section>;
  return <main className="shell"><section className="hero"><div className="eyebrow">Jules Daynos · Algarve</div><h1>{t.tagline}</h1><div className="filters"><label htmlFor="store">{t.chooseStore}</label><StoreSelect stores={stores} selected={store?.slug} label={t.chooseStore}/></div></section>{group(t.hair, hair)}{group(t.spa, spa)}</main>;
}
