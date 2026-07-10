import { useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { formatDateTime } from '../../../lib/datetime.js';
import { unitLabel } from '../../../constants/productUnits.js';
import {
  dispatchStatusMeta,
  nextDispatchStatus,
  DISPATCH_STATUS_META,
} from '../../../constants/dispatch.js';
import { updateDispatchStatus } from '../../../api/dispatch.js';

export default function DispatchOrderDetailModal({ open, onClose, order, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!order) return null;
  const meta = dispatchStatusMeta(order.status);
  const next = nextDispatchStatus(order.status);

  async function advance() {
    if (!next) return;
    setBusy(true);
    setError('');
    try {
      await updateDispatchStatus(order.id, next);
      onChanged?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to update status');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Dispatch ${order.dispatchNumber || ''}`}
      description="Delivery batch details and shipment progress."
      size="xl"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4 sm:grid-cols-4">
          <Info label="Vehicle" value={order.vehicle || '—'} />
          <Info label="Delivery area" value={order.deliveryArea || '—'} />
          <Info label="Route" value={order.route || '—'} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              Status
            </p>
            <Badge tone={meta.tone} className="mt-1">
              {meta.display}
            </Badge>
          </div>
          <Info label="Created" value={formatDateTime(order.createdAt)} />
          <Info label="Delivered" value={order.deliveredAt ? formatDateTime(order.deliveredAt) : '—'} />
        </div>

        {(order.requests || []).map((req) => (
          <div key={req.requestId} className="rounded-xl border border-[var(--admin-border)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)] px-4 py-2.5">
              <span className="font-mono text-xs font-semibold text-[#0058be]">
                {req.requestNumber}
              </span>
              <span className="text-sm font-medium text-[var(--admin-text)]">{req.branchName}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                  <tr>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Unit</th>
                    <th className="px-4 py-2 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {(req.items || []).map((it) => (
                    <tr key={it.productId} className="border-t border-[var(--admin-border)]">
                      <td className="px-4 py-2">
                        <div className="font-medium text-[var(--admin-text)]">{it.productName}</div>
                        <div className="font-mono text-xs text-[var(--admin-subtle)]">
                          {it.productCode}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-[var(--admin-muted)]">{unitLabel(it.unit)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {next && (
            <Button loading={busy} onClick={advance}>
              Mark as {DISPATCH_STATUS_META[next].label}
            </Button>
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
