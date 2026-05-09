/**
 * React error boundary that catches render errors and shows a fallback UI.
 */
import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="flex min-h-[50vh] items-center justify-center p-6"
          role="alert"
          data-testid="error-boundary"
        >
          <div className="flex max-w-md flex-col items-center text-center">
            <div className="bg-accent-red/10 mb-4 flex size-14 items-center justify-center rounded-full">
              <AlertTriangle className="text-accent-red size-7" />
            </div>
            <h2 className="text-text-primary text-lg font-semibold">Something went wrong</h2>
            <p className="text-text-secondary mt-2 text-sm">
              An unexpected error occurred. Try refreshing the page or going back.
            </p>
            {this.state.error && (
              <p className="bg-bg-tertiary text-text-tertiary mt-3 max-w-full truncate rounded-md px-3 py-1.5 font-mono text-xs">
                {this.state.error.message}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                <RotateCcw className="mr-1.5 size-3.5" />
                Try again
              </Button>
              <Button size="sm" onClick={() => (window.location.href = "/")}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
