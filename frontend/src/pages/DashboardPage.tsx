/**
 * Dashboard page that renders the creator or learner view based on current mode.
 */
import { useMode } from "@/hooks/useMode";
import { CreatorDashboard } from "@/components/dashboard/CreatorDashboard";
import { LearnerDashboard } from "@/components/dashboard/LearnerDashboard";

export default function DashboardPage() {
  const { isCreator } = useMode();

  if (isCreator) {
    return <CreatorDashboard />;
  }

  return <LearnerDashboard />;
}
