import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import {
  fetchMembershipTiers,
  fetchShortDateCategories,
  updateMembershipTier,
  updateShortDateCategories,
} from '../../api/systemSettings.js';
import { fetchProductsPage, updateProduct } from '../../api/products.js';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';

const MODERN_TIER_CODES = new Set(['SILVER', 'GOLD', 'PLATINUM']);

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

function emptyForm() {
  return {
    name: '',
    minPoints: 0,
    maxPoints: '',
    pointMultiplier: 1,
    benefitsText: '',
    sortOrder: 0,
    active: true,
  };
}

function tierToForm(tier) {
  return {
    name: tier.name || '',
    minPoints: tier.minPoints ?? 0,
    maxPoints: tier.maxPoints == null ? '' : tier.maxPoints,
    pointMultiplier: tier.pointMultiplier ?? 1,
    benefitsText: Array.isArray(tier.benefits) ? tier.benefits.join('\n') : '',
    sortOrder: tier.sortOrder ?? 0,
    active: Boolean(tier.active),
  };
}

function formatRange(tier) {
  const min = tier.minPoints ?? 0;
  if (tier.maxPoints == null) return `${min}+ pts`;
  return `${min} – ${tier.maxPoints} pts`;
}

function isModernTier(tier) {
  return MODERN_TIER_CODES.has(String(tier?.code || '').toUpperCase());
}

function productRefundablePayload(product, refundable) {
  return {
    name: product.name,
    barcode: product.barcode || null,
    categoryId: product.categoryId,
    unit: product.unit,
    importUnit: product.importUnit,
    unitsPerImportUnit: product.unitsPerImportUnit,
    supplierId: product.supplierId,
    referenceImportPrice: product.referenceImportPrice,
    defaultSalePrice: product.defaultSalePrice,
    description: product.description || null,
    status: product.status,
    refundable,
  };
}

