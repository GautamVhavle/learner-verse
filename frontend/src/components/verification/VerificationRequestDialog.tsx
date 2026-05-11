/**
 * VerificationRequestDialog - lets creators apply for the verified badge.
 *
 * Shows: current status (pending/approved/rejected with history) OR an application form.
 * Supports: withdraw pending application, view rejection reasons, resubmit.
 * Triggered from the AppShell header verification button.
 */
import { useState } from "react";
import { BadgeCheck, Clock, MessageSquare, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useVerificationStatus,
  useSubmitVerificationMutation,
  useWithdrawVerificationMutation,
} from "@/hooks/useVerification";
import type { VerificationHistoryItem } from "@/hooks/useVerification";

interface VerificationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    pending: { variant: "secondary", label: "Pending" },
    approved: { variant: "default", label: "Approved" },
    rejected: { variant: "destructive", label: "Rejected" },
    withdrawn: { variant: "outline", label: "Withdrawn" },
  };
  const v = variants[status] ?? { variant: "outline" as const, label: status };
  return (
    <Badge variant={v.variant} className="text-xs">
      {v.label}
    </Badge>
  );
}

function HistoryTimeline({ history }: { history: VerificationHistoryItem[] }) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={14} className="text-muted-foreground" />
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Application History
        </p>
      </div>
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {history.map((item) => (
          <div key={item.id} className="bg-muted/50 rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={item.status} />
              <span className="text-muted-foreground text-xs">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">{item.message}</p>
            {item.admin_note && (
              <div className="mt-2 rounded border-l-2 border-orange-400 bg-orange-500/5 pl-2 text-xs">
                <span className="font-medium text-orange-600">Admin feedback:</span>{" "}
                <span className="text-muted-foreground">{item.admin_note}</span>
              </div>
            )}
            {item.reviewed_at && (
              <p className="text-muted-foreground mt-1 text-[10px]">
                Reviewed {new Date(item.reviewed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function VerificationRequestDialog({ open, onOpenChange }: VerificationRequestDialogProps) {
  const [message, setMessage] = useState("");
  const { data: status, isLoading } = useVerificationStatus();
  const submitMutation = useSubmitVerificationMutation();
  const withdrawMutation = useWithdrawVerificationMutation();

  async function handleSubmit() {
    if (message.trim().length < 20) return;
    await submitMutation.mutateAsync(message.trim());
    onOpenChange(false);
    setMessage("");
  }

  async function handleWithdraw() {
    await withdrawMutation.mutateAsync();
  }

  const hasPending = status?.has_pending ?? false;
  const hasApproved = status?.has_approved ?? false;
  const wasRejected = status?.status === "rejected";
  const history = status?.history ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck size={18} className="text-blue-500" />
            Creator Verification
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
        ) : hasApproved ? (
          /* ── Approved state ── */
          <div className="space-y-4">
            <div className="space-y-3 py-4 text-center">
              <BadgeCheck size={40} className="mx-auto text-blue-500" />
              <p className="font-semibold">You're a Verified Creator!</p>
              <p className="text-muted-foreground text-sm">
                Your profile displays the Verified Creator badge across the platform.
              </p>
            </div>
            {history.length > 0 && <HistoryTimeline history={history} />}
          </div>
        ) : hasPending ? (
          /* ── Pending state ── */
          <div className="space-y-4">
            <div className="space-y-3 py-4 text-center">
              <Clock size={40} className="mx-auto text-orange-500" />
              <p className="font-semibold">Application Under Review</p>
              <Badge variant="secondary" className="text-xs">
                Pending
              </Badge>
              <p className="text-muted-foreground text-sm">
                Your verification request is being reviewed. We'll notify you when a decision is
                made.
              </p>
            </div>
            {history.length > 0 && <HistoryTimeline history={history} />}
          </div>
        ) : (
          /* ── Apply / Re-apply state ── */
          <div className="space-y-4">
            {wasRejected && (
              <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <XCircle size={16} className="text-destructive shrink-0" />
                  <p className="text-destructive font-medium">Previous application not approved</p>
                </div>
                {status?.admin_note && (
                  <div className="mt-2 rounded border-l-2 border-red-400 bg-red-500/5 pl-2 text-xs">
                    <span className="font-medium text-red-600">Reason:</span>{" "}
                    <span className="text-muted-foreground">{status.admin_note}</span>
                  </div>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  You're welcome to address the feedback and apply again.
                </p>
              </div>
            )}

            {history.length > 1 && <HistoryTimeline history={history} />}

            <p className="text-muted-foreground text-sm">
              Apply for the Verified Creator badge to show learners that your courses are
              high-quality and trustworthy.
            </p>

            <div className="space-y-2">
              <Label htmlFor="verification-message">
                Tell us about yourself and your courses
                <span className="text-muted-foreground ml-1 font-normal">(min. 20 characters)</span>
              </Label>
              <Textarea
                id="verification-message"
                placeholder="Describe your expertise, the courses you've created, your teaching experience, and why you'd like to be a verified creator…"
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                rows={5}
              />
              <p className="text-muted-foreground text-right text-xs">{message.length} chars</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {/* Pending state - show Withdraw button */}
          {hasPending && !hasApproved && !isLoading && (
            <Button
              variant="outline"
              onClick={handleWithdraw}
              disabled={withdrawMutation.isPending}
              className="text-destructive hover:text-destructive"
            >
              {withdrawMutation.isPending ? "Withdrawing…" : "Withdraw Application"}
            </Button>
          )}
          {/* Apply / Re-apply state - show Cancel + Submit + Withdraw (if rejected) */}
          {!hasApproved && !hasPending && !isLoading && (
            <>
              {wasRejected && (
                <Button
                  variant="outline"
                  onClick={handleWithdraw}
                  disabled={withdrawMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  {withdrawMutation.isPending ? "Withdrawing…" : "Withdraw"}
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={message.trim().length < 20 || submitMutation.isPending}
              >
                {submitMutation.isPending
                  ? "Submitting…"
                  : wasRejected
                    ? "Resubmit Application"
                    : "Submit Application"}
              </Button>
            </>
          )}
          {/* Approved - just close */}
          {hasApproved && !isLoading && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
