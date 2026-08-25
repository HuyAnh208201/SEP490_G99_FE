import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import NavIcon from '../../components/layout/NavIcon.jsx';
import { unitLabel } from '../../constants/productUnits.js';
import { getFullCountSheet, submitCount } from '../../api/inventoryCount.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { isDemoIsEmail } from '../../lib/demoAccounts.js';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';

const inputClass =
  'w-24 rounded-lg border border-[var(--admin-border)] bg-white px-2 py-1.5 text-right text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';
const noteClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-2 py-1.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

const STORE_OPEN_HOUR = 7;
const STORE_CLOSE_HOUR = 22;

function isStoreOpen(now = new Date()) {
  const hour = now.getHours();
  return hour >= STORE_OPEN_HOUR && hour < STORE_CLOSE_HOUR;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default function InventoryCountPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirmSave = useSaveConfirmation();
  const [now, setNow] = useState(() => new Date());
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Real-time clock: re-evaluate lock state every second so the count sheet
  // unlocks automatically the moment the store closes.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const locked = isStoreOpen(now) && !isDemoIsEmail(user?.email);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getFullCountSheet({ size: 100 });
      setSheet(data);
      const initial = {};
      (data.products || []).forEach((p) => {
        initial[p.productId] = { counted: '', note: '' };
      });
      setForm(initial);
    } catch (err) {
      setError(err?.message || 'Failed to load count sheet');
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!locked) load();
  }, [locked, load]);

  const products = sheet?.products || [];

  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (term) {
        const hay = `${p.productCode || ''} ${p.productName || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [products, categoryFilter, search]);

  const countedTotal = useMemo(
    () => products.filter((p) => form[p.productId]?.counted !== '').length,
    [products, form],
  );
  const remaining = products.length - countedTotal;
  const varianceCount = useMemo(
    () =>
      products.filter((product) => {
        const value = variance(product);
        return value != null && value !== 0;
      }).length,
    [products, form],
  );

  function setField(productId, key, value) {
    setForm((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [key]: value },
    }));
  }

  function variance(product) {
    const entry = form[product.productId];
    if (!entry || entry.counted === '') return null;
    return Number(entry.counted) - (Number(product.systemQty) || 0);
  }

  async function submit() {
    setError('');
    const items = products
      .filter((p) => form[p.productId]?.counted !== '')
      .map((p) => ({
        productId: p.productId,
        countedQty: Number(form[p.productId]?.counted) || 0,
        note: form[p.productId]?.note?.trim() || undefined,
      }));
    if (!items.length) {
      setError('Enter at least one counted quantity before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await submitCount({ items });
      navigate('/catalog/products?countSubmitted=1');
    } catch (err) {
      setError(err?.message || 'Failed to submit inventory count');
    } finally {
      setSubmitting(false);
    }
  }

  async function requestSubmit() {
    const confirmed = await confirmSave({
      title: 'Confirm inventory count',
      message: `You are about to submit ${countedTotal} counted product(s).\n${varianceCount} product(s) have a variance from system stock.`,
      confirmLabel: 'Yes, submit count',
    });
    if (confirmed) submit();
  }

  if (locked) {
    return (
      <div className="w-full">
        <PageHeader
          title="Inventory Count"
          description="Record physical stock counts after store closing."
        />
        <Card>
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f4f8] text-[var(--admin-subtle)]">
              <NavIcon name="lock" className="h-6 w-6 stroke-current" />
            </span>
            <p className="text-lg font-semibold text-[var(--admin-text)]">Inventory Count Locked</p>
            <p className="max-w-md text-sm text-[var(--admin-muted)]">
              Inventory counting is available only after the store has closed. This page unlocks
              automatically at closing time.
            </p>
            <div className="rounded-lg border border-[var(--admin-border)] bg-[#f7f9fb]/60 px-4 py-2 text-sm text-[var(--admin-muted)]">
              Store hours: {pad2(STORE_OPEN_HOUR)}:00 – {pad2(STORE_CLOSE_HOUR)}:00 · Unlocks at{' '}
              {pad2(STORE_CLOSE_HOUR)}:00
            </div>
            <div className="text-sm text-[var(--admin-subtle)]">
              Current time:{' '}
              <span className="font-mono font-semibold text-[var(--admin-text)]">
                {pad2(now.getHours())}:{pad2(now.getMinutes())}:{pad2(now.getSeconds())}
              </span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Inventory Count"
        description="Record physical stock counts after store closing."
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <span className="text-[var(--admin-muted)]">
            Session:{' '}
            <strong className="font-mono text-[var(--admin-text)]">
              {sheet?.sessionCode || '—'}
            </strong>
          </span>
          <span className="text-[var(--admin-muted)]">
            Date: <strong className="text-[var(--admin-text)]">{sheet?.countDate || '—'}</strong>
          </span>
          <span className="text-[var(--admin-muted)]">
            Branch: <strong className="text-[var(--admin-text)]">{sheet?.branchName || '—'}</strong>
          </span>
          <span className="ml-auto text-[var(--admin-muted)]">
            <strong>{countedTotal}</strong> / {products.length} counted
          </span>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--admin-border)] px-4 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product code or name..."
            className={`${noteClass} w-64`}
          />
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={[
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  categoryFilter === c
                    ? 'bg-[var(--admin-brand)] text-white'
                    : 'border border-[var(--admin-border)] bg-white text-[var(--admin-muted)] hover:bg-[#f0f4f8]',
                ].join(' ')}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Product Code</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">System Qty</th>
                <th className="px-4 py-3 text-right">Counted Qty *</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : visibleProducts.map((p, idx) => {
                    const v = variance(p);
                    return (
                      <tr key={p.productId} className="border-t border-[var(--admin-border)]">
                        <td className="px-4 py-3 text-[var(--admin-subtle)]">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                          {p.productCode}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--admin-text)]">
                          {p.productName}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">{unitLabel(p.unit)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{p.systemQty ?? 0}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              value={form[p.productId]?.counted ?? ''}
                              onChange={(e) => setField(p.productId, 'counted', e.target.value)}
                              placeholder="—"
                              className={inputClass}
                            />
                            <button
                              type="button"
                              title="Fill from system qty"
                              onClick={() =>
                                setField(p.productId, 'counted', String(p.systemQty ?? 0))
                              }
                              className="rounded border border-[var(--admin-border)] bg-white px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#0058be] hover:bg-[#f0f6ff]"
                            >
                              Fill
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {v == null ? (
                            <span className="text-[var(--admin-subtle)]">—</span>
                          ) : (
                            <span
                              className={
                                v === 0
                                  ? 'text-[var(--admin-muted)]'
                                  : v > 0
                                    ? 'font-semibold text-emerald-600'
                                    : 'font-semibold text-red-600'
                              }
                            >
                              {v > 0 ? `+${v}` : v}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={form[p.productId]?.note ?? ''}
                            onChange={(e) => setField(p.productId, 'note', e.target.value)}
                            placeholder="Optional"
                            className={noteClass}
                          />
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && visibleProducts.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-[var(--admin-muted)]">
              No products match your filters.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--admin-border)] px-4 py-3">
          <span className="text-sm text-[var(--admin-muted)]">
            {remaining > 0
              ? `${remaining} item(s) still need a counted quantity`
              : 'All items counted'}
          </span>
          <Button
            className="ml-auto"
            loading={submitting}
            disabled={products.length === 0 || remaining > 0}
            onClick={requestSubmit}
          >
            Submit Inventory Count
          </Button>
        </div>
      </Card>
    </div>
  );
}
