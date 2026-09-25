import { Payment } from "@prisma/client";

// The only integration boundary for the salons' external invoicing software.
// Phase 1 creates a manually importable CSV; it does not issue invoices.
export function paymentsCsv(payments: (Payment & { subscription: { client: { name: string; email: string }; store: { name: string } } })[]) {
  const quote = (v: unknown) => {
    let value = String(v ?? "");
    if (/^[\s]*[=+\-@]/.test(value)) value = `'${value}`;
    return `"${value.replaceAll('"', '""')}"`;
  };
  const rows = [["payment_id", "customer", "email", "amount_eur", "date", "store", "method", "status"]];
  for (const p of payments) rows.push([p.id, p.subscription.client.name, p.subscription.client.email, (p.amountCents / 100).toFixed(2), p.createdAt.toISOString(), p.subscription.store.name, p.status === "MANUAL_CASH" ? "cash" : "stripe", p.status].map(quote));
  return rows.map((r) => r.join(",")).join("\r\n");
}
