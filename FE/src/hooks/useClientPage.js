import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '../api/pagination.js';

export default function useClientPage(items = [], options = {}) {
  const [page, setPage] = useState(options.initialPage || 1);
  const [size, setSizeValue] = useState(options.initialSize || DEFAULT_PAGE_SIZE);

  const totalRecords = items.length;
  const totalPages = totalRecords ? Math.ceil(totalRecords / size) : 0;

  useEffect(() => {
    if (!totalPages) {
      if (page !== 1) setPage(1);
      return;
    }
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const safePage = totalPages ? Math.min(Math.max(1, page), totalPages) : 1;

  const pagedItems = useMemo(() => {
    if (!totalRecords) return [];
    const start = (safePage - 1) * size;
    return items.slice(start, start + size);
  }, [items, safePage, size, totalRecords]);

  const setSize = (nextSize) => {
    setSizeValue(nextSize);
    setPage(1);
  };

  return {
    items: pagedItems,
    page: safePage,
    size,
    totalRecords,
    totalPages,
    setPage,
    setSize,
  };
}
