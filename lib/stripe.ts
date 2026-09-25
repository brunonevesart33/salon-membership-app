import Stripe from "stripe";
const enabled = process.env.STRIPE_BILLING_ENABLED === "true" && Boolean(process.env.STRIPE_SECRET_KEY);
export const stripe = enabled ? new Stripe(process.env.STRIPE_SECRET_KEY!) : null;
