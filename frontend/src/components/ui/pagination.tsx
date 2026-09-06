import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Paginated } from "@/hooks/use-paginated";

interface PaginationProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pagination: Paginated<any>;
  className?: string;
}

export function Pagination({ pagination, className }: PaginationProps) {
  const { page, totalPages, total, rangeStart, rangeEnd, setPage } = pagination;
  if (total === 0 || totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-end gap-3 text-xs text-slate-500", className)}>
      <span className="tabular-nums">
        {rangeStart}&ndash;{rangeEnd} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 border-slate-200 p-0"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 border-slate-200 p-0"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
