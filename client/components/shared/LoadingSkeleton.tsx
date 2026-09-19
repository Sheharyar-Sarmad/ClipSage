"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="mt-10 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3 rounded-lg bg-white/[0.05]" />
        <Skeleton className="h-4 w-1/3 rounded bg-white/[0.03]" />
      </div>
      <Skeleton className="h-20 rounded-2xl bg-white/[0.03]" />
      <Skeleton className="h-24 rounded-2xl bg-white/[0.03]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-36 rounded-2xl bg-white/[0.03]" />
        <Skeleton className="h-36 rounded-2xl bg-white/[0.03]" />
      </div>
      <Skeleton className="h-16 rounded-2xl bg-white/[0.03]" />
    </div>
  );
}