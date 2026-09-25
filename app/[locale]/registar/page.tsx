import { db } from "@/lib/db";
import { messages, locales } from "@/lib/i18n";
export default async function Register({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ product?: string; store?: string; error?: string }> }) {
  const { locale } = await params; const q = await searchParams; const t = messages(locale); const stores = await db.store.findMany({ where: { isActive: true } }); const store = stores.find((s) => s.slug === q.store) ?? stores[0];
  return <main className="shell"><section className="formcard"><div className="eyebrow">Jules Daynos</div><h1>{t.register}</h1>{q.error && <div className="notice">{t.error}</div>}
    <form action="/api/auth/register" method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="product" value={q.product || ""}/><input type="hidden" name="store" value={q.store || ""}/>
      <div className="field"><label>{t.name}</label><input name="name" autoComplete="name" maxLength={120} required/></div>
      <div className="field"><label>{t.email}</label><input name="email" type="email" autoComplete="email" maxLength={254} required/></div>
      <div className="field"><label>{t.phone}</label><input name="phone" type="tel" autoComplete="tel" maxLength={40} required/></div>
      <div className="field"><label>{t.password} (10–72 bytes)</label><input name="password" type="password" minLength={10} maxLength={72} autoComplete="new-password" required/></div>
      <div className="field"><label>{t.chooseStore}</label><select name="storeId" defaultValue={store?.id} required>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <div className="field"><label>{t.language}</label><select name="preferredLanguage" defaultValue={locale}>{locales.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select></div>
      <button className="btn" type="submit">{t.register}</button>
    </form>
  </section></main>;
}
