import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createProduct,
  deleteProduct,
  fetchProductsPage,
  generateBarcode,
  scheduleProductSalePrice,
  updateProduct,
} from '../../api/products.js';
import { fetchCategories } from '../../api/categories.js';
import { fetchSuppliers } from '../../api/suppliers.js';
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
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import FormField from '../../components/ui/FormField.jsx';
import BarcodeInput from '../../components/ui/BarcodeInput.jsx';
import PrintableBarcode from '../../components/ui/PrintableBarcode.jsx';
import MoneyInput from '../../components/ui/MoneyInput.jsx';
import InventoryCountPanel from '../../components/domain/InventoryCountPanel.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Modal from '../../components/ui/Modal.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

const EMPTY = {
  code: '',
  name: '',
  barcode: '',
  categoryId: '',
  unit: 'piece',
  importUnit: 'case',
  unitsPerImportUnit: 24,
  supplierId: '',
  referenceImportPrice: null,
  defaultSalePrice: null,
  description: '',
  refundable: true,
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

/** Display ledger BASE qty as base retail units or floor TOP purchase units. */
function displayStockQty(baseQty, product, stockUnitMode) {
  const qty = Number(baseQty) || 0;
  if (stockUnitMode !== 'top') return qty;
  const conversion =
    Number(product?.topPackagingConversionQty) || Number(product?.unitsPerImportUnit) || 1;
  return Math.floor(qty / Math.max(1, conversion));
}

function displayStockUnitLabel(product, stockUnitMode) {
  if (stockUnitMode === 'top') {
    return (
      product?.topPackagingLabel ||
      (product?.importUnit ? purchaseUnitLabel(product.importUnit) : null) ||
      unitLabel(product?.unit)
    );
  }
  return unitLabel(product?.unit);
}

export default function ProductsPage() {
  const { has, role } = usePermissions();
  const { getCategories, invalidate } = useReferenceData();
  const confirmSave = useSaveConfirmation();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = canManageProducts(role, { has });
  const isWm = isWarehouseViewRole(role);
  const canSchedulePrice = has('SET_RETAIL_PRICE');
  const isCentral = isCentralCatalogRole(role);
  const showScan = showBarcodeWorkflow(role);
  const showBranchStock = showBranchStockColumn(role);
  const showWarehouseStock = showWarehouseStockColumn(role);
  const showCount = showInventoryCountAction(role, { has });
  const showStockFilters = showWarehouseStock || showBranchStock;

  const barcodeRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [actionError, setActionError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [stockSort, setStockSort] = useState('');
  const [stockUnitMode, setStockUnitMode] = useState('base');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [formError, setFormError] = useState('');
  const [countOpen, setCountOpen] = useState(searchParams.get('count') === '1');
  const [countSuccess, setCountSuccess] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [priceTarget, setPriceTarget] = useState(null);
  const [scheduledPrice, setScheduledPrice] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceError, setPriceError] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(fetchProductsPage, {
    search: debouncedQuery,
    categoryId: categoryId || undefined,
    status: statusFilter || undefined,
    lowStockOnly: lowStockOnly || undefined,
    stockSort: stockSort || undefined,
  });
  const { items, loading, reload: load } = pageData;
  const error = actionError || pageData.error;

  useEffect(() => {
    getCategories()
      .then((cats) => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => setCategories([]));
  }, [getCategories]);

  useEffect(() => {
    if (!isCentral && !isWm) return;
    fetchSuppliers()
      .then((payload) => {
        const rows = Array.isArray(payload) ? payload : payload?.listObjects || [];
        setSuppliers(rows.filter((row) => String(row.status || 'active').toLowerCase() === 'active'));
      })
      .catch(() => setSuppliers([]));
  }, [isCentral, isWm]);

  useEffect(() => {
    if (searchParams.get('count') === '1') {
      setCountOpen(true);
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('countSubmitted') === '1') {
      setCountSuccess('Inventory count submitted. Branch stock has been updated.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = items;

  const summary = useMemo(() => {
    if (!showWarehouseStock) return null;
    const low = items.filter((p) => p.lowStock).length;
    const totalUnits = items.reduce(
      (sum, p) => sum + displayStockQty(p.warehouseStock, p, stockUnitMode),
      0,
    );
    return { skus: pageData.totalRecords, low, totalUnits };
  }, [items, pageData.totalRecords, showWarehouseStock, stockUnitMode]);

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
      supplierId: product.supplierId ?? '',
      referenceImportPrice: product.referenceImportPrice ?? null,
      defaultSalePrice: product.defaultSalePrice ?? null,
      description: product.description || '',
      refundable: product.refundable !== false,
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

    const confirmed = await confirmSave({
      title: editingId ? 'Confirm product changes' : 'Confirm new product',
      message: editingId
        ? `Save the changes to ${form.name.trim() || 'this product'}?`
        : `Create ${form.name.trim() || 'this product'} in the shared product catalog?`,
      confirmLabel: editingId ? 'Yes, save changes' : 'Yes, create product',
    });
    if (!confirmed) return;

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      categoryId: Number(form.categoryId),
      unit: normalizeUnitValue(form.unit),
      importUnit: normalizeUnitValue(form.importUnit),
      unitsPerImportUnit: Number(form.unitsPerImportUnit) || null,
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      referenceImportPrice: form.referenceImportPrice,
      defaultSalePrice: form.defaultSalePrice,
      description: form.description.trim() || null,
      refundable: form.refundable !== false,
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
      load();
    } catch (err) {
      setFormError(fieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!canManage) return;
    setDeleteTargetId(id);
  }

  async function confirmDelete() {
    const id = deleteTargetId;
    if (!id) return;
    try {
      await deleteProduct(id);
      if (editingId === id) cancelEdit();
      invalidate('products');
      load();
    } catch (err) {
      setActionError(fieldErrors(err));
    }
  }

  function openPriceSchedule(product) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPriceTarget(product);
    setScheduledPrice(product.scheduledSalePrice ?? product.defaultSalePrice ?? null);
    setEffectiveDate(tomorrow.toISOString().slice(0, 10));
    setPriceError('');
  }

  async function saveScheduledPrice() {
    if (!priceTarget || scheduledPrice == null || !effectiveDate) return;
    setPriceSaving(true);
    setPriceError('');
    try {
      await scheduleProductSalePrice(priceTarget.id, {
        price: Number(scheduledPrice),
        effectiveDate,
      });
      setPriceTarget(null);
      load();
    } catch (err) {
      setPriceError(fieldErrors(err));
    } finally {
      setPriceSaving(false);
    }
  }

  const selectClass =
    'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

  const showForm = canManage;
  const filterSelectClass =
    'rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';
  const colSpan =
    8 +
    (showBranchStock ? 1 : 0) +
    (showWarehouseStock ? 2 : 0) +
    (canManage || isWm ? 1 : 0);

  return (
    <div className="w-full">
      <PageHeader
        title={isWm ? 'Products & central stock' : 'Products'}
        actions={
          showCount ? (
            <Button variant="secondary" onClick={() => setCountOpen((v) => !v)}>
              {countOpen ? 'Hide inventory count' : 'Inventory count'}
            </Button>
          ) : null
        }
      />

      {showCount && (
        <InventoryCountPanel
          open={countOpen}
          onClose={() => setCountOpen(false)}
          onSubmitted={() => {
            setCountOpen(false);
            setCountSuccess('Inventory count submitted. Branch stock has been updated.');
            load();
          }}
        />
      )}

      {countSuccess && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {countSuccess}
        </div>
      )}

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
                  />
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                        Barcode
                      </span>
                      <button
                        type="button"
                        onClick={handleGenerateBarcode}
                        disabled={generatingBarcode}
                        className="rounded-lg border border-[#0058be]/30 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#0058be] hover:bg-[#f0f6ff] disabled:opacity-60"
                      >
                        {generatingBarcode ? 'Generating…' : 'Generate barcode'}
                      </button>
                    </div>
                    <input
                      value={form.barcode}
                      onChange={(e) =>
                        patchForm({
                          barcode: e.target.value.replace(/[^\dA-Za-z-]/g, ''),
                        })
                      }
                      placeholder="893000000001"
                      className={`${selectClass} font-mono`}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <p className="text-xs text-[var(--admin-subtle)]">
                      Generates a unique EAN-13 with Vietnam prefix 893.
                    </p>
                  </div>
                )}

                <PrintableBarcode value={form.barcode} productName={form.name} />

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

                <FormField label="Product code (SKU)" required={!editingId}>
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

                <FormField label="Retail unit" required>
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
                  <FormField label="Import unit">
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
                {isCentral && (
                  <FormField label="Primary supplier">
                    <select value={form.supplierId} onChange={(e) => patchForm({ supplierId: e.target.value })} className={selectClass}>
                      <option value="">Not assigned</option>
                      {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                    </select>
                  </FormField>
                )}
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
                      disabled={Boolean(editingId)}
                    />
                  </FormField>
                </div>
              </section>

              <section className="rounded-xl border border-[var(--admin-border)] p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.refundable !== false}
                    onChange={(e) => patchForm({ refundable: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--admin-border)] text-[#0058be] focus:ring-[#0058be]/30"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--admin-text)]">
                      Refundable at POS
                    </span>
                  </span>
                </label>
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
            </form>
          </Card>
        )}

        <Card className={`${showForm ? 'xl:col-span-8' : ''} !p-0 overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--admin-border)] px-4 py-3">
            <p className="mr-auto shrink-0 text-sm text-[var(--admin-muted)]">
              <strong>{pageData.totalRecords}</strong> products
            </p>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={filterSelectClass}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={filterSelectClass}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {showStockFilters && (
              <select
                value={stockSort}
                onChange={(e) => setStockSort(e.target.value)}
                className={filterSelectClass}
                aria-label="Stock sort"
              >
                <option value="">Default (name)</option>
                <option value="desc">Stock: high to low</option>
                <option value="asc">Stock: low to high</option>
              </select>
            )}
            {showStockFilters && (
              <select
                value={stockUnitMode}
                onChange={(e) => setStockUnitMode(e.target.value)}
                className={filterSelectClass}
                aria-label="Stock unit"
              >
                <option value="base">Stock unit: Base (retail)</option>
                <option value="top">Stock unit: Purchase (largest)</option>
              </select>
            )}
            {showWarehouseStock && (
              <label className="flex shrink-0 items-center gap-2 text-sm text-[var(--admin-muted)]">
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
              className="min-w-[220px] flex-1 max-w-sm rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
            />
          </div>
          <div className="w-full">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">Barcode</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Category</th>
                  {showBranchStock && <th className="px-2 py-2 text-right">Branch stock</th>}
                  {showWarehouseStock && <th className="px-2 py-2 text-right">In stock</th>}
                  {showWarehouseStock && <th className="px-2 py-2 text-right">Reorder</th>}
                  <th className="px-2 py-2">Retail</th>
                  <th className="px-2 py-2">Unit</th>
                  <th className="px-2 py-2">Refund</th>
                  <th className="px-2 py-2">Status</th>
                  {(canManage || isWm) && <th className="px-2 py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--admin-border)]">
                        <td colSpan={colSpan} className="px-2 py-3">
                          <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                        </td>
                      </tr>
                    ))
                  : filtered.map((p) => {
                      const branchLow = Boolean(showBranchStock && p.lowStock);
                      const stockUnit = displayStockUnitLabel(p, stockUnitMode);
                      return (
                      <tr
                        key={p.id}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-2 py-2 font-mono text-xs font-semibold text-[#0058be]">
                          {p.code}
                        </td>
                        <td className="truncate px-2 py-2 font-mono text-xs text-[var(--admin-muted)]">
                          {p.barcode || '—'}
                        </td>
                        <td className="px-2 py-2 font-medium">
                          <span className="line-clamp-2">{p.name}</span>
                        </td>
                        <td className="px-2 py-2 text-[var(--admin-muted)]">
                          <span className="line-clamp-2">{p.categoryName || '—'}</span>
                          {p.scope === 'BRANCH' && (
                            <span className="ml-1 text-[10px] uppercase text-amber-700">branch</span>
                          )}
                        </td>
                        {showBranchStock && (
                          <td className={`px-2 py-2 text-right tabular-nums font-semibold ${branchLow ? 'text-amber-600' : ''}`}>
                            {displayStockQty(p.branchStock, p, stockUnitMode)}
                          </td>
                        )}
                        {showWarehouseStock && (
                          <td className="px-2 py-2 text-right tabular-nums">
                            <span className={p.lowStock ? 'font-semibold text-amber-600' : ''}>
                              {displayStockQty(p.warehouseStock, p, stockUnitMode)}
                            </span>
                          </td>
                        )}
                        {showWarehouseStock && (
                          <td className="px-2 py-2 text-right tabular-nums text-[var(--admin-muted)]">
                            {p.warehouseReorderPoint ?? '—'}
                          </td>
                        )}
                        <td className="px-2 py-2 tabular-nums">
                          {formatVnd(p.defaultSalePrice)}
                          {p.scheduledSalePrice != null && (
                            <div className="mt-1 text-[10px] font-medium text-amber-700">
                              {formatVnd(p.scheduledSalePrice)} from {p.scheduledSalePriceEffectiveDate}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div>{stockUnit}</div>
                          {(canManage || isWm) && (
                            <div className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-[var(--admin-muted)]">
                              {p.topPackagingLabel ||
                                (p.importUnit
                                  ? `${purchaseUnitLabel(p.importUnit)} (${p.unitsPerImportUnit || '—'}/${purchaseUnitLabel(p.importUnit)})`
                                  : '—')}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Badge tone={p.refundable === false ? 'warning' : 'success'}>
                            {p.refundable === false ? 'Non-refundable' : 'Refundable'}
                          </Badge>
                        </td>
                        <td className="px-2 py-2">
                          <Badge tone={p.status === 'active' ? 'success' : 'danger'}>
                            {p.status || '—'}
                          </Badge>
                          {(showWarehouseStock && p.lowStock) || branchLow ? (
                            <Badge tone="warning" className="ml-1">
                              Low
                            </Badge>
                          ) : null}
                        </td>
                        {(canManage || isWm) && (
                          <td className="px-2 py-2 text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              {canSchedulePrice && (
                                <Button variant="ghost" className="!px-2 !py-1" onClick={() => openPriceSchedule(p)}>
                                  Schedule price
                                </Button>
                              )}
                              {canManage && (
                                <>
                                  <Button variant="ghost" className="!px-2 !py-1" onClick={() => startEdit(p)}>
                                    Edit
                                  </Button>
                                  <Button variant="ghost" className="!px-2 !py-1 !text-red-600" onClick={() => handleDelete(p.id)}>
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                    })}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                No products match your search.
                {statusFilter === 'active' ? ' Try All statuses if the SKU is inactive.' : null}
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
        title="Delete product"
        message="Delete this product?"
        confirmLabel="Confirm"
        danger
      />
      <Modal
        open={Boolean(priceTarget)}
        onClose={() => setPriceTarget(null)}
        title="Schedule retail price"
        description="The new price starts at the beginning of the selected future date; it never changes mid-day."
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPriceTarget(null)}>Cancel</Button>
            <Button loading={priceSaving} onClick={saveScheduledPrice}>Schedule price</Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-[#f7f9fb] p-3 text-sm">
            <strong>{priceTarget?.name}</strong>
            <p className="mt-1 text-[var(--admin-muted)]">Current retail price: {formatVnd(priceTarget?.defaultSalePrice)}</p>
          </div>
          <FormField label="New retail price" required>
            <MoneyInput required value={scheduledPrice} onChange={setScheduledPrice} />
          </FormField>
          <FormField label="Effective date" required>
            <input type="date" value={effectiveDate} min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} onChange={(e) => setEffectiveDate(e.target.value)} className={selectClass} />
          </FormField>
          {priceError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{priceError}</div>}
        </div>
      </Modal>
    </div>
  );
}
