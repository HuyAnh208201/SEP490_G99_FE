import { useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { fetchBranchById } from '../../../api/branches.js';
import { fetchBranchInventory } from '../../../api/inventory.js';
import {
  fetchRequestBranches,
  fetchRequestProducts,
  getRecommendedProducts,
  saveDraft,
  submitRequest,
} from '../../../api/purchaseRequests.js';
import { purchaseUnitLabel, unitLabel } from '../../../constants/productUnits.js';
import ProductCatalogPicker from './ProductCatalogPicker.jsx';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

/**
 * Create / edit purchase request (mainly Branch Manager).
 * BM can only create for their assigned branch.
 */
export default function RequestFormModal({ open, onClose, editing, branchId, createdBy, onSaved }) {
  const lockedBranchId = branchId ? String(branchId) : '';
  const [branchName, setBranchName] = useState('');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [recommended, setRecommended] = useState([]);
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !lockedBranchId) return undefined;
    let cancelled = false;
    setProductsLoading(true);

    Promise.all([
      fetchBranchInventory(lockedBranchId).catch(() => null),
      fetchRequestProducts().catch(() => []),
      getRecommendedProducts(lockedBranchId).catch(() => []),
    ])
      .then(([inventory, catalog, rec]) => {
        if (cancelled) return;
        const recommendedRows = Array.isArray(rec) ? rec : [];
        setRecommended(recommendedRows);

        if (Array.isArray(inventory) && inventory.length > 0) {
          setProducts(
            inventory.map((row) => ({
              id: row.productId,
              code: row.productCode,
              name: row.productName,
              unit: row.unit,
              categoryName: row.categoryName,
              currentStock: Number(row.quantity ?? 0),
              reorderPoint: row.reorderPoint != null ? Number(row.reorderPoint) : null,
            })),
          );
          return;
        }

        // Fallback: catalog only if inventory API unavailable
        const stockByProduct = new Map();
        recommendedRows.forEach((r) => {
          if (r.productId == null) return;
          stockByProduct.set(Number(r.productId), {
            currentStock: Number(r.currentStock ?? 0),
            reorderPoint: Number(r.reorderPoint ?? 0),
          });
        });
        setProducts(
          (Array.isArray(catalog) ? catalog : []).map((p) => {
            const stock = stockByProduct.get(Number(p.id));
            return {
              ...p,
              currentStock: stock ? stock.currentStock : p.currentStock ?? null,
              reorderPoint: stock ? stock.reorderPoint : p.reorderPoint ?? null,
            };
          }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setRecommended([]);
        }
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, lockedBranchId]);

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
    if (!open) return;
    if (editing) {
      setReason(editing.reason || '');
      setLines(
        editing.items.map((it) => ({
          productId: it.productId,
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
  }, [open, editing]);

  const addedIds = useMemo(() => new Set(lines.map((l) => l.productId)), [lines]);

  const addableRecommended = useMemo(
    () => recommended.filter((r) => !addedIds.has(r.productId)),
    [recommended, addedIds],
  );

  function addProducts(list, qtyResolver) {
    setLines((prev) => {
      const existing = new Set(prev.map((l) => l.productId));
      const additions = list
        .filter((p) => !existing.has(p.id ?? p.productId))
        .map((p) => {
          const id = p.id ?? p.productId;
          return {
            productId: id,
            productName: p.name ?? p.productName,
            productCode: p.code ?? p.productCode,
            unit: p.importUnit || p.unit,
            retailUnit: p.unit,
            unitsPerImportUnit: p.unitsPerImportUnit,
            requestedQuantity: qtyResolver ? qtyResolver(p) : 1,
          };
        });
      return [...prev, ...additions];
    });
  }

  function addRecommended(r) {
    addProducts(
      [{ id: r.productId, name: r.name, code: r.code, unit: r.unit }],
      () => r.suggestedQty || 1,
    );
  }

  function addAllRecommended() {
    addProducts(
      recommended.map((r) => ({
        id: r.productId,
        name: r.name,
        code: r.code,
        unit: r.unit,
        suggestedQty: r.suggestedQty,
      })),
      (p) => p.suggestedQty || 1,
    );
  }

  function updateQty(productId, value) {
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, requestedQuantity: value } : l)),
    );
  }

  function removeLine(productId) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${editing.code}` : 'Create purchase request'}
      description="Browse the full catalog with branch stock, select products, save as draft, or submit for approval."
      size="full"
    >
      <div className="max-h-[78vh] space-y-5 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Branch
            </span>
            <input
              readOnly
              value={branchName || (lockedBranchId ? `Branch #${lockedBranchId}` : '—')}
              className={`${inputClass} bg-[#f7f9fb] text-[var(--admin-text)]`}
            />
            <p className="text-xs text-[var(--admin-subtle)]">
              Requests are created for your assigned branch only.
            </p>
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

        <div className="grid gap-5 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <ProductCatalogPicker
              products={products}
              excludedIds={addedIds}
              loading={productsLoading}
              onAddMany={(picks) => addProducts(picks)}
            />

            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--admin-text)]">
                Request lines
                <span className="ml-2 text-xs font-normal text-[var(--admin-muted)]">
                  Set quantities after adding from the catalog
                </span>
              </p>
              <div className="overflow-hidden rounded-xl border border-[var(--admin-border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
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
                          {purchaseUnitLabel(l.unit)}
                          {l.unitsPerImportUnit ? (
                            <span className="block text-[10px] text-[var(--admin-subtle)]">
                              {l.unitsPerImportUnit} {unitLabel(l.retailUnit || l.unit)} /{' '}
                              {purchaseUnitLabel(l.unit)}
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
                  <p className="px-3 py-8 text-center text-sm text-[var(--admin-muted)]">
                    No products yet. Select from the catalog above or add from recommendations.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60">
              <div className="flex items-start justify-between gap-2 border-b border-[var(--admin-border)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--admin-text)]">Recommended products</p>
                  <p className="text-xs text-[var(--admin-subtle)]">Low stock — click to add.</p>
                </div>
                {addableRecommended.length > 0 && (
                  <Button
                    variant="secondary"
                    className="!px-2 !py-1 !text-xs shrink-0"
                    onClick={addAllRecommended}
                  >
                    Add all below
                  </Button>
                )}
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto p-3">
                {recommended.length === 0 && (
                  <p className="py-6 text-center text-xs text-[var(--admin-muted)]">
                    No products below reorder point.
                  </p>
                )}
                {recommended.map((r) => (
                  <div
                    key={r.productId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--admin-text)]">{r.name}</p>
                      <p className="text-[11px] text-[var(--admin-subtle)]">
                        Stock:{' '}
                        <span className="font-semibold text-red-600">{r.currentStock}</span> / Reorder{' '}
                        {r.reorderPoint} · Suggested{' '}
                        <span className="font-semibold text-[#0058be]">{r.suggestedQty}</span>
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className="!px-2 !py-1 !text-xs"
                      disabled={addedIds.has(r.productId)}
                      onClick={() => addRecommended(r)}
                    >
                      {addedIds.has(r.productId) ? 'Added' : '+ Add'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--admin-border)] pt-4">
          <Badge tone="default">{lines.length} products</Badge>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="ghost"
              className="border border-[var(--admin-border)]"
              loading={busy === 'draft'}
              onClick={() => handle('draft', saveDraft)}
            >
              Save draft
            </Button>
            <Button loading={busy === 'submit'} onClick={() => handle('submit', submitRequest)}>
              Submit for approval
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
