import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { fetchBranchById } from '../../../api/branches.js';
import { fetchCategories } from '../../../api/categories.js';
import {
  fetchRequestBranches,
  getRecommendedProducts,
  saveDraft,
  searchRequestProducts,
  submitRequest,
} from '../../../api/purchaseRequests.js';
import { purchaseUnitLabel, unitLabel } from '../../../constants/productUnits.js';
import useDebouncedValue from '../../../hooks/useDebouncedValue.js';
import ProductCatalogPicker from './ProductCatalogPicker.jsx';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

const PAGE_SIZE = 20;

function normId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : id;
}

/**
 * Create / edit purchase request (mainly Branch Manager).
 * Catalog | Request lines side-by-side; Add suggested from low-stock API.
 */
export default function RequestFormModal({ open, onClose, editing, branchId, createdBy, onSaved }) {
  const lockedBranchId = branchId ? String(branchId) : '';
  const [branchName, setBranchName] = useState('');
  const [products, setProducts] = useState([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState(0);
  const [catalogTotalRecords, setCatalogTotalRecords] = useState(0);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword, 350);
  const [categoryId, setCategoryId] = useState('');
  const [stockSort, setStockSort] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categories, setCategories] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [recommended, setRecommended] = useState([]);
  const [recommendedError, setRecommendedError] = useState('');
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const reloadCatalog = useCallback(() => setReloadToken((k) => k + 1), []);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setReason(editing.reason || '');
      setLines(
        editing.items.map((it) => ({
          productId: normId(it.productId),
          itemId: it.id,
          productName: it.productName,
          productCode: it.productCode,
          unit: it.unit,
          requestedQuantity: it.requestedQuantity,
        })),
      );
      if (editing.branchName) setBranchName(editing.branchName);
    } else {
      setReason('');
      setLines([]);
    }
    setError('');
    setKeyword('');
    setCategoryId('');
    setStockSort('');
    setLowStockOnly(false);
    setCatalogPage(1);
  }, [open, editing]);

  useEffect(() => {
    if (!open || !lockedBranchId) return;
    fetchBranchById(lockedBranchId)
      .then((b) => setBranchName(b?.name || ''))
      .catch(() => {
        fetchRequestBranches()
          .then((branches) => {
            const match = branches.find((b) => String(b.id) === lockedBranchId);
            setBranchName(match?.name || '');
          })
          .catch(() => setBranchName(''));
      });
  }, [open, lockedBranchId]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    fetchCategories()
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setCategories(
          list
            .map((c) => ({ id: c.id, name: c.name }))
            .filter((c) => c.id != null && c.name)
            .sort((a, b) => String(a.name).localeCompare(String(b.name))),
        );
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    if (!lockedBranchId) {
      setRecommended([]);
      setRecommendedError('');
      setRecommendedLoading(false);
      return undefined;
    }
    let cancelled = false;
    setRecommendedLoading(true);
    setRecommendedError('');
    getRecommendedProducts(lockedBranchId)
      .then((rec) => {
        if (!cancelled) setRecommended(Array.isArray(rec) ? rec : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setRecommended([]);
          setRecommendedError(err?.message || 'Failed to load suggested products.');
        }
      })
      .finally(() => {
        if (!cancelled) setRecommendedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lockedBranchId, reloadToken]);

  useEffect(() => {
    if (!open) return undefined;
    if (!lockedBranchId) {
      setProducts([]);
      setCatalogTotalPages(0);
      setCatalogTotalRecords(0);
      setCatalogError('Your account is not linked to a branch. Contact an administrator.');
      setProductsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setProductsLoading(true);
    setCatalogError('');

    searchRequestProducts(debouncedKeyword, {
      page: catalogPage,
      size: PAGE_SIZE,
      categoryId: categoryId || undefined,
      stockSort: stockSort || undefined,
      lowStockOnly: lowStockOnly || undefined,
    })
      .then((page) => {
        if (cancelled) return;
        setProducts(page.items || []);
        setCatalogTotalPages(page.totalPages || 0);
        setCatalogTotalRecords(page.totalRecords || 0);
        if (!(page.items || []).length && !debouncedKeyword.trim() && !categoryId && !lowStockOnly) {
          setCatalogError('No catalog products available.');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setProducts([]);
        setCatalogTotalPages(0);
        setCatalogTotalRecords(0);
        setCatalogError(err?.message || 'Failed to load product catalog.');
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    lockedBranchId,
    debouncedKeyword,
    catalogPage,
    categoryId,
    stockSort,
    lowStockOnly,
    reloadToken,
  ]);

  const addedIds = useMemo(() => new Set(lines.map((l) => normId(l.productId))), [lines]);

  const suggestedByProductId = useMemo(() => {
    const map = new Map();
    for (const r of recommended) {
      map.set(normId(r.productId), r);
    }
    return map;
  }, [recommended]);

  const catalogProducts = useMemo(
    () =>
      products.map((p) => {
        const rec = suggestedByProductId.get(normId(p.id));
        if (!rec) return p;
        return {
          ...p,
          suggestedQty: rec.suggestedQty ?? p.suggestedQty,
          reorderPoint: rec.reorderPoint ?? p.reorderPoint,
          currentStock: rec.currentStock ?? p.currentStock,
          lowStock: true,
          topPackagingLabel: p.topPackagingLabel || rec.topPackagingLabel,
          unitsPerImportUnit: p.unitsPerImportUnit || rec.topPackagingConversionQty,
        };
      }),
    [products, suggestedByProductId],
  );

  const addableSuggested = useMemo(
    () => recommended.filter((r) => !addedIds.has(normId(r.productId))),
    [recommended, addedIds],
  );

  function addProducts(list, qtyResolver) {
    setLines((prev) => {
      const existing = new Set(prev.map((l) => normId(l.productId)));
      const additions = list
        .filter((p) => !existing.has(normId(p.id ?? p.productId)))
        .map((p) => {
          const id = normId(p.id ?? p.productId);
          return {
            productId: id,
            productName: p.name ?? p.productName,
            productCode: p.code ?? p.productCode,
            unit: p.importUnit || p.unit,
            retailUnit: p.unit,
            unitsPerImportUnit: p.unitsPerImportUnit,
            topPackagingLabel: p.topPackagingLabel,
            requestedQuantity: p.requestedQty ?? (qtyResolver ? qtyResolver(p) : 1),
          };
        });
      return [...prev, ...additions];
    });
  }

  function addSuggested() {
    addProducts(
      addableSuggested.map((r) => ({
        id: r.productId,
        name: r.name,
        code: r.code,
        unit: r.unit,
        topPackagingLabel: r.topPackagingLabel,
        unitsPerImportUnit: r.topPackagingConversionQty,
        suggestedQty: r.suggestedQty,
      })),
      (p) => p.suggestedQty || 1,
    );
  }

  function updateQty(productId, value) {
    const id = normId(productId);
    setLines((prev) =>
      prev.map((l) => (normId(l.productId) === id ? { ...l, requestedQuantity: value } : l)),
    );
  }

  function removeLine(productId) {
    const id = normId(productId);
    setLines((prev) => prev.filter((l) => normId(l.productId) !== id));
  }

  function buildPayload() {
    return {
      id: editing?.id,
      branchId: Number(lockedBranchId) || null,
      createdBy,
      reason: reason.trim(),
      items: lines.map((l) => ({
        id: l.itemId,
        productId: l.productId,
        requestedQuantity: Number(l.requestedQuantity) || 0,
      })),
    };
  }

  function validate() {
    if (!lockedBranchId) return 'Your account is not linked to a branch. Contact an administrator.';
    if (lines.length === 0) return 'Add at least one product to the request.';
    if (lines.some((l) => !Number(l.requestedQuantity) || Number(l.requestedQuantity) <= 0))
      return 'Requested quantity must be greater than zero.';
    return '';
  }

  async function handle(action, fn) {
    if (action === 'submit') {
      const msg = validate();
      if (msg) {
        setError(msg);
        return;
      }
    } else if (lines.length === 0) {
      setError('Add at least one product to save as draft.');
      return;
    }
    setBusy(action);
    setError('');
    try {
      await fn(buildPayload());
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to save request');
    } finally {
      setBusy('');
    }
  }

  function resetPageAndSet(setter) {
    return (value) => {
      setter(value);
      setCatalogPage(1);
    };
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${editing.code}` : 'Create purchase request'}
      description="Browse branch stock, filter the catalog, add suggested low-stock items, then submit for approval."
      size="viewport"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="default">{lines.length} products</Badge>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="ghost"
              className="border border-[var(--admin-border)]"
              loading={busy === 'draft'}
              disabled={!lockedBranchId}
              onClick={() => handle('draft', saveDraft)}
            >
              Save draft
            </Button>
            <Button
              loading={busy === 'submit'}
              disabled={!lockedBranchId}
              onClick={() => handle('submit', submitRequest)}
            >
              Submit for approval
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-col gap-4">
        {!lockedBranchId && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No branch assigned to your account — catalog and suggested products cannot load.
          </div>
        )}

        <div className="grid shrink-0 gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Branch
            </span>
            <input
              readOnly
              value={branchName || (lockedBranchId ? `Branch #${lockedBranchId}` : '—')}
              className={`${inputClass} bg-[#f7f9fb] text-[var(--admin-text)]`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Reason / notes
            </span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Restock fast-moving items for the weekend"
              className={inputClass}
            />
          </label>
        </div>

        {error && (
          <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2" style={{ minHeight: '28rem' }}>
          <div className="min-h-0 min-w-0">
            <p className="mb-2 text-sm font-semibold text-[var(--admin-text)]">Product catalog</p>
            <div className="h-[min(58vh,520px)]">
              <ProductCatalogPicker
                products={catalogProducts}
                excludedIds={addedIds}
                loading={productsLoading}
                loadError={catalogError}
                onRetry={reloadCatalog}
                keyword={keyword}
                onKeywordChange={resetPageAndSet(setKeyword)}
                categories={categories}
                categoryId={categoryId}
                onCategoryChange={resetPageAndSet(setCategoryId)}
                stockSort={stockSort}
                onStockSortChange={resetPageAndSet(setStockSort)}
                lowStockOnly={lowStockOnly}
                onLowStockOnlyChange={resetPageAndSet(setLowStockOnly)}
                addSuggestedCount={addableSuggested.length}
                addSuggestedBusy={recommendedLoading}
                addSuggestedError={recommendedError}
                onAddSuggested={addSuggested}
                onRetrySuggested={reloadCatalog}
                page={catalogPage}
                totalPages={catalogTotalPages}
                totalRecords={catalogTotalRecords}
                onPageChange={setCatalogPage}
                onAddMany={(picks) => addProducts(picks)}
              />
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col">
            <p className="mb-2 text-sm font-semibold text-[var(--admin-text)]">
              Request lines
              <span className="ml-2 text-xs font-normal text-[var(--admin-muted)]">
                Adjust quantities before submit
              </span>
            </p>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--admin-border)]">
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                    <tr>
                      <th className="px-3 py-2.5">Product</th>
                      <th className="px-3 py-2.5">Import unit</th>
                      <th className="px-3 py-2.5 text-right">Qty</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.productId} className="border-t border-[var(--admin-border)]">
                        <td className="px-3 py-2">
                          <div className="font-medium text-[var(--admin-text)]">{l.productName}</div>
                          <div className="font-mono text-xs text-[var(--admin-subtle)]">
                            {l.productCode}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[var(--admin-muted)]">
                          {l.topPackagingLabel || purchaseUnitLabel(l.unit)}
                          {l.unitsPerImportUnit ? (
                            <span className="block text-[10px] text-[var(--admin-subtle)]">
                              = {l.unitsPerImportUnit} {unitLabel(l.retailUnit || l.unit)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={1}
                            value={l.requestedQuantity}
                            onChange={(e) => updateQty(l.productId, e.target.value)}
                            className="w-20 rounded-lg border border-[var(--admin-border)] px-2 py-1 text-right text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(l.productId)}
                            className="rounded-md p-1 text-[var(--admin-subtle)] hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            >
                              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {lines.length === 0 && (
                  <p className="px-3 py-10 text-center text-sm text-[var(--admin-muted)]">
                    No products yet. Add from the catalog or use Add suggested.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
