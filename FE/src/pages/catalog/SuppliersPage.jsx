import { useCallback, useEffect, useState } from 'react';
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliersPage,
  updateSupplier,
} from '../../api/suppliers.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

const EMPTY = {
  name: '',
  contactPerson: '',
  phone: '',
  address: '',
  status: 'active',
};

function fieldErrors(err) {
  if (err?.errors && typeof err.errors === 'object') {
    return Object.values(err.errors).join('. ');
  }
  return err?.message || 'Request failed';
}

export default function SuppliersPage() {
  const confirmSave = useSaveConfirmation();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(fetchSuppliersPage, { search: debouncedQuery, status: statusFilter });
  const [actionError, setActionError] = useState('');
  const { items, loading, reload: load } = pageData;
  const error = actionError || pageData.error;
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function startEdit(supplier) {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      status: supplier.status || 'active',
    });
    setFormError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const confirmed = await confirmSave({
      title: editingId ? 'Confirm supplier changes' : 'Confirm new supplier',
      message: editingId
        ? `Save the changes to ${form.name.trim() || 'this supplier'}?`
        : `Create ${form.name.trim() || 'this supplier'}?`,
      confirmLabel: editingId ? 'Yes, save changes' : 'Yes, create supplier',
    });
    if (!confirmed) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    };

    try {
      if (editingId) {
        await updateSupplier(editingId, { ...payload, status: form.status });
      } else {
        await createSupplier(payload);
      }
      cancelEdit();
      load();
    } catch (err) {
      setFormError(fieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleteTargetId(id);
  }

  async function confirmDelete() {
    const id = deleteTargetId;
    if (!id) return;
    try {
      await deleteSupplier(id);
      if (editingId === id) cancelEdit();
      load();
    } catch (err) {
      setActionError(fieldErrors(err));
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Suppliers"
        description="Step 3 — centralized supplier list for purchasing and warehouse operations."
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="text-base font-semibold text-[var(--admin-text)]">
            {editingId ? 'Edit supplier' : 'New supplier'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Supplier name *
              </span>
              <input
                required
                value={form.name}
                onChange={update('name')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Contact person
              </span>
              <input
                value={form.contactPerson}
                onChange={update('contactPerson')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Phone
              </span>
              <input
                value={form.phone}
                onChange={update('phone')}
                placeholder="0912345678"
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Address
              </span>
              <textarea
                rows={2}
                value={form.address}
                onChange={update('address')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>
            {editingId && (
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Status
                </span>
                <select
                  value={form.status}
                  onChange={update('status')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            )}
            {formError && (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>
                {editingId ? 'Save changes' : 'Create supplier'}
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
            <p className="text-sm text-[var(--admin-muted)]">Total <strong>{pageData.totalRecords}</strong> suppliers</p>
            <div className="flex flex-1 justify-end gap-2">
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search suppliers…" className="w-full max-w-xs rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm">
                <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Address</th>
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
                  : items.map((s) => (
                      <tr
                        key={s.id}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {s.contactPerson || '—'}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">{s.phone || '—'}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-[var(--admin-muted)]">
                          {s.address || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={s.status === 'active' ? 'success' : 'danger'}>
                            {s.status || '—'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1"
                              onClick={() => startEdit(s)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1 !text-red-600"
                              onClick={() => handleDelete(s.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!loading && items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                No suppliers yet.
              </p>
            )}
          </div>
          <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete supplier"
        message="Delete this supplier?"
        confirmLabel="Confirm"
        danger
      />
    </div>
  );
}
