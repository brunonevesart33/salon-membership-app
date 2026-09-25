import Link from "next/link";
import { locales, messages } from "@/lib/i18n";
import { LocaleSelect } from "@/components/LocaleSelect";
export function generateStaticParams() { return locales.map((locale) => ({ locale })); }
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params; const t = messages(locale);
  return <><header className="shell topbar"><Link className="brand" href={`/${locale}/planos`}>Jules <span>Daynos</span></Link><nav className="links"><Link href={`/${locale}/conta`}>{t.account}</Link><Link href="/admin/planos">{t.admin}</Link><LocaleSelect locale={locale} label={t.language}/></nav></header>{children}<footer className="shell footer">Jules Daynos Cabeleireiros · Portimão · Tavira</footer></>;
}
