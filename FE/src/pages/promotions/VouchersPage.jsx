import { useCallback, useEffect, useState } from 'react';
import {
  createVoucherCatalog,
  deleteVoucher,
  deleteVoucherCatalog,
  fetchVoucherCatalogs,
  fetchVoucherCatalogPage,
  fetchVouchersPage,
  issueVouchers,
  revokeVoucher,
  setVoucherCatalogStatus,
  updateVoucherCatalog,
} from '../../api/vouchers.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

const EMPTY_CATALOG = {
  name: '',
  discountType: 'FIXED',
  discountValue: '',
  pointsRequired: '0',
  status: 'active',
};

const EMPTY_ISSUE = {
  voucherCatalogId: '',
  customerId: '',
  codePrefix: '',
  quantity: '1',
  expiresAt: '',
};

const INPUT_CLASS =
  'w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

function fieldErrors(err) {
  if (err?.errors && typeof err.errors === 'object') {
    return Object.values(err.errors).join('. ');
  }
  return err?.message || 'Request failed';
}

function statusTone(status) {
  if (status === 'active') return 'success';
  if (status === 'used') return 'default';
  return 'danger';
}

function formatDiscount(type, value) {
  if (value === null || value === undefined) return '—';
  return type === 'PERCENT'
    ? `${Number(value)}%`
    : `${Number(value).toLocaleString('vi-VN')}đ`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
}

export default function VouchersPage() {
  const [tab, setTab] = useState('catalog');

  return (
    <div className="w-full">
      <PageHeader
        title="Discount codes"
        description="Định nghĩa loại giảm giá và phát mã cho khách dùng tại quầy."
      />

      <div className="mb-4 flex gap-2">
        <Button variant={tab === 'catalog' ? 'primary' : 'secondary'} onClick={() => setTab('catalog')}>
          Discount types
        </Button>
        <Button variant={tab === 'codes' ? 'primary' : 'secondary'} onClick={() => setTab('codes')}>
          Issued codes
        </Button>
      </div>

      {tab === 'catalog' ? <CatalogTab /> : <CodesTab />}
    </div>
  );
}

// =============================================================================
// Tab 1 — Voucher types
// =============================================================================

