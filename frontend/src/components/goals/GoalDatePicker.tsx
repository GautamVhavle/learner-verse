/**
 * Date picker dialog for setting or clearing a course completion goal.
 */
import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSetGoalMutation } from "@/hooks/useGoals";

interface GoalDatePickerProps {
  courseId: string;
  courseTitle: string;
  currentGoalDate: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalDatePicker({
  courseId,
  courseTitle,
  currentGoalDate,
  open,
  onOpenChange,
}: GoalDatePickerProps) {
  const setGoal = useSetGoalMutation();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState<string>(
    currentGoalDate ?? "",
  );

  const handleSave = () => {
    setGoal.mutate(
      { courseId, goalDate: selectedDate || null },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const handleRemove = () => {
    setGoal.mutate(
      { courseId, goalDate: null },
      {
        onSuccess: () => {
          setSelectedDate("");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="size-5 text-accent-blue" />
            Set Learning Goal
          </DialogTitle>
          <DialogDescription>
            Set a target completion date for{" "}
            <span className="font-medium text-text-primary">{courseTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label
              htmlFor="goal-date"
              className="text-sm font-medium text-text-secondary"
            >
              Target Date
            </label>
            <input
              id="goal-date"
              type="date"
              min={minDate}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-quaternary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-blue focus:ring-1 focus:ring-accent-blue [color-scheme:dark]"
            />
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "1 week", days: 7 },
              { label: "2 weeks", days: 14 },
              { label: "1 month", days: 30 },
              { label: "3 months", days: 90 },
            ].map((preset) => {
              const d = new Date();
              d.setDate(d.getDate() + preset.days);
              const val = d.toISOString().split("T")[0];
              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setSelectedDate(val)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedDate === val
                      ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                      : "border-border-default bg-bg-tertiary text-text-secondary hover:border-border-hover hover:text-text-primary"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          {currentGoalDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={setGoal.isPending}
              className="mr-auto gap-1 text-text-tertiary hover:text-accent-red"
            >
              <X className="size-3.5" />
              Remove Goal
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!selectedDate || setGoal.isPending}
            size="sm"
          >
            {setGoal.isPending ? "Saving..." : currentGoalDate ? "Update Goal" : "Set Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
