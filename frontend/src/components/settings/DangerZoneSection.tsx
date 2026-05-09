/**
 * Danger Zone section — destructive account actions with confirmation dialogs.
 */
import { useState } from "react";
import { AlertTriangle, Trash2, BookX, BarChart3, UserX, Loader2 } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useDeleteAllDataMutation,
  useDeleteAllCoursesMutation,
  useDeleteLearnerStatsMutation,
  useDeleteAccountMutation,
} from "@/hooks/useUser";
import { SINGLE_USER_MODE } from "@/lib/auth";

interface DangerAction {
  id: string;
  title: string;
  description: string;
  icon: typeof Trash2;
  confirmTitle: string;
  confirmDescription: string;
  confirmButton: string;
  variant: "destructive" | "outline";
}

const DANGER_ACTIONS: DangerAction[] = [
  {
    id: "courses",
    title: "Delete All Courses",
    description:
      "Permanently remove all courses you've created, including sections, lessons, and quizzes.",
    icon: BookX,
    confirmTitle: "Delete all courses?",
    confirmDescription:
      "This will permanently delete every course you've created along with all their sections, lessons, quiz questions, and tags. This action cannot be undone.",
    confirmButton: "Delete All Courses",
    variant: "destructive",
  },
  {
    id: "stats",
    title: "Clear Learning Stats",
    description: "Reset all progress, streaks, quiz attempts, study notes, and certificates.",
    icon: BarChart3,
    confirmTitle: "Clear all learning stats?",
    confirmDescription:
      "This will erase your lesson progress, activity streaks, quiz attempt history, study notes, and certificates. Your courses will remain intact. This action cannot be undone.",
    confirmButton: "Clear All Stats",
    variant: "destructive",
  },
  {
    id: "data",
    title: "Delete All My Data",
    description: "Wipe everything — courses, progress, chats, stats — while keeping your account.",
    icon: Trash2,
    confirmTitle: "Delete all your data?",
    confirmDescription:
      "This will permanently remove ALL your data: courses, learning progress, chat history, stats, certificates, and notes. Your account will remain active but completely empty. This action cannot be undone.",
    confirmButton: "Delete Everything",
    variant: "destructive",
  },
  {
    id: "account",
    title: "Delete My Account",
    description:
      "Permanently delete your account and all associated data. You will be logged out immediately.",
    icon: UserX,
    confirmTitle: "Delete your account?",
    confirmDescription:
      "This will permanently delete your account and wipe all your data. You will be logged out immediately and will not be able to recover this account. This action is irreversible.",
    confirmButton: "Delete My Account",
    variant: "destructive",
  },
];

export function DangerZoneSection() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  const deleteData = useDeleteAllDataMutation();
  const deleteCourses = useDeleteAllCoursesMutation();
  const deleteStats = useDeleteLearnerStatsMutation();
  const deleteAccount = useDeleteAccountMutation();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth0 = SINGLE_USER_MODE ? null : useAuth0();

  const isPending =
    deleteData.isPending ||
    deleteCourses.isPending ||
    deleteStats.isPending ||
    deleteAccount.isPending;

  const handleConfirm = (actionId: string) => {
    switch (actionId) {
      case "courses":
        deleteCourses.mutate(undefined, {
          onSuccess: () => setOpenDialog(null),
        });
        break;
      case "stats":
        deleteStats.mutate(undefined, {
          onSuccess: () => setOpenDialog(null),
        });
        break;
      case "data":
        deleteData.mutate(undefined, {
          onSuccess: () => setOpenDialog(null),
        });
        break;
      case "account":
        deleteAccount.mutate(undefined, {
          onSuccess: () => {
            setOpenDialog(null);
            // Logout immediately after account deletion
            if (auth0) {
              auth0.logout({
                logoutParams: { returnTo: window.location.origin },
              });
            } else {
              window.location.href = "/";
            }
          },
        });
        break;
    }
  };

  return (
    <section className="border-accent-red/30 bg-accent-red/[0.02] space-y-4 rounded-xl border p-5">
      <div className="flex items-center gap-2">
        <div className="bg-accent-red/10 flex size-6 items-center justify-center rounded-md">
          <AlertTriangle className="text-accent-red size-3.5" />
        </div>
        <div>
          <h2 className="text-accent-red text-sm font-semibold">Danger Zone</h2>
          <p className="text-text-tertiary text-[11px]">
            Irreversible actions — proceed with caution
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {DANGER_ACTIONS.map((action) => (
          <AlertDialog
            key={action.id}
            open={openDialog === action.id}
            onOpenChange={(open) => setOpenDialog(open ? action.id : null)}
          >
            <AlertDialogTrigger
              render={
                <button className="border-border-default bg-bg-secondary hover:border-accent-red/40 hover:bg-accent-red/[0.03] flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all">
                  <div className="bg-accent-red/8 text-accent-red flex size-8 shrink-0 items-center justify-center rounded-md">
                    <action.icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary text-sm font-medium">{action.title}</p>
                    <p className="text-text-tertiary text-[11px] leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-accent-red">
                  {action.confirmTitle}
                </AlertDialogTitle>
                <AlertDialogDescription>{action.confirmDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => handleConfirm(action.id)}
                  disabled={isPending}
                  className="bg-accent-red hover:bg-accent-red/90"
                >
                  {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {action.confirmButton}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ))}
      </div>
    </section>
  );
}