function CatalogTab() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(fetchVoucherCatalogPage, { search: debouncedQuery });
  const { items, loading, reload: load } = pageData;

  const [actionError, setActionError] = useState('');
  const [form, setForm] = useState(EMPTY_CATALOG);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const error = actionError || pageData.error;

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function startEdit(catalog) {
    setEditingId(catalog.id);
    setForm({
      name: catalog.name || '',
      discountType: catalog.discountType || 'FIXED',
      discountValue: String(catalog.discountValue ?? ''),
      pointsRequired: String(catalog.pointsRequired ?? 0),
      status: catalog.status || 'active',
    });
    setFormError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_CATALOG);
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      pointsRequired: Number(form.pointsRequired) || 0,
      status: form.status,
    };

    try {
      if (editingId) {
        await updateVoucherCatalog(editingId, payload);
      } else {
        await createVoucherCatalog(payload);
      }
      cancelEdit();
      load();
    } catch (err) {
      setFormError(fieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(catalog) {
    setActionError('');
    try {
      await setVoucherCatalogStatus(catalog.id, catalog.status === 'active' ? 'inactive' : 'active');
      load();
    } catch (err) {
      setActionError(fieldErrors(err));
    }
  }

  async function confirmDelete() {
    const id = deleteTargetId;
    if (!id) return;
    setActionError('');
    try {
      await deleteVoucherCatalog(id);
      if (editingId === id) cancelEdit();
      load();
    } catch (err) {
      setActionError(fieldErrors(err));
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="text-base font-semibold text-[var(--admin-text)]">
            {editingId ? 'Edit discount type' : 'New discount type'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Name *
              </span>
              <input required value={form.name} onChange={update('name')} className={INPUT_CLASS} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Discount type *
              </span>
              <select value={form.discountType} onChange={update('discountType')} className={INPUT_CLASS}>
                <option value="FIXED">Fixed amount (đ)</option>
                <option value="PERCENT">Percent (%)</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                {form.discountType === 'PERCENT' ? 'Percent (1–100) *' : 'Amount (đ) *'}
              </span>
              <input
                required
                type="number"
                min="1"
                max={form.discountType === 'PERCENT' ? '100' : undefined}
                value={form.discountValue}
                onChange={update('discountValue')}
                className={INPUT_CLASS}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Points required
              </span>
              <input
                type="number"
                min="0"
                value={form.pointsRequired}
                onChange={update('pointsRequired')}
                className={INPUT_CLASS}
              />
              <span className="text-xs text-[var(--admin-muted)]">
                Số điểm khách đổi để lấy mã. Để 0 nếu chỉ phát tay.
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Status
              </span>
              <select value={form.status} onChange={update('status')} className={INPUT_CLASS}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            {formError && (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>
                {editingId ? 'Save changes' : 'Create type'}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)] px-4 py-3">
            <p className="text-sm text-[var(--admin-muted)]">
              Total <strong>{pageData.totalRecords}</strong> discount types
            </p>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search types…"
              className="w-full max-w-xs rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--admin-border)]">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                        </td>
                      </tr>
                    ))
                  : items.map((c) => (
                      <tr key={c.id} className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80">
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3">{formatDiscount(c.discountType, c.discountValue)}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">{c.pointsRequired || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge tone={statusTone(c.status)}>{c.status || '—'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" className="!px-2 !py-1" onClick={() => startEdit(c)}>
                              Edit
                            </Button>
                            <Button variant="ghost" className="!px-2 !py-1" onClick={() => toggleStatus(c)}>
                              {c.status === 'active' ? 'Disable' : 'Enable'}
                            </Button>
                            {/* A type with issued codes cannot be deleted — the server refuses, so hide the button. */}
                            {!c.inUse && (
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1 !text-red-600"
                                onClick={() => setDeleteTargetId(c.id)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!loading && items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                No discount types yet.
              </p>
            )}
          </div>
          <Pagination
            {...pageData}
            onPageChange={pageData.setPage}
            onSizeChange={pageData.setSize}
            disabled={loading}
          />
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete discount type"
        message="Delete this discount type?"
        confirmLabel="Confirm"
        danger
      />
    </>
  );
}

// =============================================================================
// Tab 2 — Issued codes
// =============================================================================

function CodesTab() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [catalogFilter, setCatalogFilter] = useState('all');
  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(fetchVouchersPage, {
    search: debouncedQuery,
    status: statusFilter,
    voucherCatalogId: catalogFilter,
  });
  const { items, loading, reload: load } = pageData;

  const [catalogs, setCatalogs] = useState([]);
  const [form, setForm] = useState(EMPTY_ISSUE);
  const [issuing, setIssuing] = useState(false);
  const [formError, setFormError] = useState('');
  const [issuedCodes, setIssuedCodes] = useState([]);
  const [actionError, setActionError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const error = actionError || pageData.error;

  const loadCatalogs = useCallback(async () => {
    try {
      setCatalogs(await fetchVoucherCatalogs());
    } catch {
      // The type list is only a hint; a failed load must not block the whole page.
    }
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  const isPersonal = Boolean(form.customerId.trim());

  async function handleIssue(e) {
    e.preventDefault();
    setFormError('');
    setIssuedCodes([]);
    setIssuing(true);

    try {
      const created = await issueVouchers({
        voucherCatalogId: Number(form.voucherCatalogId),
        customerId: form.customerId.trim() ? Number(form.customerId) : null,
        codePrefix: form.codePrefix.trim() || null,
        // A code tied to one customer is always a single code — the server enforces it too.
        quantity: isPersonal ? 1 : Number(form.quantity) || 1,
        expiresAt: form.expiresAt ? `${form.expiresAt}T23:59:59` : null,
      });
      setIssuedCodes(created.map((v) => v.code));
      setForm({ ...EMPTY_ISSUE, voucherCatalogId: form.voucherCatalogId });
      load();
    } catch (err) {
      setFormError(fieldErrors(err));
    } finally {
      setIssuing(false);
    }
  }

  async function handleRevoke(id) {
    setActionError('');
    try {
      await revokeVoucher(id);
      load();
    } catch (err) {
      setActionError(fieldErrors(err));
    }
  }

  async function confirmDelete() {
    const id = deleteTargetId;
    if (!id) return;
    setActionError('');
    try {
      await deleteVoucher(id);
      load();
    } catch (err) {
      setActionError(fieldErrors(err));
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="text-base font-semibold text-[var(--admin-text)]">Issue codes</h2>
          <form onSubmit={handleIssue} className="mt-4 space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Discount type *
              </span>
              <select
                required
                value={form.voucherCatalogId}
                onChange={update('voucherCatalogId')}
                className={INPUT_CLASS}
              >
                <option value="">Select a type…</option>
                {catalogs
                  .filter((c) => c.status === 'active')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {formatDiscount(c.discountType, c.discountValue)}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Customer ID
              </span>
              <input
                type="number"
                min="1"
                value={form.customerId}
                onChange={update('customerId')}
                className={INPUT_CLASS}
              />
              <span className="text-xs text-[var(--admin-muted)]">
                Để trống nghĩa là mã dùng chung, ai cũng áp được.
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Code prefix
              </span>
              <input
                value={form.codePrefix}
                onChange={update('codePrefix')}
                placeholder="VC"
                className={INPUT_CLASS}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Quantity
              </span>
              <input
                type="number"
                min="1"
                max="200"
                value={isPersonal ? '1' : form.quantity}
                onChange={update('quantity')}
                disabled={isPersonal}
                className={`${INPUT_CLASS} disabled:bg-[#f7f9fb]`}
              />
              {isPersonal && (
                <span className="text-xs text-[var(--admin-muted)]">
                  Mã phát riêng cho khách chỉ sinh được 1.
                </span>
              )}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Expires on *
              </span>
              <input
                required
                type="date"
                value={form.expiresAt}
                onChange={update('expiresAt')}
                className={INPUT_CLASS}
              />
            </label>
            {formError && (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}
            {issuedCodes.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Issued {issuedCodes.length} code(s)
                </p>
                <p className="mt-1 break-words font-mono text-sm text-emerald-900">
                  {issuedCodes.join(', ')}
                </p>
              </div>
            )}
            <Button type="submit" loading={issuing}>
              Issue codes
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)] px-4 py-3">
            <p className="text-sm text-[var(--admin-muted)]">
              Total <strong>{pageData.totalRecords}</strong> codes
            </p>
            <div className="flex flex-1 flex-wrap justify-end gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search code…"
                className="w-full max-w-[14rem] rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
              />
              <select
                value={catalogFilter}
                onChange={(e) => setCatalogFilter(e.target.value)}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
              >
                <option value="all">All types</option>
                {catalogs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="used">Used</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--admin-border)]">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                        </td>
                      </tr>
                    ))
                  : items.map((v) => (
                      <tr key={v.id} className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80">
                        <td className="px-4 py-3 font-mono font-medium">{v.code}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {v.catalogName || '—'}
                          <span className="ml-1 text-xs">
                            ({formatDiscount(v.discountType, v.discountValue)})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {v.customerName ? `${v.customerName} · ${v.customerPhone}` : 'Shared'}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">{formatDate(v.expiresAt)}</td>
                        <td className="px-4 py-3">
                          <Badge tone={statusTone(v.status)}>{v.status || '—'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {/* A used code must stay as it is so it can be reconciled against the invoice. */}
                            {v.status === 'active' && (
                              <>
                                <Button
                                  variant="ghost"
                                  className="!px-2 !py-1"
                                  onClick={() => handleRevoke(v.id)}
                                >
                                  Revoke
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="!px-2 !py-1 !text-red-600"
                                  onClick={() => setDeleteTargetId(v.id)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!loading && items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                No codes issued yet.
              </p>
            )}
          </div>
          <Pagination
            {...pageData}
            onPageChange={pageData.setPage}
            onSizeChange={pageData.setSize}
            disabled={loading}
          />
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete discount code"
        message="Delete this unused code?"
        confirmLabel="Confirm"
        danger
      />
    </>
  );
}
