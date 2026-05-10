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
  const { data: user } = useUserQuery();
  const { showGate, ProGate } = useProGate();
  const [dismissed, setDismissed] = useState(false);

  // Never show the upgrade banner when payment gateway is disabled.
  if (!PAYMENT_GATEWAY_ENABLED) return null;

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
      <div className="border-accent-purple/20 from-accent-purple/[0.06] to-accent-purple/[0.02] mx-2 mb-1 rounded-lg border bg-gradient-to-br p-2.5">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="text-accent-purple size-3.5" />
            <span className="text-text-primary text-[11px] font-semibold">Upgrade to Pro</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-text-tertiary hover:text-text-secondary rounded p-0.5 transition-colors"
          >
            <X className="size-3" />
          </button>
        </div>
        <p className="text-text-tertiary text-[10px]">Unlock AI features — ₹99/mo</p>
        <button
          onClick={showGate}
          className="bg-accent-purple hover:bg-accent-purple/90 mt-2 w-full rounded-md py-1 text-[10px] font-medium text-white transition-colors"
        >
          Upgrade
        </button>
      </div>
    </>
  );
}
