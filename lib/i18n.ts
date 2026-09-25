import pt from "@/messages/pt.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import de from "@/messages/de.json";
export const locales = ["pt", "en", "es", "fr", "de"] as const;
export type Locale = typeof locales[number];
const dictionaries = { pt, en, es, fr, de };
export function messages(locale: string) { return dictionaries[(locales as readonly string[]).includes(locale) ? locale as Locale : "pt"]; }
export function productLabel(locale: string, product: { name: string; category: "HEAD_SPA" | "HAIRDRESSING"; sessionsPerMonth: number | null; maxPeople: number }) {
  const t = messages(locale);
  if (product.category === "HEAD_SPA") return `${t.headSpa} ${product.sessionsPerMonth}x · ${product.maxPeople > 1 ? t.family : t.individual}`;
  return product.name === "Family" ? t.family : product.name;
}
