import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { formatDate, formatDateTime } from '../../../lib/datetime.js';
import { unitLabel } from '../../../constants/productUnits.js';
import {
  WAREHOUSE_DISPATCH_STATUS_OPTIONS,
  dispatchStatusMeta,
  isWarehouseEditableStatus,
  normalizeDispatchStatus,
} from '../../../constants/dispatch.js';
import { updateDispatchStatus } from '../../../api/dispatch.js';
import { useSaveConfirmation } from '../../../contexts/SaveConfirmationContext.jsx';

export default function DispatchOrderDetailModal({ open, onClose, order, onChanged }) {
  const confirmSave = useSaveConfirmation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    if (order) {
      setSelectedStatus(normalizeDispatchStatus(order.status) || 'preparing');
    }
  }, [order]);

  if (!order) return null;
  const meta = dispatchStatusMeta(order.status);
  const editable = isWarehouseEditableStatus(order.status);
  const dirty = normalizeDispatchStatus(order.status) !== selectedStatus;

  async function applyStatus() {
    if (!editable || !dirty) return;
    const confirmed = await confirmSave({
      title: 'Confirm dispatch status',
      message: `Change ${order.dispatchNumber || 'this dispatch order'} status to ${dispatchStatusMeta(selectedStatus).label}?`,
      confirmLabel: 'Yes, update status',
    });
    if (!confirmed) return;
    setBusy(true);
    setError('');
    try {
      await updateDispatchStatus(order.id, selectedStatus);
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
      description="Delivery details. Delivered status is set when branch inventory staff confirms receipt."
      size="viewport"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              Status
            </p>
            {editable ? (
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-white px-2 py-1.5 text-sm"
              >
                {WAREHOUSE_DISPATCH_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <Badge tone={meta.tone} className="mt-1">
                {meta.label}
              </Badge>
            )}
          </div>
          <Info label="Created" value={formatDateTime(order.createdAt)} />
          <Info label="Shipment date" value={formatDateTime(order.shippedAt)} />
          <Info label="Sender" value={contact(order.senderName, order.senderPhone)} />
          <Info label="Assigned receiver" value={contact(order.recipientName, order.recipientPhone)} />
          <Info
            label="Delivered"
            value={order.deliveredAt ? formatDateTime(order.deliveredAt) : '—'}
          />
        </div>

        {(order.requests || []).map((req) => (
          <div key={req.requestId} className="rounded-xl border border-[var(--admin-border)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)] px-4 py-2.5">
              <span className="font-mono text-xs font-semibold text-[#0058be]">
                {req.requestNumber}
              </span>
              <span className="text-sm font-medium text-[var(--admin-text)]">{req.branchName}</span>
            </div>
            <div className="grid gap-3 border-b border-[var(--admin-border)] bg-[#fbfcfd] px-4 py-3 text-sm sm:grid-cols-4">
              <Info label="Sent request" value={formatDateTime(req.requestSubmittedAt)} />
              <Info label="Desired receive" value={formatDate(req.desiredReceiveDate)} />
              <Info label="Requested by" value={req.requestedByName || '—'} />
              <Info label="Actual receiver" value={req.receivedByName || 'Not received'} />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                  <tr>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Unit</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2 text-right">Cost</th>
                    <th className="px-4 py-2 text-right">Document Qty</th>
                    <th className="px-4 py-2 text-right">Actual Qty</th>
                    <th className="px-4 py-2 text-right">Difference</th>
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
                      <td className="px-4 py-2 text-[var(--admin-muted)]">{it.categoryName || '—'}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{money(it.unitCost)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{it.quantity}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{it.actualReceivedQuantity ?? '—'}</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${(it.difference ?? 0) < 0 ? 'font-semibold text-red-600' : ''}`}>
                        {it.difference == null ? '—' : it.difference > 0 ? `+${it.difference}` : it.difference}
                      </td>
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
          {editable && (
            <Button loading={busy} disabled={!dirty} onClick={applyStatus}>
              Apply status
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

function contact(name, phone) { return [name, phone].filter(Boolean).join(' · ') || '—'; }
function money(value) { return value == null ? '—' : `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} ₫`; }
