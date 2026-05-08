/**
 * Subscription types — stub for open-source builds.
 *
 * When the private payment submodule is present, this file is replaced
 * by a symlink to the real implementation via `make setup-payment`.
 */
export type ProPlan = "monthly" | "yearly";

export interface CreateOrderRequest {
  plan: ProPlan;
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan: ProPlan;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: ProPlan;
}

export interface SubscriptionStatus {
  is_pro: boolean;
  pro_since: string | null;
  pro_expires_at: string | null;
  pro_plan: ProPlan | null;
}

export interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
