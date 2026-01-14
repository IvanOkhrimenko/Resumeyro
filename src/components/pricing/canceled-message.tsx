"use client";

import { useSearchParams } from "next/navigation";

export function CanceledMessage() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");

  if (!canceled) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Checkout was canceled. Feel free to try again when you're ready.
      </div>
    </div>
  );
}
