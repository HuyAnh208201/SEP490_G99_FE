import { useCallback, useEffect, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  fetchCategoriesPage,
  updateCategory,
} from '../../api/categories.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

const EMPTY = { name: '', description: '', parentId: '' };

export default function CategoriesPage() {
  const [allCategories, setAllCategories] = useState([]);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(fetchCategoriesPage, { search: debouncedQuery });
  const [actionError, setActionError] = useState('');
  const { items, loading, reload: load } = pageData;
  const error = actionError || pageData.error;
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchCategories().then((data) => setAllCategories(Array.isArray(data) ? data : [])).catch(() => setAllCategories([]));
  }, []);

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
      fetchCategories().then((data) => setAllCategories(Array.isArray(data) ? data : [])).catch(() => {});
    } catch (err) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      if (editingId === id) cancelEdit();
      load();
    } catch (err) {
      setActionError(err.message || 'Failed to delete category');
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Product categories"
        description="Step 1 of admin setup — create product groups before adding SKUs."
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
                  .filter((c) => c.id !== editingId)
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
            <p className="text-sm text-[var(--admin-muted)]">Total <strong>{pageData.totalRecords}</strong> categories</p>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories…" className="w-full max-w-xs rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--admin-border)]">
                        <td colSpan={4} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                        </td>
                      </tr>
                    ))
                  : items.map((c) => (
                      <tr key={c.id} className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80">
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {c.parentName || '—'}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-[var(--admin-muted)]">
                          {c.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" className="!px-2 !py-1" onClick={() => startEdit(c)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1 !text-red-600"
                              onClick={() => handleDelete(c.id)}
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
                No categories yet. Create the first one using the form.
              </p>
            )}
          </div>
          <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
        </Card>
      </div>
    </div>
  );
}
