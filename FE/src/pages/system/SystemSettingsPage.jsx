import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  fetchMembershipTiers,
  fetchShortDateCategories,
  updateMembershipTier,
  updateShortDateCategories,
} from '../../api/systemSettings.js';

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

export default function SystemSettingsPage() {
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

  const editingTier = tiers.find((t) => t.id === editingId);

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="System settings"
        description="Membership tiers and short-date category flags. Short-date goods are not stored in central warehouse inventory."
      />

      {error ? <p className="text-sm text-amber-700">{error}</p> : null}

      <Card className="!p-0 overflow-hidden w-full">
        <div className="border-b border-[var(--admin-border)] px-4 py-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Short-date categories</h2>
            <p className="text-xs text-[var(--admin-muted)]">
              Flag perishable categories (frozen, fresh, ready-to-eat). When shipping, WM must pick
              suppliers for requests that include these categories.
            </p>
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
            <p className="text-xs text-[var(--admin-muted)]">
              Edit Silver / Gold / Platinum thresholds, multipliers, and benefits. Codes are fixed.
            </p>
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
                  : tiers.map((tier) => (
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
                {!loading && tiers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--admin-muted)]">
                      No membership tiers found. Start the customer service once to seed defaults.
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
            <p className="mt-3 text-sm text-[var(--admin-muted)]">
              Select a tier from the table to update name, point range, multiplier, and benefits.
            </p>
          ) : (
            <form className="mt-3 space-y-3" onSubmit={handleSave}>
              <p className="text-xs text-[var(--admin-muted)]">
                Code <span className="font-mono font-semibold">{editingTier?.code}</span> cannot be
                changed.
              </p>
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
    </div>
  );
}
