import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { locales } from "@/lib/i18n";
export async function POST(req: Request) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const form = await req.formData(); const current = String(form.get("currentPassword") || ""); const next = String(form.get("newPassword") || "");
  const rawLocale = String(form.get("locale") || "pt"); const locale = (locales as readonly string[]).includes(rawLocale) ? rawLocale : "pt";
  if (next.length < 10 || new TextEncoder().encode(next).length > 72) return NextResponse.redirect(new URL(session.role === "ADMIN" ? "/admin?password=error" : `/${locale}/conta?password=error`, req.url), 303);
  const user = session.role === "ADMIN" ? await db.adminUser.findUnique({ where: { id: session.id } }) : await db.client.findUnique({ where: { id: session.id } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) return NextResponse.redirect(new URL(session.role === "ADMIN" ? "/admin?password=error" : `/${locale}/conta?password=error`, req.url), 303);
  const passwordHash = await bcrypt.hash(next, 12);
  if (session.role === "ADMIN") await db.adminUser.update({ where: { id: session.id }, data: { passwordHash } }); else await db.client.update({ where: { id: session.id }, data: { passwordHash } });
  return NextResponse.redirect(new URL(session.role === "ADMIN" ? "/admin?password=success" : `/${locale}/conta?password=success`, req.url), 303);
}
