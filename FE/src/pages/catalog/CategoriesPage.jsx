import { useCallback, useEffect, useState } from 'react';
import {
  activateCategory,
  createCategory,
  deactivateCategory,
  fetchCategories,
  fetchCategoriesPage,
  updateCategory,
} from '../../api/categories.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

const EMPTY = { name: '', description: '', parentId: '' };

export default function CategoriesPage() {
  const confirmSave = useSaveConfirmation();
  const [allCategories, setAllCategories] = useState([]);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(fetchCategoriesPage, {
    search: debouncedQuery,
    includeInactive: true,
  });
  const [actionError, setActionError] = useState('');
  const { items, loading, reload: load } = pageData;
  const error = actionError || pageData.error;
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const reloadParents = useCallback(() => {
    fetchCategories({ includeInactive: true })
      .then((data) => setAllCategories(Array.isArray(data) ? data : []))
      .catch(() => setAllCategories([]));
  }, []);

  useEffect(() => {
    reloadParents();
  }, [reloadParents]);

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      parentId: cat.parentId ?? '',
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
      title: editingId ? 'Confirm category changes' : 'Confirm new category',
      message: editingId
        ? `Save the changes to ${form.name.trim() || 'this category'}?`
        : `Create ${form.name.trim() || 'this category'} in the product catalog?`,
      confirmLabel: editingId ? 'Yes, save changes' : 'Yes, create category',
    });
    if (!confirmed) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      parentId: form.parentId ? Number(form.parentId) : null,
    };
    try {
      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await createCategory(payload);
      }
      cancelEdit();
      load();
      reloadParents();
    } catch (err) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeactivate() {
    const cat = deactivateTarget;
    if (!cat) return;
    try {
      await deactivateCategory(cat.id);
      if (editingId === cat.id) cancelEdit();
      load();
      reloadParents();
    } catch (err) {
      setActionError(err.message || 'Failed to deactivate category');
    } finally {
      setDeactivateTarget(null);
    }
  }

  async function handleActivate(id) {
    setActionError('');
    const confirmed = await confirmSave({
      title: 'Confirm category activation',
      message: 'Activate this category and make it available for product assignment?',
      confirmLabel: 'Yes, activate',
    });
    if (!confirmed) return;
    try {
      await activateCategory(id);
      load();
      reloadParents();
    } catch (err) {
      setActionError(err.message || 'Failed to activate category');
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Product categories"
        description="Step 1 of admin setup — create product groups before adding SKUs. Categories can be deactivated, not deleted."
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="text-base font-semibold text-[var(--admin-text)]">
            {editingId ? 'Edit category' : 'New category'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Name *
              </span>
              <input
                required
                value={form.name}
                onChange={updateField('name')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Parent category
              </span>
              <select
                value={form.parentId}
                onChange={updateField('parentId')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              >
                <option value="">None (top level)</option>
                {allCategories
                  .filter((c) => c.id !== editingId && c.active !== false)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-[var(--admin-subtle)]">
                Optional — use only when you need sub-groups (e.g. Beverages → Soft drinks).
              </p>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Description
              </span>
              <textarea
                rows={3}
                value={form.description}
                onChange={updateField('description')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>
            {formError && (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>
                {editingId ? 'Save changes' : 'Create category'}
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3">
            <p className="text-sm text-[var(--admin-muted)]">
              Total <strong>{pageData.totalRecords}</strong> categories
            </p>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="w-full max-w-xs rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Description</th>
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
                        <td className="px-4 py-3 font-medium">
                          {c.name}
                          {c.shortDate ? (
                            <span className="ml-2 text-xs font-normal text-amber-700">Short-date</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">{c.parentName || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge tone={c.active !== false ? 'success' : 'soon'}>
                            {c.active !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-[var(--admin-muted)]">
                          {c.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" className="!px-2 !py-1" onClick={() => startEdit(c)}>
                              Edit
                            </Button>
                            {c.active !== false ? (
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1 !text-amber-700"
                                onClick={() => setDeactivateTarget(c)}
                              >
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1 !text-[#0058be]"
                                onClick={() => handleActivate(c.id)}
                              >
                                Activate
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
                No categories yet. Create the first one using the form.
              </p>
            )}
          </div>
          <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
        title="Deactivate category"
        message={`Deactivate “${deactivateTarget?.name || 'this category'}”? It can be activated again later.`}
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
