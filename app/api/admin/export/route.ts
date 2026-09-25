import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { paymentsCsv } from "@/lib/invoicing-export";
import { lisbonMidnight } from "@/lib/dates";
export async function GET(req: Request) {
  const user = await getSession(); if (!user || user.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });
  const url = new URL(req.url); const from = url.searchParams.get("from"); const to = url.searchParams.get("to");
  let start: Date | undefined; let end: Date | undefined;
  try {
    if (from) start = lisbonMidnight(from);
    if (to) { const next = new Date(`${to}T00:00:00.000Z`); if (!Number.isFinite(next.getTime()) || next.toISOString().slice(0, 10) !== to) throw new Error("Invalid date"); next.setUTCDate(next.getUTCDate() + 1); end = lisbonMidnight(next.toISOString().slice(0, 10)); }
    if (start && end && start >= end) throw new Error("Invalid date range");
  } catch { return new NextResponse("Invalid date range", { status: 400 }); }
  const payments = await db.payment.findMany({ where: { status: { in: ["SUCCEEDED", "MANUAL_CASH"] }, createdAt: { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) } }, include: { subscription: { include: { client: true, store: true } } }, orderBy: { createdAt: "desc" } });
  return new NextResponse(`\uFEFF${paymentsCsv(payments)}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="jules-daynos-payments-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
