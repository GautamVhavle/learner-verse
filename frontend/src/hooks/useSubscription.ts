/**
 * useSubscription — stub for open-source builds.
 *
 * When the private payment submodule is present, this file is replaced
 * by a symlink to the real implementation via `make setup-payment`.
 *
 * These no-op exports satisfy TypeScript imports in components that are
 * conditionally rendered behind the PAYMENT_GATEWAY_ENABLED flag.
 */
import type { SubscriptionStatus } from "@/types/subscription";

export const PRO_WELCOME_PENDING_KEY = "lv.pro.welcome.pending";

export function useCreateOrderMutation() {
  return { mutateAsync: async () => ({}) } as never;
}

export function useVerifyPaymentMutation() {
  return { mutateAsync: async () => ({}) } as never;
}

export function useCancelSubscriptionMutation() {
  return {
    mutate: (..._args: unknown[]) => {}, // eslint-disable-line @typescript-eslint/no-unused-vars
    isPending: false,
  };
}

export function useRazorpayCheckout() {
  return {
    initiatePayment: async (): Promise<SubscriptionStatus | null> => null,
    isLoading: false,
  };
}
