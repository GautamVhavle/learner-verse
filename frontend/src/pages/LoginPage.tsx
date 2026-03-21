/**
 * Login page with Auth0 authentication buttons.
 * Redirects to dashboard if the user is already authenticated.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { loginWithRedirect, isLoading, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-root">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-root">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="size-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Learner Verse
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Sign in to continue
          </p>
        </div>
        <div className="flex flex-col gap-3 w-72">
          <Button
            size="lg"
            className="w-full"
            onClick={() => loginWithRedirect()}
          >
            Log In
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() =>
              loginWithRedirect({
                authorizationParams: { screen_hint: "signup" },
              })
            }
          >
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  );
}
