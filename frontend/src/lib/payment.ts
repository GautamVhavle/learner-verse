/**
 * Payment gateway feature flag.
 *
 * When `VITE_PAYMENT_GATEWAY_ENABLED` is "true", the Razorpay payment
 * integration is active - Pro features are gated behind a subscription.
 *
 * When false (default), all users are treated as Pro and no payment UI
 * is rendered. This is the default for self-hosted deployments.
 */
export const PAYMENT_GATEWAY_ENABLED = import.meta.env.VITE_PAYMENT_GATEWAY_ENABLED === "true";
