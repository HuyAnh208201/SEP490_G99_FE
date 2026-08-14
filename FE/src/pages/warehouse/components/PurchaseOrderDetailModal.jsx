import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { formatDate, formatDateTime } from '../../../lib/datetime.js';
import { formatVnd } from '../../../lib/money.js';
import { unitLabel } from '../../../constants/productUnits.js';
import { poStatusMeta } from '../../../constants/purchaseOrders.js';

export default function PurchaseOrderDetailModal({ open, onClose, order }) {
  if (!order) return null;
  const meta = poStatusMeta(order.status);
  const total = (order.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

  return (
    <Modal open={open} onClose={onClose} title={`Supplier Receipt ${order.orderNumber || ''}`} description="Immutable receiving record and central-stock update evidence." size="xl">
      <div className="space-y-5">
        <div className="grid gap-4 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Supplier" value={order.supplierName || '—'} />
          <Info label="Supplier delivery date" value={formatDate(order.supplierDeliveryDate)} />
          <Info label="Supplier document" value={order.supplierDocumentNumber || '—'} />
          <div><Label>Status</Label><Badge tone={meta.tone} className="mt-1">{meta.display}</Badge></div>
          <Info label="Delivered by" value={order.deliveredByName || '—'} />
          <Info label="Delivery phone" value={order.deliveredByPhone || '—'} />
          <Info label="Received by" value={order.receivedByName || '—'} />
          <Info label="Received at" value={formatDateTime(order.receivedAt)} />
          {order.notes && <div className="sm:col-span-2 lg:col-span-4"><Info label="Notes" value={order.notes} /></div>}
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase text-[var(--admin-subtle)]"><tr><th className="px-4 py-2">Product</th><th className="px-4 py-2">Smallest unit / conversion</th><th className="px-4 py-2 text-right">Import qty</th><th className="px-4 py-2 text-right">Base qty</th><th className="px-4 py-2 text-right">Import price</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
            <tbody>{(order.items || []).map((item) => (
              <tr key={item.productId} className="border-t border-[var(--admin-border)]">
                <td className="px-4 py-2"><strong>{item.productName}</strong><div className="font-mono text-xs text-[var(--admin-muted)]">{item.productCode}</div></td>
                <td className="px-4 py-2 text-[var(--admin-muted)]">{unitLabel(item.unit)} · 1 {item.importUnit || 'import unit'} = {item.conversionQty || 1} {unitLabel(item.unit)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{item.quantity}</td>
                <td className="px-4 py-2 text-right tabular-nums">{item.quantityBase ?? (Number(item.quantity) || 0) * (Number(item.conversionQty) || 1)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{item.unitPrice == null ? '—' : formatVnd(item.unitPrice)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatVnd((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr className="border-t bg-[#f7f9fb] font-semibold"><td className="px-4 py-2" colSpan={5}>Receipt value</td><td className="px-4 py-2 text-right">{formatVnd(total)}</td></tr></tfoot>
          </table>
        </div>
        <div className="flex justify-end"><Button variant="secondary" onClick={onClose}>Close</Button></div>
      </div>
    </Modal>
  );
}

function Label({ children }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">{children}</p>;
}

function Info({ label, value }) {
  return <div><Label>{label}</Label><p className="mt-1 text-sm font-medium text-[var(--admin-text)]">{value || '—'}</p></div>;
}
