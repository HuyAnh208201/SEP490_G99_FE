import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import { formatVnd } from '../../../lib/money.js';
import { purchaseUnitLabel, unitLabel } from '../../../constants/productUnits.js';
import { searchPurchaseProducts, createPurchaseOrder } from '../../../api/purchaseOrders.js';
import { fetchSuppliers } from '../../../api/suppliers.js';
import { useSaveConfirmation } from '../../../contexts/SaveConfirmationContext.jsx';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

function todayInput() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function CreatePurchaseOrderModal({ open, onClose, onCreated }) {
  const confirmSave = useSaveConfirmation();
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(todayInput());
  const [deliveredByName, setDeliveredByName] = useState('');
  const [deliveredByPhone, setDeliveredByPhone] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [keyword, setKeyword] = useState('');
  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    setSupplierId('');
    setDeliveryDate(todayInput());
    setDeliveredByName('');
    setDeliveredByPhone('');
    setDocumentNumber('');
    setNotes('');
    setKeyword('');
    setProducts([]);
    setLines(new Map());
    setError('');
    setLoading(true);
    fetchSuppliers()
      .then((payload) => {
        const rows = Array.isArray(payload) ? payload : payload?.listObjects || [];
        setSuppliers(rows.filter((row) => String(row.status || 'active').toLowerCase() === 'active'));
      })
      .catch((err) => setError(err?.message || 'Failed to load suppliers'))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const current = ++requestId.current;
    setSearching(true);
    const timer = setTimeout(() => {
      searchPurchaseProducts(null, keyword.trim())
        .then((rows) => {
          if (current === requestId.current) setProducts(Array.isArray(rows) ? rows : []);
        })
        .catch((err) => {
          if (current === requestId.current) setError(err?.message || 'Failed to load products');
        })
        .finally(() => {
          if (current === requestId.current) setSearching(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, open]);

  const lineList = useMemo(() => [...lines.values()], [lines]);
  const totalQty = lineList.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  const totalAmount = lineList.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
    0,
  );

  function selectSupplier(value) {
    setSupplierId(value);
    setError('');
  }

  function addLine(product) {
    setLines((previous) => {
      const next = new Map(previous);
      if (!next.has(product.productId)) {
        next.set(product.productId, {
          ...product,
          quantity: 1,
          unitPrice: product.referencePrice ?? '',
        });
      }
      return next;
    });
  }

  function updateLine(productId, patch) {
    setLines((previous) => {
      const next = new Map(previous);
      next.set(productId, { ...next.get(productId), ...patch });
      return next;
    });
  }

  async function submit() {
    setError('');
    if (!supplierId) return setError('Select a supplier first.');
    if (!deliveryDate) return setError('Enter the supplier delivery date.');
    if (!deliveredByName.trim()) return setError('Enter the delivery person name.');
    const items = lineList.map((line) => ({
      productId: line.productId,
      quantity: Number(line.quantity) || 0,
      unitPrice: line.unitPrice === '' ? null : Number(line.unitPrice),
    }));
    if (!items.length || items.some((item) => item.quantity <= 0 || item.unitPrice == null || item.unitPrice < 0)) {
      return setError('Add at least one product and enter a valid quantity and import price.');
    }
    const confirmed = await confirmSave({
      title: 'Confirm supplier receipt',
      message: `Receive ${items.length} product line(s), ${totalQty} import unit(s), valued at ${formatVnd(totalAmount)}? Central stock will update immediately.`,
      confirmLabel: 'Yes, receive stock',
    });
    if (!confirmed) return undefined;
    setSubmitting(true);
    try {
      const receipt = await createPurchaseOrder({
        supplierId: Number(supplierId),
        supplierDeliveryDate: deliveryDate,
        deliveredByName: deliveredByName.trim(),
        deliveredByPhone: deliveredByPhone.trim() || null,
        supplierDocumentNumber: documentNumber.trim() || null,
        notes: notes.trim() || null,
        items,
      });
      onCreated?.(receipt);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to record supplier receipt');
    } finally {
      setSubmitting(false);
    }
    return undefined;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Supplier Receipt"
      description="Record goods that have arrived. Saving this receipt updates central stock immediately."
      size="xl"
      footer={(
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={submitting} disabled={submitting || !lineList.length} onClick={submit}>
            Receive into warehouse
          </Button>
        </div>
      )}
    >
      <div className="space-y-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <section className="grid gap-4 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Supplier *">
            <select value={supplierId} onChange={(event) => selectSupplier(event.target.value)} className={inputClass} disabled={loading}>
              <option value="">Select supplier…</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </Field>
          <Field label="Supplier delivery date *"><input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} /></Field>
          <Field label="Delivery person *"><input value={deliveredByName} onChange={(e) => setDeliveredByName(e.target.value)} placeholder="Full name" className={inputClass} /></Field>
          <Field label="Delivery phone"><input value={deliveredByPhone} onChange={(e) => setDeliveredByPhone(e.target.value)} placeholder="Phone number" className={inputClass} /></Field>
          <Field label="Supplier document"><input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Invoice / delivery note" className={inputClass} /></Field>
          <div className="md:col-span-2 xl:col-span-3"><Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional receiving note" className={inputClass} /></Field></div>
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <div>
              <h3 className="text-sm font-semibold">Add products</h3>
            </div>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Filter by SKU or name…" className={`${inputClass} ml-auto max-w-sm`} />
          </div>
          <div className="max-h-52 overflow-auto rounded-xl border border-[var(--admin-border)]">
            {searching ? <Empty text="Loading products…" /> : products.length === 0 ? <Empty text="No matching products." /> : products.map((product) => (
              <button key={product.productId} type="button" disabled={lines.has(product.productId)} onClick={() => addLine(product)} className="flex w-full items-center gap-3 border-b border-[var(--admin-border)] px-4 py-2 text-left text-sm last:border-0 hover:bg-[#f7f9fb] disabled:opacity-50">
                <span className="min-w-0 flex-1"><strong>{product.productName}</strong><span className="ml-2 font-mono text-xs text-[var(--admin-muted)]">{product.productCode}</span></span>
                <span className="text-xs text-[var(--admin-muted)]">Central stock: {product.currentQty ?? 0}</span>
                <span className="font-semibold text-[#0058be]">{lines.has(product.productId) ? 'Added' : 'Add'}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Receipt lines ({lineList.length})</h3>
          <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase text-[var(--admin-subtle)]"><tr><th className="px-4 py-2">Product</th><th className="px-4 py-2">Smallest unit / conversion</th><th className="px-4 py-2 text-right">Received qty</th><th className="px-4 py-2 text-right">Import price</th><th className="px-4 py-2 text-right">Total</th><th /></tr></thead>
              <tbody>
                {!lineList.length ? <tr><td colSpan={6}><Empty text="No receipt lines yet." /></td></tr> : lineList.map((line) => (
                  <tr key={line.productId} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-2"><strong>{line.productName}</strong><div className="font-mono text-xs text-[var(--admin-muted)]">{line.productCode}</div></td>
                    <td className="px-4 py-2 text-[var(--admin-muted)]">{unitLabel(line.unit)} · {line.topPackagingLabel || purchaseUnitLabel(line.importUnit || line.unit)}</td>
                    <td className="px-4 py-2 text-right"><input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(line.productId, { quantity: e.target.value })} className="w-24 rounded-lg border px-2 py-1 text-right" /></td>
                    <td className="px-4 py-2 text-right"><input type="number" min="0" value={line.unitPrice} onChange={(e) => updateLine(line.productId, { unitPrice: e.target.value })} className="w-32 rounded-lg border px-2 py-1 text-right" /></td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatVnd((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0))}</td>
                    <td className="px-4 py-2 text-right"><button type="button" className="text-xs font-semibold text-red-600" onClick={() => setLines((previous) => { const next = new Map(previous); next.delete(line.productId); return next; })}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
              {!!lineList.length && <tfoot><tr className="border-t bg-[#f7f9fb] font-semibold"><td className="px-4 py-2" colSpan={2}>Receipt total</td><td className="px-4 py-2 text-right">{totalQty}</td><td /><td className="px-4 py-2 text-right">{formatVnd(totalAmount)}</td><td /></tr></tfoot>}
            </table>
          </div>
        </section>
      </div>
    </Modal>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">{label}</span>{children}</label>;
}

function Empty({ text }) {
  return <div className="px-4 py-6 text-center text-sm text-[var(--admin-muted)]">{text}</div>;
}
