import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the header and the first rows of the bento, so nothing jumps when the brief arrives. */
export function BriefSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading brief">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-6 h-12 w-[min(28rem,80%)]" />
      <div className="mt-5 flex flex-wrap gap-2">
        <Skeleton className="h-8 w-36 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>
      <div className="mt-10 grid grid-cols-12 gap-4">
        <div className="card col-span-full p-7">
          <Skeleton className="h-3 w-20" />
          <div className="mt-5 grid gap-7 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-12">
            <Skeleton className="h-[88px] w-40" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[70%]" />
            </div>
          </div>
        </div>
        <div className="col-span-full grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="card p-7">
              <Skeleton className="h-9 w-40" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-[75%]" />
            </div>
          ))}
        </div>
        <div className="card col-span-full p-7 lg:col-span-5">
          <Skeleton className="h-3 w-28" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-4 w-[88%]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
