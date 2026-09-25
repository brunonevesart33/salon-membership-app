# Jules Daynos Membership

Phase 1 membership application for Portimão and Tavira. This is a Next.js App Router application with PostgreSQL/Prisma, localized customer UI (PT/EN/ES/FR/DE), a single shared admin area, Stripe Billing hooks, manual cash collection and an isolated CSV invoicing export.

## Local setup

1. Install Node.js 20.9 or newer and PostgreSQL 14 or newer.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, a unique `NEXTAUTH_SECRET`, `APP_URL`, and bootstrap admin credentials. Set `ADMIN_EMAILS` to the three managers' email addresses (comma separated) and `ADMIN_PASSWORD` to a strong initial password. Each manager can change it after sign-in.
3. Run `npm install`, `npm run db:generate`, `npm run db:deploy`, `npm run db:seed`, then `npm run dev`. Use `npm run db:migrate -- --name describe_change` to create and apply later development migrations; commit those migration files before deploying.
4. Visit `http://localhost:3000/pt/planos`. The shared admin dashboard is at `/admin`; admin sign-in is available at `/pt/entrar?admin=1`.

The seed creates both salons and all 12 starter products. Every price is deliberately `0` until the owners confirm pricing. Stripe processing is disabled by default. Card/SEPA checkout, webhooks and the Stripe Customer Portal are an integration draft for a qualified payment specialist to review and configure; do not enable `STRIPE_BILLING_ENABLED` until that review and end-to-end verification are complete. The specialist must set real prices, enable the Customer Portal's payment method update feature, configure Billing retries, and point a signed webhook at `/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted`. Never enter or store card or IBAN details in this app.

Cash subscriptions stay pending until a manager confirms payment. Renewals are due monthly in the admin dashboard and require a fresh payment confirmation. Family Head Spa sessions are treated as shared by up to four people; unused sessions expire monthly. Confirm both policies with the owners before launch. The admin CSV only includes successful Stripe payments and confirmed cash payments. It is a report for manual import into the salon's existing invoicing product; this app does not issue invoices. See the source specification's `ASSUMPTIONS.md` for prices and family session allocation still to be confirmed.

## Implementation notes

- `lib/invoicing-export.ts` is the only external invoicing integration boundary.
- Stripe webhook event IDs are persisted for idempotent processing.
- Admin accounts have no store restriction; the dashboard defaults to both salons and allows filtering.
- The admin console is currently in Portuguese; customer pages and transactional emails support PT/EN/ES/FR/DE.
- `sessionsPerMonth` is stored on the product; unspent Head Spa sessions are not currently tracked as individual credits.
- Localized transactional email templates are in `lib/email.ts`. Configure `RESEND_API_KEY` and `EMAIL_FROM` before launch; email is skipped when those are unset.
