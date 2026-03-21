/**
 * 404 Not Found page with navigation back to the dashboard.
 */
import { useNavigate } from "react-router";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      data-testid="not-found-page"
    >
      <div className="flex max-w-md flex-col items-center text-center">
        <p className="text-6xl font-bold text-text-tertiary">404</p>
        <h1 className="mt-4 text-xl font-semibold text-text-primary">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1.5 size-3.5" />
            Go back
          </Button>
          <Button size="sm" onClick={() => navigate("/")}>
            <Home className="mr-1.5 size-3.5" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
