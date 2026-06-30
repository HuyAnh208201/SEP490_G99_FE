import { useEffect, useState } from 'react';

export function useModuleData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(fetcher));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fetcher) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.resolve()
      .then(() => fetcher())
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
