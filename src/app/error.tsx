"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This page couldn&apos;t be loaded. Trying again often fixes it — the data itself is safe.
      </p>
      {/* The raw error message used to be rendered here. Next.js redacts
          server-side messages in production, but client-side ones came
          through verbatim, which meant showing the household something like
          "Cannot read properties of undefined". The digest is the useful
          half: it's what makes the error findable in the Vercel logs. */}
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
      )}
      <Button onClick={reset} className="mt-1">
        Try again
      </Button>
    </div>
  );
}
