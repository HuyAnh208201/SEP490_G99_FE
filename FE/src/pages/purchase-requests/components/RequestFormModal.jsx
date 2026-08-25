import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Card from '../../../components/ui/Card.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
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
import { formatVnd, importUnitCost, lineImportCost } from '../../../lib/money.js';
import useDebouncedValue from '../../../hooks/useDebouncedValue.js';
import ProductCatalogPicker from './ProductCatalogPicker.jsx';
import { useSaveConfirmation } from '../../../contexts/SaveConfirmationContext.jsx';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

const qtyInputClass =
  'w-full min-w-0 rounded-lg border border-[var(--admin-border)] bg-white px-2.5 py-2 text-right text-sm tabular-nums focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

const PAGE_SIZE = 20;

function normId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : id;
}

/**
 * Create / edit purchase request (mainly Branch Manager).
 * Catalog above request lines; costs use TOP packaging (import unit) math.
 */
export default function RequestFormModal({ editing, branchId, createdBy, onClose, onSaved }) {
  const confirmSave = useSaveConfirmation();
  const lockedBranchId = branchId ? String(branchId) : '';
  const [branchName, setBranchName] = useState('');
  const [products, setProducts] = useState([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState(0);
  const [catalogTotalRecords, setCatalogTotalRecords] = useState(0);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword, 350);
  const [categoryId, setCategoryId] = useState('');
  const [stockSort, setStockSort] = useState('asc');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categories, setCategories] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [recommended, setRecommended] = useState([]);
  const [recommendedError, setRecommendedError] = useState('');
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [desiredReceiveDate, setDesiredReceiveDate] = useState('');
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [catalogReloadToken, setCatalogReloadToken] = useState(0);
  const [recommendedReloadToken, setRecommendedReloadToken] = useState(0);
  /** True after the first catalog attempt for this open cycle (gates recommended load). */
  const [initialCatalogSettled, setInitialCatalogSettled] = useState(false);

  const reloadCatalog = useCallback(() => setCatalogReloadToken((k) => k + 1), []);
  const reloadRecommended = useCallback(() => setRecommendedReloadToken((k) => k + 1), []);

  useEffect(() => {
    if (editing) {
      setReason(editing.reason || '');
      setDesiredReceiveDate(editing.desiredReceiveDate || '');
      setLines(
        (editing.items || []).map((it) => ({
          productId: normId(it.productId),
          itemId: it.id,
          productName: it.productName,
          productCode: it.productCode,
          unit: it.unit,
          retailUnit: it.unit,
          unitsPerImportUnit: it.unitsPerImportUnit ?? it.topPackagingConversionQty ?? 1,
          topPackagingLabel: it.topPackagingLabel,
          unitCost: it.unitCost ?? it.referenceImportPrice ?? null,
          referenceImportPrice: it.referenceImportPrice ?? it.unitCost ?? null,
          requestedQuantity: it.requestedQuantity,
        })),
      );
      if (editing.branchName) setBranchName(editing.branchName);
    } else {
      setReason('');
      setDesiredReceiveDate('');
      setLines([]);
    }
    setError('');
    setKeyword('');
    setCategoryId('');
    setStockSort('asc');
    setLowStockOnly(false);
    setCatalogPage(1);
    setInitialCatalogSettled(false);
  }, [editing]);

  useEffect(() => {
    if (!lockedBranchId) return;
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
  }, [lockedBranchId]);

  useEffect(() => {
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
  }, []);

  // Catalog loads first; recommended waits until catalog settles to avoid DB contention.
  useEffect(() => {
    if (!lockedBranchId) {
      setProducts([]);
      setCatalogTotalPages(0);
      setCatalogTotalRecords(0);
      setCatalogError('Your account is not linked to a branch. Contact an administrator.');
      setProductsLoading(false);
      setInitialCatalogSettled(true);
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
        if (!cancelled) {
          setProductsLoading(false);
          setInitialCatalogSettled(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    lockedBranchId,
    debouncedKeyword,
    catalogPage,
    categoryId,
    stockSort,
    lowStockOnly,
    catalogReloadToken,
  ]);

  useEffect(() => {
    if (!lockedBranchId) {
      setRecommended([]);
      setRecommendedError('');
      setRecommendedLoading(false);
      return undefined;
    }
    // Wait for the first catalog attempt so suggested products do not compete on open.
    if (!initialCatalogSettled) return undefined;

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
          setRecommendedError(err?.message || 'Suggested products unavailable. Catalog still works.');
        }
      })
      .finally(() => {
        if (!cancelled) setRecommendedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lockedBranchId, initialCatalogSettled, recommendedReloadToken]);

  const addedIds = useMemo(() => new Set(lines.map((l) => normId(l.productId))), [lines]);

  const suggestedByProductId = useMemo(() => {
    const map = new Map();
    for (const r of recommended) {
      map.set(normId(r.productId), r);
    }
    return map;
  }, [recommended]);

  const catalogByProductId = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      map.set(normId(p.id), p);
    }
    return map;
  }, [products]);

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
          soldLast30Days: rec.soldLast30Days,
          priorityReason: rec.priorityReason,
          topPackagingLabel: p.topPackagingLabel || rec.topPackagingLabel,
          unitsPerImportUnit: p.unitsPerImportUnit || rec.topPackagingConversionQty,
          unitCost: p.unitCost ?? p.referenceImportPrice ?? rec.unitCost ?? rec.referenceImportPrice ?? null,
          referenceImportPrice:
            p.referenceImportPrice ?? p.unitCost ?? rec.referenceImportPrice ?? rec.unitCost ?? null,
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
          const fromCatalog = catalogByProductId.get(id);
          const baseCost =
            p.unitCost ??
            p.referenceImportPrice ??
            fromCatalog?.unitCost ??
            fromCatalog?.referenceImportPrice ??
            null;
          const conversion =
            p.unitsPerImportUnit ??
            p.topPackagingConversionQty ??
            fromCatalog?.unitsPerImportUnit ??
            fromCatalog?.topPackagingConversionQty ??
            1;
          return {
            productId: id,
            productName: p.name ?? p.productName,
            productCode: p.code ?? p.productCode,
            unit: p.importUnit || p.unit,
            retailUnit: p.unit ?? fromCatalog?.unit,
            unitsPerImportUnit: conversion,
            topPackagingLabel: p.topPackagingLabel || fromCatalog?.topPackagingLabel,
            unitCost: baseCost,
            referenceImportPrice: baseCost,
            requestedQuantity: p.requestedQty ?? (qtyResolver ? qtyResolver(p) : 1),
          };
        });
      return [...prev, ...additions];
    });
  }

  const grandTotal = useMemo(
    () => lines.reduce((sum, line) => sum + lineImportCost(line, line.requestedQuantity), 0),
    [lines],
  );

  function addSuggested() {
    addProducts(
      addableSuggested.map((r) => {
        const fromCatalog = catalogByProductId.get(normId(r.productId));
        const baseCost =
          r.unitCost ??
          r.referenceImportPrice ??
          fromCatalog?.unitCost ??
          fromCatalog?.referenceImportPrice ??
          null;
        return {
          id: r.productId,
          name: r.name,
          code: r.code,
          unit: r.unit,
          topPackagingLabel: r.topPackagingLabel || fromCatalog?.topPackagingLabel,
          unitsPerImportUnit:
            r.topPackagingConversionQty ?? fromCatalog?.unitsPerImportUnit ?? 1,
          unitCost: baseCost,
          referenceImportPrice: baseCost,
          suggestedQty: r.suggestedQty,
        };
      }),
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
      desiredReceiveDate: desiredReceiveDate || null,
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
    if (!desiredReceiveDate) return 'Enter the desired receive date before submitting.';
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
    const confirmed = await confirmSave({
      title: action === 'submit' ? 'Confirm request submission' : 'Confirm draft changes',
      message:
        action === 'submit'
          ? `Submit this purchase request with ${lines.length} product line(s) for approval?`
          : `Save this purchase request with ${lines.length} product line(s) as a draft?`,
      confirmLabel: action === 'submit' ? 'Yes, submit request' : 'Yes, save draft',
    });
    if (!confirmed) return;
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
    <div className="w-full">
      <PageHeader
        title={editing ? `Edit ${editing.code}` : 'Create purchase request'}
        description="Prioritize low-stock and fast-selling products, then set the date the branch needs delivery."
      />

      <Card className="space-y-4">
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
              Desired receive date
            </span>
            <input
              type="date"
              value={desiredReceiveDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDesiredReceiveDate(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        {error && (
          <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-0 min-w-0">
            <p className="mb-2 text-sm font-semibold text-[var(--admin-text)]">Product catalog</p>
            <div className="h-[min(42vh,380px)]">
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
                onRetrySuggested={reloadRecommended}
                page={catalogPage}
                totalPages={catalogTotalPages}
                totalRecords={catalogTotalRecords}
                onPageChange={setCatalogPage}
                onAddMany={(picks) => addProducts(picks)}
              />
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Request lines</p>
              <Badge tone="default">{lines.length} products</Badge>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--admin-border)]">
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-full table-fixed text-left text-sm">
                  <colgroup>
                    <col />
                    <col className="w-[10rem]" />
                    <col className="w-[8.5rem]" />
                    <col className="w-[7.5rem]" />
                    <col className="w-[8.5rem]" />
                    <col className="w-[2.75rem]" />
                  </colgroup>
                  <thead className="sticky top-0 bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                    <tr>
                      <th className="px-3 py-2.5">Product</th>
                      <th className="px-3 py-2.5">Import unit</th>
                      <th className="px-3 py-2.5 text-right">Unit cost</th>
                      <th className="px-3 py-2.5 text-right">Qty</th>
                      <th className="px-3 py-2.5 text-right">Line cost</th>
                      <th className="px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => {
                      const packCost = importUnitCost(l);
                      return (
                        <tr key={l.productId} className="border-t border-[var(--admin-border)]">
                          <td className="min-w-0 px-3 py-2.5">
                            <div className="truncate font-medium text-[var(--admin-text)]">
                              {l.productName}
                            </div>
                            <div className="font-mono text-xs text-[var(--admin-subtle)]">
                              {l.productCode}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-[var(--admin-muted)]">
                            <span className="block leading-snug">
                              {l.topPackagingLabel || purchaseUnitLabel(l.unit)}
                            </span>
                            {l.unitsPerImportUnit ? (
                              <span className="block text-[10px] leading-snug text-[var(--admin-subtle)]">
                                = {l.unitsPerImportUnit} {unitLabel(l.retailUnit || l.unit)}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-[var(--admin-muted)]">
                            {packCost != null ? formatVnd(packCost) : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={1}
                              value={l.requestedQuantity}
                              onChange={(e) => updateQty(l.productId, e.target.value)}
                              className={qtyInputClass}
                              aria-label={`Quantity for ${l.productName}`}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[var(--admin-text)]">
                            {packCost != null
                              ? formatVnd(lineImportCost(l, l.requestedQuantity))
                              : '—'}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(l.productId)}
                              className="inline-flex rounded-md p-1.5 text-[var(--admin-subtle)] hover:bg-red-50 hover:text-red-600"
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
                      );
                    })}
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

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Reason / notes
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Restock fast-moving items for the weekend"
            className={inputClass}
          />
        </label>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] bg-white px-1 pt-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Est. import total
            </p>
            <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--admin-text)]">
              {formatVnd(grandTotal)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
      </Card>
    </div>
  );
}
