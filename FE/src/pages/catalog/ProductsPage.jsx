import { useCallback, useEffect, useState } from 'react';
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from '../../api/products.js';
import { fetchCategories } from '../../api/categories.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

const EMPTY = {
  code: '',
  name: '',
  barcode: '',
  categoryId: '',
  unit: 'pcs',
  referenceImportPrice: '',
  defaultSalePrice: '',
  description: '',
  status: 'active',
};

function formatMoney(value) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('vi-VN');
}

function fieldErrors(err) {
  if (err?.errors && typeof err.errors === 'object') {
    return Object.values(err.errors).join('. ');
  }
  return err?.message || 'Request failed';
}

export default function ProductsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [products, cats] = await Promise.all([fetchProducts(), fetchCategories()]);
      setItems(Array.isArray(products) ? products : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      setError(fieldErrors(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      code: product.code || '',
      name: product.name || '',
      barcode: product.barcode || '',
      categoryId: product.categoryId ?? '',
      unit: product.unit || 'pcs',
      referenceImportPrice: product.referenceImportPrice ?? '',
      defaultSalePrice: product.defaultSalePrice ?? '',
      description: product.description || '',
      status: product.status || 'active',
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
      barcode: form.barcode.trim() || null,
      categoryId: Number(form.categoryId),
      unit: form.unit.trim() || 'pcs',
      referenceImportPrice: Number(form.referenceImportPrice),
      defaultSalePrice: Number(form.defaultSalePrice),
      description: form.description.trim() || null,
    };

    try {
      if (editingId) {
        await updateProduct(editingId, { ...payload, status: form.status });
      } else {
        await createProduct({ ...payload, code: form.code.trim() });
      }
      cancelEdit();
      await load();
    } catch (err) {
      setFormError(fieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      if (editingId === id) cancelEdit();
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Products"
        description="Step 2 of admin setup — SKU catalog synced with POST /api/products."
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="text-base font-semibold text-[var(--admin-text)]">
            {editingId ? 'Edit product' : 'New product'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {!editingId && (
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Product code *
                </span>
                <input
                  required
                  value={form.code}
                  onChange={update('code')}
                  placeholder="SKU-001"
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
            )}
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Name *
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
                Barcode
              </span>
              <input
                value={form.barcode}
                onChange={update('barcode')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Category *
              </span>
              <select
                required
                value={form.categoryId}
                onChange={update('categoryId')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Import price *
                </span>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={form.referenceImportPrice}
                  onChange={update('referenceImportPrice')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Sale price *
                </span>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={form.defaultSalePrice}
                  onChange={update('defaultSalePrice')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Unit *
              </span>
              <input
                required
                value={form.unit}
                onChange={update('unit')}
                placeholder="pcs, box, kg"
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
                {editingId ? 'Save changes' : 'Create product'}
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
          <div className="border-b border-[var(--admin-border)] px-4 py-3">
            <p className="text-sm text-[var(--admin-muted)]">
              Total <strong>{items.length}</strong> products
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Sale price</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--admin-border)]">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                        </td>
                      </tr>
                    ))
                  : items.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-medium">{p.code}</td>
                        <td className="px-4 py-3">{p.name}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {p.categoryName || '—'}
                        </td>
                        <td className="px-4 py-3">{formatMoney(p.defaultSalePrice)}</td>
                        <td className="px-4 py-3">{p.unit}</td>
                        <td className="px-4 py-3">
                          <Badge tone={p.status === 'active' ? 'success' : 'danger'}>
                            {p.status || '—'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1"
                              onClick={() => startEdit(p)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1 !text-red-600"
                              onClick={() => handleDelete(p.id)}
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
                No products yet. Create categories first, then add SKUs.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
