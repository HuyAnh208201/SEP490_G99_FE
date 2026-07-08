import { useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import {
  fetchRequestBranches,
  fetchRequestProducts,
  getRecommendedProducts,
  saveDraft,
  submitRequest,
} from '../../../api/purchaseRequests.js';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

/**
 * Form tạo mới / chỉnh sửa yêu cầu nhập hàng (chỉ BM).
 * Trái: chọn/nhập sản phẩm + bảng đã chọn. Phải: tab "Sản phẩm gợi ý".
 */
export default function RequestFormModal({ open, onClose, editing, branchId, createdBy, onSaved }) {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(branchId || '');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState([]); // { productId, productName, productCode, unit, requestedQuantity }
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    Promise.all([fetchRequestBranches(), fetchRequestProducts()])
      .then(([b, p]) => {
        setBranches(b);
        setProducts(p);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSelectedBranch(editing.branchId);
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
    } else {
      setSelectedBranch(branchId || '');
      setReason('');
      setLines([]);
    }
    setError('');
    setSearch('');
  }, [open, editing, branchId]);

  useEffect(() => {
    if (!open) return;
    const bId = selectedBranch || branchId;
    getRecommendedProducts(bId).then(setRecommended).catch(() => setRecommended([]));
  }, [open, selectedBranch, branchId]);

  const addedIds = useMemo(() => new Set(lines.map((l) => l.productId)), [lines]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => !addedIds.has(p.id))
      .filter((p) => p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [search, products, addedIds]);

  function addProduct(p, qty = 1) {
    setLines((prev) => {
      if (prev.some((l) => l.productId === p.id)) return prev;
      return [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          productCode: p.code,
          unit: p.unit,
          requestedQuantity: qty,
        },
      ];
    });
  }

  function addRecommended(r) {
    addProduct(
      { id: r.productId, name: r.name, code: r.code, unit: r.unit },
      r.suggestedQty || 1,
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
      branchId: Number(selectedBranch) || branchId || null,
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
    if (!selectedBranch && !branchId) return 'Please select a branch.';
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
      description="Select products to import, save as draft, or submit for approval."
      size="xl"
    >
      <div className="max-h-[72vh] space-y-5 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Branch <span className="text-[var(--admin-danger)]">*</span>
            </span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className={inputClass}
            >
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
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
          {/* Cột trái: nhập sản phẩm + bảng đã chọn */}
          <div className="space-y-3 lg:col-span-3">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name or code…"
                className={inputClass}
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-[var(--admin-border)] bg-white shadow-lg">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        addProduct(p);
                        setSearch('');
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#f0f4f8]"
                    >
                      <span>
                        <span className="font-medium">{p.name}</span>{' '}
                        <span className="font-mono text-xs text-[var(--admin-subtle)]">{p.code}</span>
                      </span>
                      <span className="text-xs text-[#0058be]">+ Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--admin-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                  <tr>
                    <th className="px-3 py-2.5">Product</th>
                    <th className="px-3 py-2.5">Unit</th>
                    <th className="px-3 py-2.5 text-right">Qty</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.productId} className="border-t border-[var(--admin-border)]">
                      <td className="px-3 py-2">
                        <div className="font-medium text-[var(--admin-text)]">{l.productName}</div>
                        <div className="font-mono text-xs text-[var(--admin-subtle)]">{l.productCode}</div>
                      </td>
                      <td className="px-3 py-2 text-[var(--admin-muted)]">{l.unit}</td>
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
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
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
                  No products yet. Search above or quick-add from recommendations.
                </p>
              )}
            </div>
          </div>

          {/* Cột phải: sản phẩm gợi ý */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60">
              <div className="border-b border-[var(--admin-border)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--admin-text)]">Recommended products</p>
                <p className="text-xs text-[var(--admin-subtle)]">Low stock — click to quick-add.</p>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto p-3">
                {recommended.length === 0 && (
                  <p className="py-6 text-center text-xs text-[var(--admin-muted)]">No products below reorder point.</p>
                )}
                {recommended.map((r) => (
                  <div
                    key={r.productId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--admin-text)]">{r.name}</p>
                      <p className="text-[11px] text-[var(--admin-subtle)]">
                        Stock: <span className="font-semibold text-red-600">{r.currentStock}</span> / Reorder {r.reorderPoint} · Suggested{' '}
                        <span className="font-semibold text-[#0058be]">{r.suggestedQty}</span>
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className="!px-2 !py-1 !text-xs"
                      disabled={addedIds.has(r.productId)}
                      onClick={() => addRecommended(r)}
                    >
                      {addedIds.has(r.productId) ? 'Added' : '+ Quick add'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
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
