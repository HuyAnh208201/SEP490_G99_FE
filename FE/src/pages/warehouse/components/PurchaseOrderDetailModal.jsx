import { useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { formatDateTime } from '../../../lib/datetime.js';
import { formatVnd } from '../../../lib/money.js';
import { unitLabel } from '../../../constants/productUnits.js';
import { PO_STATUS, poStatusMeta, normalizePoStatus } from '../../../constants/purchaseOrders.js';
import { receivePurchaseOrder, cancelPurchaseOrder } from '../../../api/purchaseOrders.js';

export default function PurchaseOrderDetailModal({ open, onClose, order, onChanged }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  if (!order) return null;
  const meta = poStatusMeta(order.status);
  const isOrdered = normalizePoStatus(order.status) === PO_STATUS.ORDERED;

  async function run(action, fn) {
    setBusy(action);
    setError('');
    try {
      await fn(order.id);
      onChanged?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Action failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Purchase Order ${order.orderNumber || ''}`}
      description="Supplier order to replenish central warehouse stock."
      size="xl"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4 sm:grid-cols-4">
          <Info label="Supplier" value={order.supplierName || '—'} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              Status
            </p>
            <Badge tone={meta.tone} className="mt-1">
              {meta.display}
            </Badge>
          </div>
          <Info label="Created" value={formatDateTime(order.createdAt)} />
          <Info label="Received" value={order.receivedAt ? formatDateTime(order.receivedAt) : '—'} />
          {order.notes && <Info label="Notes" value={order.notes} />}
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Unit</th>
                <th className="px-4 py-2 text-right">Quantity</th>
                <th className="px-4 py-2 text-right">Unit price</th>
                <th className="px-4 py-2 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((it) => (
                <tr key={it.productId} className="border-t border-[var(--admin-border)]">
                  <td className="px-4 py-2">
                    <div className="font-medium text-[var(--admin-text)]">{it.productName}</div>
                    <div className="font-mono text-xs text-[var(--admin-subtle)]">
                      {it.productCode}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-[var(--admin-muted)]">{unitLabel(it.unit)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{it.quantity}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {it.unitPrice != null ? formatVnd(it.unitPrice) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {it.unitPrice != null
                      ? formatVnd((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {isOrdered && (
            <>
              <Button
                variant="secondary"
                loading={busy === 'cancel'}
                onClick={() => run('cancel', cancelPurchaseOrder)}
              >
                Cancel order
              </Button>
              <Button loading={busy === 'receive'} onClick={() => run('receive', receivePurchaseOrder)}>
                Receive into warehouse
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--admin-text)]">{value}</p>
    </div>
  );
}
