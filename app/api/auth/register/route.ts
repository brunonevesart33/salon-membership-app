import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { makeSession } from "@/lib/auth";
import { locales } from "@/lib/i18n";
import { sendNotice } from "@/lib/email";
export async function POST(req: Request) {
  const form = await req.formData(); const name = String(form.get("name") || "").trim(); const email = String(form.get("email") || "").trim().toLowerCase(); const phone = String(form.get("phone") || "").trim(); const password = String(form.get("password") || ""); const storeId = String(form.get("storeId") || ""); const lang = String(form.get("preferredLanguage") || form.get("locale") || "pt");
  const safeLocale = locales.includes(lang as typeof locales[number]) ? lang : "pt";
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 10 || new TextEncoder().encode(password).length > 72 || !phone || phone.length > 40 || !storeId) return NextResponse.redirect(new URL(`/${safeLocale}/registar?error=1`, req.url), 303);
  try { const client = await db.client.create({ data: { name, email, phone, homeStoreId: storeId, preferredLanguage: safeLocale as typeof locales[number], passwordHash: await bcrypt.hash(password, 12) } }); await makeSession(client.id, "CLIENT"); await sendNotice(email, safeLocale, "welcome").catch(() => {}); const product = String(form.get("product") || ""); const store = String(form.get("store") || ""); return NextResponse.redirect(new URL(product && store ? `/${safeLocale}/aderir?product=${encodeURIComponent(product)}&store=${encodeURIComponent(store)}` : `/${safeLocale}/conta`, req.url), 303); }
  catch { return NextResponse.redirect(new URL(`/${safeLocale}/registar?error=1`, req.url), 303); }
}
