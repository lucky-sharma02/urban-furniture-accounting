import { useEffect, useMemo, useState } from "react";

export interface Paginated<T> {
  page: number;
  totalPages: number;
  total: number;
  pageItems: T[];
  rangeStart: number;
  rangeEnd: number;
  setPage: (page: number) => void;
}

/**
 * Client-side pagination over an already-filtered array. Pass the current search
 * term (or any filter signature) as `resetKey` so paging jumps back to page 1
 * whenever the filtered set changes.
 */
export function usePaginated<T>(items: T[], pageSize = 25, resetKey?: unknown): Paginated<T> {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    page: safePage,
    totalPages,
    total,
    pageItems,
    rangeStart: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    rangeEnd: Math.min(safePage * pageSize, total),
    setPage,
  };
}
