import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  generateBarcode,
  updateProduct,
} from '../../api/products.js';
import { fetchCategories } from '../../api/categories.js';
import {
  PRODUCT_UNITS,
  PURCHASE_UNITS,
  defaultImportUnitForRetail,
  normalizeUnitValue,
  purchaseUnitLabel,
  unitLabel,
} from '../../constants/productUnits.js';
import {
  canManageProducts,
  isCentralCatalogRole,
  isWarehouseViewRole,
  showBarcodeWorkflow,
  showBranchStockColumn,
  showInventoryCountAction,
  showWarehouseStockColumn,
} from '../../constants/productAccess.js';
import { formatVnd } from '../../lib/money.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import { useReferenceData } from '../../contexts/ReferenceDataContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import FormField from '../../components/ui/FormField.jsx';
import BarcodeInput from '../../components/ui/BarcodeInput.jsx';
import MoneyInput from '../../components/ui/MoneyInput.jsx';
import InventoryCountPanel from '../../components/domain/InventoryCountPanel.jsx';

const EMPTY = {
  code: '',
  name: '',
  barcode: '',
  categoryId: '',
  unit: 'piece',
  importUnit: 'case',
  unitsPerImportUnit: 24,
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

function pageDescription(role, canManage, isWm) {
  if (isWm) {
    return 'Central warehouse stock monitoring — read-only product catalog with in-stock quantities.';
  }
  if (showBarcodeWorkflow(role)) {
    return 'Branch product catalog with barcode scanning, branch stock levels, and inventory count.';
  }
  if (canManage) {
    return 'Central product catalog administration — SKU codes, pricing, and global catalog scope.';
  }
  return 'Browse the product catalog.';
}

export default function ProductsPage() {
  const { has, role } = usePermissions();
  const { getProducts, getCategories, invalidate } = useReferenceData();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = canManageProducts(role, { has });
  const isWm = isWarehouseViewRole(role);
  const isCentral = isCentralCatalogRole(role);
  const showScan = showBarcodeWorkflow(role);
  const showBranchStock = showBranchStockColumn(role);
  const showWarehouseStock = showWarehouseStockColumn(role);
  const showCount = showInventoryCountAction(role, { has });

  const barcodeRef = useRef(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [formError, setFormError] = useState('');
  const [countOpen, setCountOpen] = useState(searchParams.get('count') === '1');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [products, cats] = await Promise.all([
        getProducts(),
        canManage || isWm ? getCategories().catch(() => []) : Promise.resolve([]),
      ]);
      setItems(Array.isArray(products) ? products : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      setError(fieldErrors(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canManage, getProducts, getCategories, isWm]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('count') === '1') {
      setCountOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (lowStockOnly && !p.lowStock) return false;
      if (!q) return true;
      return (
        p.code?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      );
    });
  }, [items, query, lowStockOnly]);

  const summary = useMemo(() => {
    if (!showWarehouseStock) return null;
    const low = items.filter((p) => p.lowStock).length;
    const totalUnits = items.reduce((sum, p) => sum + (p.warehouseStock || 0), 0);
    return { skus: items.length, low, totalUnits };
  }, [items, showWarehouseStock]);

  function patchForm(patch) {
    setForm((f) => {
      const next = { ...f, ...patch };
      if (patch.unit && !editingId) {
        const defaults = defaultImportUnitForRetail(patch.unit);
        next.importUnit = defaults.importUnit;
        next.unitsPerImportUnit = defaults.unitsPerImportUnit;
      }
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
      unit: normalizeUnitValue(product.unit || 'piece'),
      importUnit: normalizeUnitValue(product.importUnit || 'case'),
      unitsPerImportUnit: product.unitsPerImportUnit ?? 24,
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
    if (showScan) {
      setTimeout(() => barcodeRef.current?.focus(), 50);
    }
  }

  function handleBarcodeScan(barcode) {
    if (!editingId && form.syncCodeFromBarcode) {
      patchForm({ barcode, code: suggestSku(barcode) });
    }
  }

  async function handleGenerateBarcode() {
    setGeneratingBarcode(true);
    setFormError('');
    try {
      const barcode = await generateBarcode();
      patchForm({ barcode, code: form.syncCodeFromBarcode ? suggestSku(barcode) : form.code });
    } catch (err) {
      setFormError(fieldErrors(err));
    } finally {
      setGeneratingBarcode(false);
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
      importUnit: normalizeUnitValue(form.importUnit),
      unitsPerImportUnit: Number(form.unitsPerImportUnit) || null,
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
      invalidate('products');
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
      invalidate('products');
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    }
  }

  const selectClass =
    'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

  const showForm = canManage;

  return (
    <div className="w-full">
      <PageHeader
        title={isWm ? 'Products & central stock' : 'Products'}
        description={pageDescription(role, canManage, isWm)}
        actions={
          showCount ? (
            <Button variant="secondary" onClick={() => setCountOpen((v) => !v)}>
              {countOpen ? 'Hide inventory count' : 'Inventory count'}
            </Button>
          ) : null
        }
      />

      {showCount && <InventoryCountPanel open={countOpen} onClose={() => setCountOpen(false)} />}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              SKUs tracked
            </p>
            <p className="mt-1 text-2xl font-semibold">{summary.skus}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              Low stock
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{summary.low}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              Total units
            </p>
            <p className="mt-1 text-2xl font-semibold">{summary.totalUnits.toLocaleString('en-US')}</p>
          </Card>
        </div>
      )}

      <div className={`grid gap-4 ${showForm ? 'xl:grid-cols-12' : ''}`}>
        {showForm && (
          <Card className="xl:col-span-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[var(--admin-text)]">
                {editingId ? 'Edit product' : 'Add product'}
              </h2>
              {showScan && !editingId && (
                <span className="text-xs text-[var(--admin-subtle)]">Focus barcode → scan</span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <section className="space-y-3 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0058be]">
                  Identification
                </p>

                {showScan ? (
                  <BarcodeInput
                    ref={barcodeRef}
                    autoFocus={!editingId}
                    value={form.barcode}
                    onChange={(barcode) => patchForm({ barcode })}
                    onScan={handleBarcodeScan}
                    onGenerate={handleGenerateBarcode}
                    generating={generatingBarcode}
                    hint="USB scanner sends digits + Enter. Use Generate for items without a printed barcode."
                  />
                ) : (
                  <FormField label="Barcode" hint="Optional EAN / internal barcode.">
                    <input
                      value={form.barcode}
                      onChange={(e) => patchForm({ barcode: e.target.value })}
                      placeholder="893000000001"
                      className={`${selectClass} font-mono`}
                    />
                  </FormField>
                )}

                {!editingId && showScan && (
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

                <FormField label="Product code (SKU)" required={!editingId}>
                  <input
                    required={!editingId}
                    readOnly={!editingId && form.syncCodeFromBarcode && showScan}
                    value={form.code}
                    onChange={(e) =>
                      patchForm({ code: e.target.value.toUpperCase(), syncCodeFromBarcode: false })
                    }
                    placeholder="SP000123"
                    className={`${selectClass} font-mono uppercase tracking-wide ${!editingId && form.syncCodeFromBarcode && showScan ? 'bg-[#f0f6ff]' : ''}`}
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
                  Category & units
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

                <FormField label="Retail unit" required hint="Unit sold at POS and branch inventory.">
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Import unit" hint="Used when BM requests replenishment.">
                    <select
                      value={form.importUnit}
                      onChange={(e) => patchForm({ importUnit: e.target.value })}
                      className={selectClass}
                    >
                      {PURCHASE_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Units per import unit">
                    <input
                      type="number"
                      min="1"
                      value={form.unitsPerImportUnit}
                      onChange={(e) => patchForm({ unitsPerImportUnit: e.target.value })}
                      className={selectClass}
                    />
                  </FormField>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-[var(--admin-border)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0058be]">
                  Pricing (VND)
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Cost / import price" required>
                    <MoneyInput
                      required
                      value={form.referenceImportPrice}
                      onChange={(v) => patchForm({ referenceImportPrice: v })}
                    />
                  </FormField>
                  <FormField label="Retail price" required>
                    <MoneyInput
                      required
                      value={form.defaultSalePrice}
                      onChange={(v) => patchForm({ defaultSalePrice: v })}
                    />
                  </FormField>
                </div>
              </section>

              {editingId && (
                <FormField label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => patchForm({ status: e.target.value })}
                    className={selectClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
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

              {isCentral && (
                <p className="text-xs text-[var(--admin-subtle)]">
                  Products you create are global and appear in every branch.
                </p>
              )}
              {showScan && (
                <p className="text-xs text-[var(--admin-subtle)]">
                  Products you create are branch-local and visible only at your store (supervisors can
                  still monitor them).
                </p>
              )}
            </form>
          </Card>
        )}

        <Card className={`${showForm ? 'xl:col-span-8' : ''} !p-0 overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3">
            <p className="text-sm text-[var(--admin-muted)]">
              <strong>{filtered.length}</strong> / {items.length} products
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {showWarehouseStock && (
                <label className="flex items-center gap-2 text-sm text-[var(--admin-muted)]">
                  <input
                    type="checkbox"
                    checked={lowStockOnly}
                    onChange={(e) => setLowStockOnly(e.target.checked)}
                    className="rounded border-[var(--admin-border)]"
                  />
                  Low stock only
                </label>
              )}
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search SKU, barcode, name…"
                className="w-full max-w-xs rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  {showBranchStock && <th className="px-4 py-3 text-right">Branch stock</th>}
                  {showWarehouseStock && <th className="px-4 py-3 text-right">In stock</th>}
                  <th className="px-4 py-3">Retail</th>
                  <th className="px-4 py-3">Unit</th>
                  {(canManage || isWm) && <th className="px-4 py-3">Import unit</th>}
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--admin-border)]">
                        <td
                          colSpan={8 + (showBranchStock ? 1 : 0) + (showWarehouseStock ? 1 : 0) + (canManage ? 1 : 0)}
                          className="px-4 py-4"
                        >
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
                          {p.scope === 'BRANCH' && (
                            <span className="ml-1 text-[10px] uppercase text-amber-700">branch</span>
                          )}
                        </td>
                        {showBranchStock && (
                          <td className="px-4 py-3 text-right tabular-nums font-semibold">
                            {p.branchStock ?? 0}
                          </td>
                        )}
                        {showWarehouseStock && (
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className={p.lowStock ? 'font-semibold text-amber-600' : ''}>
                              {p.warehouseStock ?? 0}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 tabular-nums">{formatVnd(p.defaultSalePrice)}</td>
                        <td className="px-4 py-3">{unitLabel(p.unit)}</td>
                        {(canManage || isWm) && (
                          <td className="px-4 py-3 text-[var(--admin-muted)]">
                            {p.importUnit
                              ? `${purchaseUnitLabel(p.importUnit)} (${p.unitsPerImportUnit || '—'}/${purchaseUnitLabel(p.importUnit)})`
                              : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <Badge tone={p.status === 'active' ? 'success' : 'danger'}>
                            {p.status || '—'}
                          </Badge>
                          {showWarehouseStock && p.lowStock && (
                            <Badge tone="warning" className="ml-1">
                              Low
                            </Badge>
                          )}
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
