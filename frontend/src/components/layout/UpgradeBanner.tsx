/**
 * UpgradeBanner — sidebar banner for free users only.
 * Dismissible upgrade prompt that reappears after 7 days.
 * Pro users see their badge in the sidebar header instead.
 */
import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { useUserQuery } from "@/hooks/useUser";
import { useProGate } from "@/hooks/useProGate";
import { PAYMENT_GATEWAY_ENABLED } from "@/lib/payment";

const DISMISS_KEY = "learnerverse-upgrade-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function UpgradeBanner() {
  // Never show the upgrade banner when payment gateway is disabled.
  if (!PAYMENT_GATEWAY_ENABLED) return null;

  const { data: user } = useUserQuery();
  const { showGate, ProGate } = useProGate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (ts && Date.now() - Number(ts) < DISMISS_DURATION) {
      setDismissed(true);
    }
  }, []);

  if (!user || user.is_pro || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <>
      <ProGate />
      <div className="mx-2 mb-1 rounded-lg border border-accent-purple/20 bg-gradient-to-br from-accent-purple/[0.06] to-accent-purple/[0.02] p-2.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-accent-purple" />
            <span className="text-[11px] font-semibold text-text-primary">
              Upgrade to Pro
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded p-0.5 text-text-tertiary transition-colors hover:text-text-secondary"
          >
            <X className="size-3" />
          </button>
        </div>
        <p className="text-[10px] text-text-tertiary">
          Unlock AI features — ₹99/mo
        </p>
        <button
          onClick={showGate}
          className="mt-2 w-full rounded-md bg-accent-purple py-1 text-[10px] font-medium text-white transition-colors hover:bg-accent-purple/90"
        >
          Upgrade
        </button>
      </div>
    </>
  );
}
