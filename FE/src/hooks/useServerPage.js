import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '../api/pagination.js';

const EMPTY_PAGE = {
  items: [],
  page: 1,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

export default function useServerPage(fetchPage, filters = {}, options = {}) {
  const [page, setPage] = useState(options.initialPage || 1);
  const [size, setSizeValue] = useState(options.initialSize || DEFAULT_PAGE_SIZE);
  const [result, setResult] = useState({ ...EMPTY_PAGE, size: options.initialSize || DEFAULT_PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const previousFilterKey = useRef(filterKey);
  const stableFilters = useMemo(() => JSON.parse(filterKey), [filterKey]);

  useEffect(() => {
    if (previousFilterKey.current !== filterKey) {
      previousFilterKey.current = filterKey;
      if (page !== 1) {
        setPage(1);
        return undefined;
      }
    }

    let active = true;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    Promise.resolve(fetchPage({ ...stableFilters, page, size }))
      .then((data) => {
        if (!active || currentRequest !== requestId.current) return;
        if (data?.totalPages > 0 && page > data.totalPages) {
          setPage(data.totalPages);
          return;
        }
        setResult(data || { ...EMPTY_PAGE, page, size });
      })
      .catch((err) => {
        if (!active || currentRequest !== requestId.current) return;
        setError(err?.message || 'Failed to load data');
        setResult({ ...EMPTY_PAGE, page, size });
      })
      .finally(() => {
        if (active && currentRequest === requestId.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchPage, stableFilters, page, size, reloadKey]);

  const setSize = useCallback((nextSize) => {
    setSizeValue(nextSize);
    setPage(1);
  }, []);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    ...result,
    page,
    size,
    loading,
    error,
    setPage,
    setSize,
    reload,
  };
}
