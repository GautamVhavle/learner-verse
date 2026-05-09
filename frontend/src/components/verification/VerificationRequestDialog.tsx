/**
 * VerificationRequestDialog — lets creators apply for the verified badge.
 *
 * Shows: current status (pending/approved) OR an application form.
 * Triggered from the AppShell header "Get Verified" button.
 */
import { useState } from "react";
import { BadgeCheck, Shield } from "lucide-react";
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
import { useVerificationStatus, useSubmitVerificationMutation } from "@/hooks/useVerification";

interface VerificationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VerificationRequestDialog({ open, onOpenChange }: VerificationRequestDialogProps) {
  const [message, setMessage] = useState("");
  const { data: status, isLoading } = useVerificationStatus();
  const submitMutation = useSubmitVerificationMutation();

  async function handleSubmit() {
    if (message.trim().length < 20) return;
    await submitMutation.mutateAsync(message.trim());
    onOpenChange(false);
    setMessage("");
  }

  const hasPending = status?.has_pending ?? false;
  const hasApproved = status?.has_approved ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck size={18} className="text-blue-500" />
            Creator Verification
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
        ) : hasApproved ? (
          <div className="space-y-3 py-6 text-center">
            <BadgeCheck size={40} className="mx-auto text-blue-500" />
            <p className="font-semibold">You're a Verified Creator!</p>
            <p className="text-muted-foreground text-sm">
              Your profile displays the Verified Creator badge across the platform.
            </p>
          </div>
        ) : hasPending ? (
          <div className="space-y-3 py-6 text-center">
            <Shield size={40} className="mx-auto text-orange-500" />
            <p className="font-semibold">Application Under Review</p>
            <Badge variant="secondary" className="text-xs">
              Pending
            </Badge>
            <p className="text-muted-foreground text-sm">
              Your verification request is being reviewed. We'll notify you when a decision is made.
            </p>
            {status?.admin_note && (
              <p className="text-muted-foreground rounded border p-2 text-left text-xs">
                {status.admin_note}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {status?.status === "rejected" && (
              <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3 text-sm">
                <p className="text-destructive font-medium">Previous application not approved</p>
                {status.admin_note && (
                  <p className="text-muted-foreground mt-1">{status.admin_note}</p>
                )}
                <p className="text-muted-foreground mt-1">You're welcome to apply again.</p>
              </div>
            )}

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
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
              <p className="text-muted-foreground text-right text-xs">{message.length} chars</p>
            </div>
          </div>
        )}

        {!hasApproved && !hasPending && !isLoading && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={message.trim().length < 20 || submitMutation.isPending}
            >
              {submitMutation.isPending ? "Submitting…" : "Submit Application"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