export default function SystemSettingsPage() {
  const confirmSave = useSaveConfirmation();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);
  const [selectedShortDateIds, setSelectedShortDateIds] = useState([]);
  const [shortDateLoading, setShortDateLoading] = useState(true);
  const [shortDateSaving, setShortDateSaving] = useState(false);
  const [shortDateMessage, setShortDateMessage] = useState('');

  const [refundSearch, setRefundSearch] = useState('');
  const [refundSavingIds, setRefundSavingIds] = useState(() => new Set());
  const debouncedRefundSearch = useDebouncedValue(refundSearch);
  const refundPageData = useServerPage(
    fetchProductsPage,
    { search: debouncedRefundSearch },
    { initialSize: 10 },
  );

  const visibleTiers = useMemo(
    () => tiers.filter(isModernTier).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [tiers],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMembershipTiers();
      setTiers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load membership tiers');
      setTiers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadShortDate = useCallback(async () => {
    setShortDateLoading(true);
    try {
      const data = await fetchShortDateCategories();
      const list = Array.isArray(data) ? data : [];
      setCategories(list);
      setSelectedShortDateIds(list.filter((c) => c.shortDate).map((c) => c.id));
    } catch (err) {
      setError(err?.message || 'Failed to load short-date categories');
      setCategories([]);
      setSelectedShortDateIds([]);
    } finally {
      setShortDateLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadShortDate();
  }, [load, loadShortDate]);

  function startEdit(tier) {
    setEditingId(tier.id);
    setForm(tierToForm(tier));
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function toggleShortDate(id) {
    setSelectedShortDateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setShortDateMessage('');
  }

  async function handleSaveShortDate() {
    const confirmed = await confirmSave({
      title: 'Confirm short-date settings',
      message: `Save short-date flags for ${selectedShortDateIds.length} categor${selectedShortDateIds.length === 1 ? 'y' : 'ies'}? This may clear central inventory for affected products.`,
      confirmLabel: 'Yes, save settings',
    });
    if (!confirmed) return;
    setShortDateSaving(true);
    setShortDateMessage('');
    setError('');
    try {
      const data = await updateShortDateCategories(selectedShortDateIds);
      const list = Array.isArray(data) ? data : [];
      setCategories(list);
      setSelectedShortDateIds(list.filter((c) => c.shortDate).map((c) => c.id));
      setShortDateMessage('Short-date categories saved. Central inventory cleared for those SKUs.');
    } catch (err) {
      setError(err?.message || 'Failed to save short-date categories');
    } finally {
      setShortDateSaving(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!editingId) return;
    const confirmed = await confirmSave({
      title: 'Confirm membership tier changes',
      message: `Save the updated rules for ${form.name.trim() || editingTier?.code || 'this tier'}?`,
      confirmLabel: 'Yes, save tier',
    });
    if (!confirmed) return;
    setSaving(true);
    setError('');
    try {
      const maxRaw = String(form.maxPoints).trim();
      const payload = {
        name: form.name.trim(),
        minPoints: Number(form.minPoints),
        maxPoints: maxRaw === '' ? null : Number(maxRaw),
        pointMultiplier: Number(form.pointMultiplier),
        benefits: String(form.benefitsText || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        sortOrder: Number(form.sortOrder),
        active: Boolean(form.active),
      };
      await updateMembershipTier(editingId, payload);
      cancelEdit();
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to save tier');
    } finally {
      setSaving(false);
    }
  }

  const editingTier = visibleTiers.find((t) => t.id === editingId);

  async function toggleRefundable(product, nextRefundable) {
    const productId = product.id;
    setRefundSavingIds((prev) => new Set(prev).add(productId));
    setError('');
    try {
      await updateProduct(productId, productRefundablePayload(product, nextRefundable));
      refundPageData.reload();
    } catch (err) {
      setError(err?.message || 'Failed to update refundable flag');
    } finally {
      setRefundSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader title="System settings" />

      {error ? <p className="text-sm text-amber-700">{error}</p> : null}

      <Card className="!p-0 overflow-hidden w-full">
        <div className="border-b border-[var(--admin-border)] px-4 py-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Short-date categories</h2>
          </div>
          <Button type="button" loading={shortDateSaving} onClick={handleSaveShortDate}>
            Save short-date flags
          </Button>
        </div>
        {shortDateMessage ? (
          <p className="border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            {shortDateMessage}
          </p>
        ) : null}
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shortDateLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-[#eceef0]" />
              ))
            : categories.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedShortDateIds.includes(c.id)}
                    onChange={() => toggleShortDate(c.id)}
                    disabled={c.active === false}
                  />
                  <span className={c.active === false ? 'text-[var(--admin-muted)]' : ''}>
                    {c.name}
                    {c.active === false ? ' (inactive)' : ''}
                  </span>
                </label>
              ))}
          {!shortDateLoading && categories.length === 0 ? (
            <p className="col-span-full text-sm text-[var(--admin-muted)]">No categories found.</p>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5 w-full">
        <Card className="lg:col-span-3 !p-0 overflow-hidden">
          <div className="border-b border-[var(--admin-border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Membership tiers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Range</th>
                  <th className="px-4 py-2 text-right">Multiplier</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--admin-border)]">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                        </td>
                      </tr>
                    ))
                  : visibleTiers.map((tier) => (
                      <tr key={tier.id} className="border-t border-[var(--admin-border)]">
                        <td className="px-4 py-2.5 font-mono text-xs text-[var(--admin-muted)]">
                          {tier.code}
                        </td>
                        <td className="px-4 py-2.5 font-medium">{tier.name}</td>
                        <td className="px-4 py-2.5 tabular-nums">{formatRange(tier)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{tier.pointMultiplier}×</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={tier.active ? 'success' : 'soon'}>
                            {tier.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            className="!px-3 !py-1.5 text-xs"
                            onClick={() => startEdit(tier)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                {!loading && visibleTiers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--admin-muted)]">
                      No membership tiers found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--admin-text)]">
            {editingTier ? `Edit ${editingTier.code}` : 'Edit tier'}
          </h2>
          {!editingId ? (
            <p className="mt-3 text-sm text-[var(--admin-muted)]">No tier selected.</p>
          ) : (
            <form className="mt-3 space-y-3" onSubmit={handleSave}>
              <label className="block text-xs font-semibold text-[var(--admin-subtle)]">
                Code
                <input className={`mt-1 ${inputClass}`} value={editingTier?.code || ''} disabled readOnly />
              </label>
              <label className="block text-xs font-semibold text-[var(--admin-subtle)]">
                Name
                <input
                  className={`mt-1 ${inputClass}`}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-[var(--admin-subtle)]">
                  Min points
                  <input
                    type="number"
                    min={0}
                    className={`mt-1 ${inputClass}`}
                    value={form.minPoints}
                    onChange={(e) => setForm((f) => ({ ...f, minPoints: e.target.value }))}
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-[var(--admin-subtle)]">
                  Max points
                  <input
                    type="number"
                    min={0}
                    placeholder="Open-ended"
                    className={`mt-1 ${inputClass}`}
                    value={form.maxPoints}
                    onChange={(e) => setForm((f) => ({ ...f, maxPoints: e.target.value }))}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-[var(--admin-subtle)]">
                  Multiplier
                  <input
                    type="number"
                    min={0.01}
                    step={0.1}
                    className={`mt-1 ${inputClass}`}
                    value={form.pointMultiplier}
                    onChange={(e) => setForm((f) => ({ ...f, pointMultiplier: e.target.value }))}
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-[var(--admin-subtle)]">
                  Sort order
                  <input
                    type="number"
                    min={0}
                    className={`mt-1 ${inputClass}`}
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-[var(--admin-subtle)]">
                Benefits (one per line)
                <textarea
                  rows={5}
                  className={`mt-1 ${inputClass}`}
                  value={form.benefitsText}
                  onChange={(e) => setForm((f) => ({ ...f, benefitsText: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--admin-text)]">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Active
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" loading={saving}>
                  Save tier
                </Button>
                <Button type="button" variant="secondary" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>

      <Card className="!p-0 overflow-hidden w-full">
        <div className="border-b border-[var(--admin-border)] px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Refundable products</h2>
          </div>
          <input
            type="search"
            value={refundSearch}
            onChange={(e) => setRefundSearch(e.target.value)}
            placeholder="Search products…"
            className={`max-w-xs ${inputClass}`}
          />
          <span className="text-xs text-[var(--admin-muted)] tabular-nums">
            {refundPageData.totalRecords} match{refundPageData.totalRecords === 1 ? '' : 'es'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2 text-right">Refundable</th>
              </tr>
            </thead>
            <tbody>
              {refundPageData.loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={3} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : refundPageData.items.map((product) => {
                    const savingRefund = refundSavingIds.has(product.id);
                    const isRefundable = product.refundable !== false;
                    return (
                      <tr key={product.id} className="border-t border-[var(--admin-border)]">
                        <td className="px-4 py-2.5 font-medium">{product.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-[var(--admin-muted)]">
                          {product.code || product.barcode || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <label className="inline-flex items-center gap-2 text-xs text-[var(--admin-muted)]">
                            <input
                              type="checkbox"
                              checked={isRefundable}
                              disabled={savingRefund}
                              onChange={(e) => toggleRefundable(product, e.target.checked)}
                              className="h-4 w-4 rounded border-[var(--admin-border)]"
                            />
                            <span>{isRefundable ? 'Yes' : 'No'}</span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
              {!refundPageData.loading && refundPageData.items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--admin-muted)]">
                    {debouncedRefundSearch
                      ? 'No products match your search.'
                      : 'Search for a product to manage refund eligibility.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination
          page={refundPageData.page}
          size={refundPageData.size}
          totalRecords={refundPageData.totalRecords}
          totalPages={refundPageData.totalPages}
          onPageChange={refundPageData.setPage}
          onSizeChange={refundPageData.setSize}
          disabled={refundPageData.loading}
        />
      </Card>
    </div>
  );
}
