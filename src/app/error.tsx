"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="text-center px-4">
        <p className="text-6xl font-bold text-[var(--color-error)] mb-2">500</p>
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Something went wrong</h1>
        <p className="text-[var(--color-text-secondary)] mb-6">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-[var(--color-text-muted)] mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <Button
          onClick={reset}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-black"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
