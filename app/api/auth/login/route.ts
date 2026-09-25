import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { makeSession } from "@/lib/auth";
import { locales } from "@/lib/i18n";
export async function POST(req: Request) {
  const form = await req.formData(); const email = String(form.get("email") || "").trim().toLowerCase(); const password = String(form.get("password") || ""); const role = String(form.get("role") || "CLIENT"); const locale = String(form.get("locale") || "pt");
  const safeLocale = (locales as readonly string[]).includes(locale) ? locale : "pt";
  const user = role === "ADMIN" ? await db.adminUser.findUnique({ where: { email } }) : await db.client.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.redirect(new URL(`/${safeLocale}/entrar?${role === "ADMIN" ? "admin=1&" : ""}error=1`, req.url), 303);
  await makeSession(user.id, role === "ADMIN" ? "ADMIN" : "CLIENT");
  const product = String(form.get("product") || ""); const store = String(form.get("store") || "");
  return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin" : product && store ? `/${safeLocale}/aderir?product=${encodeURIComponent(product)}&store=${encodeURIComponent(store)}` : `/${safeLocale}/conta`, req.url), 303);
}
