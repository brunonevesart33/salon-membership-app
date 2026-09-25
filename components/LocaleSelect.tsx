"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { locales } from "@/lib/i18n";
export function LocaleSelect({ locale, label }: { locale: string; label: string }) { const router = useRouter(); useEffect(() => { document.documentElement.lang = locale; }, [locale]); return <select className="locale" aria-label={label} defaultValue={locale} onChange={(e) => router.push(`/${e.target.value}/planos`)}>{locales.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select>; }
