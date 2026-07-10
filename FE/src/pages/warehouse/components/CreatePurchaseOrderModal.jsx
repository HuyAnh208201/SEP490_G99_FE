import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import { unitLabel } from '../../../constants/productUnits.js';
import { formatVnd } from '../../../lib/money.js';
import {
  listRecommendedProducts,
  searchPurchaseProducts,
  createPurchaseOrder,
} from '../../../api/purchaseOrders.js';
import { fetchSuppliers } from '../../../api/suppliers.js';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function CreatePurchaseOrderModal({ open, onClose, onCreated }) {
  const [recommended, setRecommended] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  // lines: Map<productId, { productId, productCode, productName, unit, quantity, unitPrice }>
  const [lines, setLines] = useState(() => new Map());

  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rec, sup] = await Promise.all([listRecommendedProducts(), fetchSuppliers()]);
      setRecommended(Array.isArray(rec) ? rec : []);
      const supList = Array.isArray(sup) ? sup : sup?.listObjects || [];
      setSuppliers(supList.filter((s) => (s.status || 'active').toLowerCase() === 'active'));
    } catch (err) {
      setError(err?.message || 'Failed to load purchase order data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSupplierId('');
    setNotes('');
    setLines(new Map());
    setKeyword('');
    setResults([]);
    load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const term = keyword.trim();
    if (!term) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await searchPurchaseProducts(term);
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [keyword, open]);

  const lineList = useMemo(() => [...lines.values()], [lines]);
  const totalQty = useMemo(
    () => lineList.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
    [lineList],
  );
  const totalAmount = useMemo(
    () =>
      lineList.reduce(
        (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
        0,
      ),
    [lineList],
  );

  function addLine(product, suggestedQty) {
    setLines((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.productId);
      const qty = suggestedQty && suggestedQty > 0 ? suggestedQty : 1;
      if (existing) {
        next.set(product.productId, {
          ...existing,
          quantity: (Number(existing.quantity) || 0) + qty,
        });
      } else {
        next.set(product.productId, {
          productId: product.productId,
          productCode: product.productCode,
          productName: product.productName,
          unit: product.unit,
          quantity: qty,
          unitPrice: product.referencePrice != null ? Number(product.referencePrice) : '',
        });
      }
      return next;
    });
  }

  function addAllRecommended() {
    setLines((prev) => {
      const next = new Map(prev);
      recommended.forEach((product) => {
        if (!product.suggestedQty || product.suggestedQty <= 0) return;
        const existing = next.get(product.productId);
        if (existing) return;
        next.set(product.productId, {
          productId: product.productId,
          productCode: product.productCode,
          productName: product.productName,
          unit: product.unit,
          quantity: product.suggestedQty,
          unitPrice: product.referencePrice != null ? Number(product.referencePrice) : '',
        });
      });
      return next;
    });
  }

  function updateLine(productId, patch) {
    setLines((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId);
      if (existing) next.set(productId, { ...existing, ...patch });
      return next;
    });
  }

  function removeLine(productId) {
    setLines((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }

  async function handleSubmit() {
    setError('');
    if (!supplierId) {
      setError('Please select a supplier.');
      return;
    }
    const items = lineList
      .map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity) || 0,
        unitPrice: l.unitPrice === '' || l.unitPrice == null ? null : Number(l.unitPrice),
      }))
      .filter((it) => it.quantity > 0);
    if (!items.length) {
      setError('Add at least one product with a quantity greater than zero.');
      return;
    }
    setSubmitting(true);
    try {
      const order = await createPurchaseOrder({
        supplierId: Number(supplierId),
        notes: notes.trim() || null,
        items,
      });
      onCreated?.(order);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  }

  const availableRecommended = recommended.filter((r) => !lines.has(r.productId));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Purchase Order"
      description="Order stock from a supplier to replenish the central warehouse."
      size="xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Purchase order information */}
        <section className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={inputClass}
              disabled={loading}
            >
              <option value="">Select a supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note for this order"
              className={inputClass}
            />
          </div>
        </section>

        {/* Recommended products */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">
              Recommended products
              <span className="ml-2 text-xs font-normal text-[var(--admin-muted)]">
                (central stock is short)
              </span>
            </h3>
            {availableRecommended.length > 0 && (
              <Button
                variant="secondary"
                className="!px-3 !py-1 !text-xs"
                onClick={addAllRecommended}
              >
                Add all recommended
              </Button>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2 text-right">Current</th>
                  <th className="px-4 py-2 text-right">Required</th>
                  <th className="px-4 py-2 text-right">Suggested</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6">
                      <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                    </td>
                  </tr>
                ) : availableRecommended.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--admin-muted)]">
                      No recommended products. Central stock is sufficient.
                    </td>
                  </tr>
                ) : (
                  availableRecommended.map((r) => (
                    <tr key={r.productId} className="border-t border-[var(--admin-border)]">
                      <td className="px-4 py-2">
                        <div className="font-medium text-[var(--admin-text)]">{r.productName}</div>
                        <div className="font-mono text-xs text-[var(--admin-subtle)]">
                          {r.productCode}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-[var(--admin-muted)]">{r.categoryName || '—'}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-red-600">{r.currentQty}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.requiredQty}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">
                        {r.suggestedQty}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="secondary"
                          className="!px-3 !py-1 !text-xs"
                          onClick={() => addLine(r, r.suggestedQty)}
                        >
                          Add
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Manual product search */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-[var(--admin-text)]">Add product manually</h3>
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by product code or name…"
              className={inputClass}
            />
            {keyword.trim() && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-white shadow-lg">
                {searching ? (
                  <div className="px-4 py-3 text-sm text-[var(--admin-muted)]">Searching…</div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[var(--admin-muted)]">No products found.</div>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.productId}
                      type="button"
                      onClick={() => {
                        addLine(p, 1);
                        setKeyword('');
                        setResults([]);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-[#f7f9fb]"
                    >
                      <span>
                        <span className="font-medium text-[var(--admin-text)]">{p.productName}</span>
                        <span className="ml-2 font-mono text-xs text-[var(--admin-subtle)]">
                          {p.productCode}
                        </span>
                      </span>
                      <span className="text-xs text-[var(--admin-muted)]">
                        stock: {p.currentQty ?? 0}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {/* Purchase order products (selected) */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-[var(--admin-text)]">
            Purchase order products
            <span className="ml-2 text-xs font-normal text-[var(--admin-muted)]">
              ({lineList.length} product{lineList.length === 1 ? '' : 's'})
            </span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2 text-right">Quantity</th>
                  <th className="px-4 py-2 text-right">Unit price</th>
                  <th className="px-4 py-2 text-right">Line total</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {lineList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--admin-muted)]">
                      No products added yet. Use the recommendations or search above.
                    </td>
                  </tr>
                ) : (
                  lineList.map((l) => (
                    <tr key={l.productId} className="border-t border-[var(--admin-border)]">
                      <td className="px-4 py-2">
                        <div className="font-medium text-[var(--admin-text)]">{l.productName}</div>
                        <div className="font-mono text-xs text-[var(--admin-subtle)]">
                          {l.productCode}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-[var(--admin-muted)]">{unitLabel(l.unit)}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="1"
                          value={l.quantity}
                          onChange={(e) =>
                            updateLine(l.productId, { quantity: e.target.value })
                          }
                          className="w-20 rounded-lg border border-[var(--admin-border)] px-2 py-1 text-right text-sm focus:border-[#0058be] focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={l.unitPrice}
                          onChange={(e) =>
                            updateLine(l.productId, { unitPrice: e.target.value })
                          }
                          className="w-28 rounded-lg border border-[var(--admin-border)] px-2 py-1 text-right text-sm focus:border-[#0058be] focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatVnd((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(l.productId)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {lineList.length > 0 && (
                <tfoot>
                  <tr className="border-t border-[var(--admin-border)] bg-[#f7f9fb] font-semibold">
                    <td className="px-4 py-2" colSpan={2}>
                      Total
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{totalQty}</td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 text-right tabular-nums">{formatVnd(totalAmount)}</td>
                    <td className="px-4 py-2" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={submitting}
            disabled={lineList.length === 0 || !supplierId}
            onClick={handleSubmit}
          >
            Create Purchase Order
          </Button>
        </div>
      </div>
    </Modal>
  );
}
