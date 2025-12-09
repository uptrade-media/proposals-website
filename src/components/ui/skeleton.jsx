import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-[var(--glass-bg-inset)] animate-pulse rounded-[var(--radius-md)]", className)}
      {...props} />
  );
}

export { Skeleton }
