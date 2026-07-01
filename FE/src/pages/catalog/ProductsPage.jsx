import { useEffect, useState } from 'react';
import { addDraft, listDraft, removeDraft } from '../../lib/setupDraft.js';
import { fetchCategories } from '../../api/categories.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import DraftNotice from '../../components/ui/DraftNotice.jsx';

const EMPTY = {
  code: '',
  name: '',
  barcode: '',
  standardPrice: '',
  unit: '',
  categoryId: '',
};

export default function ProductsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  function refresh() {
    setItems(listDraft('products'));
  }

  useEffect(() => {
    refresh();
    fetchCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.code.trim() || !form.name.trim()) {
      setError('Product code and name are required.');
      return;
    }
    const cat = categories.find((c) => String(c.id) === String(form.categoryId));
    addDraft('products', {
      code: form.code.trim(),
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      standardPrice: form.standardPrice ? Number(form.standardPrice) : null,
      unit: form.unit.trim() || 'pcs',
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      categoryName: cat?.name || null,
    });
    setForm(EMPTY);
    refresh();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Products"
        description="Step 2 — product code, name, barcode, standard price, and unit. Validates duplicate codes when the API is available."
      />

      <DraftNotice>
        Product CRUD API is not on develop yet. Records are stored locally in this browser for
        setup workflow preview.
      </DraftNotice>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="text-base font-semibold text-[var(--admin-text)]">New product</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Standard price
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={form.standardPrice}
                  onChange={update('standardPrice')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Unit
                </span>
                <input
                  value={form.unit}
                  onChange={update('unit')}
                  placeholder="pcs, box, kg"
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Category
              </span>
              <select
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit">Add product</Button>
          </form>
        </Card>

        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-3 font-medium">{p.code}</td>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-[var(--admin-muted)]">{p.barcode || '—'}</td>
                    <td className="px-4 py-3">
                      {p.standardPrice != null ? p.standardPrice.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">{p.unit}</td>
                    <td className="px-4 py-3 text-[var(--admin-muted)]">{p.categoryName || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        className="!px-2 !py-1 !text-red-600"
                        onClick={() => {
                          removeDraft('products', p.id);
                          refresh();
                        }}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                No products yet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
