/**
 * Dialog listing course validation errors before publishing.
 */
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ValidationError } from "@/types/course";

interface ValidationErrorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: ValidationError[];
}

export function ValidationErrorsDialog({
  open,
  onOpenChange,
  errors,
}: ValidationErrorsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-accent-amber size-4" />
            Cannot Mark as Ready
          </DialogTitle>
          <DialogDescription>
            Fix the following issues before publishing this course:
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-60 space-y-2 overflow-y-auto">
          {errors.map((err, i) => (
            <div
              key={i}
              className="border-border-default bg-bg-secondary rounded-lg border px-3 py-2.5"
            >
              <div className="flex items-start gap-2">
                <span className="bg-accent-amber mt-0.5 size-1.5 shrink-0 rounded-full" />
                <div className="min-w-0">
                  <p className="text-text-primary text-sm">{err.message}</p>
                  <p className="text-text-tertiary mt-0.5 text-xs">
                    {err.section}
                    {err.lesson && ` → ${err.lesson}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
