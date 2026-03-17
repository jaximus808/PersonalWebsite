import { useState } from "react";

export function usePagination(totalItems: number, itemsPerPage: number) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const canGoBack = page > 0;
  const canGoForward = (page + 1) * itemsPerPage < totalItems;

  const goForward = () => {
    if (canGoForward) setPage((p) => p + 1);
  };

  const goBack = () => {
    if (canGoBack) setPage((p) => p - 1);
  };

  const sliceItems = <T>(items: T[]): T[] =>
    items.slice(page * itemsPerPage, Math.min((page + 1) * itemsPerPage, items.length));

  return { page, totalPages, canGoBack, canGoForward, goForward, goBack, sliceItems };
}
