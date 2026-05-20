/**
 * useProGate - gate any action behind a Pro subscription check.
 *
 * When the payment gateway is disabled (self-hosted / open-source mode),
 * every user is treated as Pro and the gate is a transparent no-op.
 *
 * Usage:
 *   const { isPro, gatedAction, ProGate } = useProGate();
 *   <Button onClick={gatedAction(doSomethingExpensive)}>Do it</Button>
 *   <ProGate />  // render once - the dialog portal
 */
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserQuery } from "@/hooks/useUser";
import { PAYMENT_GATEWAY_ENABLED } from "@/lib/payment";
import { ProGateDialog } from "@/components/subscription/ProGateDialog";

export function useProGate() {
  // When the payment gateway is disabled, everyone is Pro.
  // Return a transparent no-op so consuming components need zero changes.
  if (!PAYMENT_GATEWAY_ENABLED) {
    return {
      isPro: true as const,
      gatedAction: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
      showGate: () => {},
      ProGate: () => null,
    } as const;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks -- PAYMENT_GATEWAY_ENABLED is a build-time constant; the branch is deterministic.
  return useProGateInternal();
}

/**
 * Internal implementation - only called when payment gateway is enabled.
 * Separated to keep the hook rules valid (hooks are only called in this
 * function, which is always called or never called - never conditionally).
 */
function useProGateInternal() {
  const { data: user } = useUserQuery();
  const navigate = useNavigate();
  const isPro = user?.is_pro ?? false;
  const expired = !isPro && user?.pro_expires_at !== null && user?.pro_expires_at !== undefined;

  const [open, setOpen] = useState(false);

  const gatedAction = useCallback(
    <T extends (...args: unknown[]) => unknown>(fn: T) =>
      (...args: Parameters<T>) => {
        if (isPro) return fn(...args);
        setOpen(true);
      },
    [isPro],
  );

  const showGate = useCallback(() => setOpen(true), []);

  function ProGate() {
    return (
      <ProGateDialog
        open={open}
        onOpenChange={setOpen}
        expired={expired}
        onViewPlans={() => navigate("/pricing")}
      />
    );
  }

  return { isPro, gatedAction, showGate, ProGate } as const;
}
