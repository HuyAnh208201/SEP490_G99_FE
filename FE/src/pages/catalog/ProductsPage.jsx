import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from '../../api/products.js';
import { fetchCategories } from '../../api/categories.js';
import { PRODUCT_UNITS, normalizeUnitValue, unitLabel } from '../../constants/productUnits.js';
import { formatVnd } from '../../lib/money.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import FormField from '../../components/ui/FormField.jsx';
import BarcodeInput from '../../components/ui/BarcodeInput.jsx';
import MoneyInput from '../../components/ui/MoneyInput.jsx';

const EMPTY = {
  code: '',
  name: '',
  barcode: '',
  categoryId: '',
  unit: 'cai',
  referenceImportPrice: null,
  defaultSalePrice: null,
  description: '',
  status: 'active',
  syncCodeFromBarcode: true,
};

function fieldErrors(err) {
  if (err?.errors && typeof err.errors === 'object') {
    return Object.values(err.errors).join('. ');
  }
  return err?.message || 'Request failed';
}

function suggestSku(barcode) {
  if (!barcode) return '';
  return barcode.length >= 8 ? barcode : `SP-${barcode}`;
}

export default function ProductsPage() {
  const { has } = usePermissions();
  const canManage = has('PRODUCT_MANAGEMENT');
  const barcodeRef = useRef(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
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

  const filtered = items.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.code?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    );
  });

  function patchForm(patch) {
    setForm((f) => {
      const next = { ...f, ...patch };
      if (next.syncCodeFromBarcode && !editingId && patch.barcode !== undefined) {
        next.code = suggestSku(patch.barcode);
      }
      return next;
    });
  }

  function startEdit(product) {
    if (!canManage) return;
    setEditingId(product.id);
    setForm({
      code: product.code || '',
      name: product.name || '',
      barcode: product.barcode || '',
      categoryId: product.categoryId ?? '',
      unit: normalizeUnitValue(product.unit || 'cai'),
      referenceImportPrice: product.referenceImportPrice ?? null,
      defaultSalePrice: product.defaultSalePrice ?? null,
      description: product.description || '',
      status: product.status || 'active',
      syncCodeFromBarcode: false,
    });
    setFormError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }

  function handleBarcodeScan(barcode) {
    if (!editingId && form.syncCodeFromBarcode) {
      patchForm({ barcode, code: suggestSku(barcode) });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canManage) return;
    setFormError('');

    if (form.referenceImportPrice == null || form.defaultSalePrice == null) {
      setFormError('Enter valid import and retail prices.');
      return;
    }
    if (form.defaultSalePrice < form.referenceImportPrice) {
      setFormError('Retail price is lower than import cost — check pricing.');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      categoryId: Number(form.categoryId),
      unit: normalizeUnitValue(form.unit),
      referenceImportPrice: form.referenceImportPrice,
      defaultSalePrice: form.defaultSalePrice,
      description: form.description.trim() || null,
    };

    try {
      if (editingId) {
        await updateProduct(editingId, { ...payload, status: form.status });
      } else {
        const code = (form.code.trim() || suggestSku(form.barcode)).trim();
        if (!code) {
          setFormError('Product code or barcode is required.');
          setSaving(false);
          return;
        }
        await createProduct({ ...payload, code });
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
    if (!canManage) return;
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      if (editingId === id) cancelEdit();
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    }
  }

  const selectClass =
    'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

  return (
    <div className="w-full">
      <PageHeader
        title="Products"
        description={
          canManage
            ? 'Product catalog with barcode scanning, SKU codes, and retail pricing.'
            : 'Browse the product catalog (SKU, barcode, pricing). Editing requires catalog management permission.'
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className={`grid gap-4 ${canManage ? 'xl:grid-cols-12' : ''}`}>
        {canManage && (
          <Card className="xl:col-span-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[var(--admin-text)]">
                {editingId ? 'Edit product' : 'Add product'}
              </h2>
              {!editingId && (
                <span className="text-xs text-[var(--admin-subtle)]">Focus barcode → scan</span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <section className="space-y-3 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0058be]">
                  Identification
                </p>

                <BarcodeInput
                  ref={barcodeRef}
                  autoFocus={!editingId}
                  value={form.barcode}
                  onChange={(barcode) => patchForm({ barcode })}
                  onScan={handleBarcodeScan}
                  hint="USB scanner sends digits + Enter. Barcode is used at checkout."
                />

                {!editingId && (
                  <label className="flex items-center gap-2 text-sm text-[var(--admin-muted)]">
                    <input
                      type="checkbox"
                      checked={form.syncCodeFromBarcode}
                      onChange={(e) =>
                        patchForm({
                          syncCodeFromBarcode: e.target.checked,
                          code: e.target.checked ? suggestSku(form.barcode) : form.code,
                        })
                      }
                      className="rounded border-[var(--admin-border)] text-[#0058be]"
                    />
                    Use barcode as product code (SKU)
                  </label>
                )}

                <FormField
                  label="Product code (SKU)"
                  required={!editingId}
                  hint="Internal code for reports & stock. Unique per item — e.g. SP000123 or EAN."
                >
                  <input
                    required={!editingId}
                    readOnly={!editingId && form.syncCodeFromBarcode}
                    value={form.code}
                    onChange={(e) =>
                      patchForm({ code: e.target.value.toUpperCase(), syncCodeFromBarcode: false })
                    }
                    placeholder="SP000123"
                    className={`${selectClass} font-mono uppercase tracking-wide ${!editingId && form.syncCodeFromBarcode ? 'bg-[#f0f6ff]' : ''}`}
                  />
                </FormField>

                <FormField label="Product name" required>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => patchForm({ name: e.target.value })}
                    placeholder="e.g. Aquafina 500ml"
                    className={selectClass}
                  />
                </FormField>
              </section>

              <section className="space-y-3 rounded-xl border border-[var(--admin-border)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0058be]">
                  Category & unit
                </p>

                <FormField label="Category" required>
                  <select
                    required
                    value={form.categoryId}
                    onChange={(e) => patchForm({ categoryId: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Unit of measure" required hint="Standard unit for POS & inventory.">
                  <select
                    required
                    value={form.unit}
                    onChange={(e) => patchForm({ unit: e.target.value })}
                    className={selectClass}
                  >
                    {PRODUCT_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </section>

              <section className="space-y-3 rounded-xl border border-[var(--admin-border)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0058be]">
                  Pricing (VND)
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Cost / import price"
                    required
                    hint="Cost price — used for margin reports."
                  >
                    <MoneyInput
                      required
                      value={form.referenceImportPrice}
                      onChange={(v) => patchForm({ referenceImportPrice: v })}
                    />
                  </FormField>
                  <FormField label="Retail price" required hint="Retail price — shown at POS.">
                    <MoneyInput
                      required
                      value={form.defaultSalePrice}
                      onChange={(v) => patchForm({ defaultSalePrice: v })}
                    />
                  </FormField>
                </div>

                {form.referenceImportPrice != null &&
                  form.defaultSalePrice != null &&
                  form.defaultSalePrice >= form.referenceImportPrice && (
                    <p className="text-xs text-[var(--admin-muted)]">
                      Margin:{' '}
                      <strong className="text-[var(--admin-success)]">
                        {formatVnd(form.defaultSalePrice - form.referenceImportPrice)}
                      </strong>{' '}
                      (
                      {Math.round(
                        ((form.defaultSalePrice - form.referenceImportPrice) /
                          form.defaultSalePrice) *
                          100,
                      )}
                      %)
                    </p>
                  )}
              </section>

              {editingId && (
                <FormField label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => patchForm({ status: e.target.value })}
                    className={selectClass}
                  >
                    <option value="active">Active — sell at POS</option>
                    <option value="inactive">Inactive — hidden from POS</option>
                  </select>
                </FormField>
              )}

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
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
        )}

        <Card className={`${canManage ? 'xl:col-span-8' : ''} !p-0 overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3">
            <p className="text-sm text-[var(--admin-muted)]">
              <strong>{filtered.length}</strong> / {items.length} products
            </p>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SKU, barcode, name…"
              className="w-full max-w-xs rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Retail</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--admin-border)]">
                        <td colSpan={canManage ? 8 : 7} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                        </td>
                      </tr>
                    ))
                  : filtered.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0058be]">
                          {p.code}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                          {p.barcode || '—'}
                        </td>
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {p.categoryName || '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{formatVnd(p.defaultSalePrice)}</td>
                        <td className="px-4 py-3">{unitLabel(p.unit)}</td>
                        <td className="px-4 py-3">
                          <Badge tone={p.status === 'active' ? 'success' : 'danger'}>
                            {p.status || '—'}
                          </Badge>
                        </td>
                        {canManage && (
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
                        )}
                      </tr>
                    ))}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                No products match your search.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
