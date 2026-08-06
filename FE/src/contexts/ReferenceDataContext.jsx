import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { fetchCategories } from '../api/categories.js';
import { fetchProductCount } from '../api/products.js';
import { fetchSuppliers } from '../api/suppliers.js';

const ReferenceDataContext = createContext(null);
const CACHE_MS = 60_000;

export function ReferenceDataProvider({ children }) {
  const cacheRef = useRef({
    productCount: { at: 0, data: null, promise: null },
    categories: { at: 0, data: null, promise: null },
    suppliers: { at: 0, data: null, promise: null },
  });

  const [version, setVersion] = useState(0);

  const loadCached = useCallback(async (key, loader) => {
    const now = Date.now();
    const entry = cacheRef.current[key];
    if (entry.data != null && now - entry.at < CACHE_MS) {
      return entry.data;
    }
    if (entry.promise) {
      return entry.promise;
    }
    entry.promise = loader()
      .then((data) => {
        entry.data = data;
        entry.at = Date.now();
        entry.promise = null;
        return data;
      })
      .catch((err) => {
        entry.promise = null;
        throw err;
      });
    return entry.promise;
  }, []);

  /** Returns a number (product count) — not a full product list. */
  const getProductCount = useCallback(
    () => loadCached('productCount', fetchProductCount),
    [loadCached],
  );
  /** @deprecated Use getProductCount — kept for callers that only need length > 0. */
  const getProducts = useCallback(async () => {
    const count = await getProductCount();
    return { length: count };
  }, [getProductCount]);
  const getCategories = useCallback(
    () => loadCached('categories', fetchCategories),
    [loadCached],
  );
  const getSuppliers = useCallback(
    () => loadCached('suppliers', fetchSuppliers),
    [loadCached],
  );

  const invalidate = useCallback((key) => {
    if (key === 'products') {
      cacheRef.current.productCount = { at: 0, data: null, promise: null };
    } else if (key) {
      cacheRef.current[key] = { at: 0, data: null, promise: null };
    } else {
      Object.keys(cacheRef.current).forEach((k) => {
        cacheRef.current[k] = { at: 0, data: null, promise: null };
      });
    }
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({ getProducts, getProductCount, getCategories, getSuppliers, invalidate, version }),
    [getProducts, getProductCount, getCategories, getSuppliers, invalidate, version],
  );

  return <ReferenceDataContext.Provider value={value}>{children}</ReferenceDataContext.Provider>;
}

export function useReferenceData() {
  const ctx = useContext(ReferenceDataContext);
  if (!ctx) {
    throw new Error('useReferenceData must be used inside <ReferenceDataProvider>');
  }
  return ctx;
}
