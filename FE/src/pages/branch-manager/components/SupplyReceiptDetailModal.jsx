import { useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { formatDate, formatDateTime } from '../../../lib/datetime.js';
import { unitLabel } from '../../../constants/productUnits.js';
import { approvalStatusMeta } from '../../../constants/inventoryStaff.js';
import { createSupplementalRequest, getReceiptDetail } from '../../../api/branchReceiving.js';
import { usePermissions } from '../../../contexts/PermissionsContext.jsx';

export default function SupplyReceiptDetailModal({ open, receiptId, onClose }) {
  const { has } = usePermissions();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [supplement, setSupplement] = useState(null);

  useEffect(() => {
    if (!open || !receiptId) return;
    let active = true;
    setLoading(true);
    setError('');
    setSupplement(null);
    getReceiptDetail(receiptId)
      .then((data) => active && setDetail(data))
      .catch((err) => active && setError(err?.message || 'Failed to load receipt'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, receiptId]);

  const hasShortage = useMemo(
    () => (detail?.items || []).some((item) => (item.difference ?? 0) < 0),
    [detail],
  );
  const meta = approvalStatusMeta(detail?.status);

  async function createSupplement() {
    setBusy(true);
    setError('');
    try {
      setSupplement(await createSupplementalRequest(receiptId));
    } catch (err) {
      setError(err?.message || 'Failed to create supplemental request');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Receiving receipt ${detail?.receiptCode || ''}`}
      description="Read-only receipt report. Stock was updated when branch staff confirmed actual quantities."
      size="viewport"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {error && <span className="mr-auto text-sm text-red-600">{error}</span>}
          {supplement && (
            <span className="mr-auto text-sm text-emerald-700">
              {supplement.existing ? 'Existing' : 'Created'} draft {supplement.requestNumber}
            </span>
          )}
          {has('CREATE_IMPORT_REQUEST') && hasShortage && (
            <Button loading={busy} onClick={createSupplement}>Create supplemental request</Button>
          )}
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {loading ? <div className="h-40 animate-pulse rounded bg-[#eceef0]" /> : detail ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4 md:grid-cols-4 xl:grid-cols-6">
            <Info label="Dispatch" value={detail.dispatchNumber || '—'} mono />
            <Info label="Request" value={detail.requestNumber || '—'} mono />
              <Info label="Sent request" value={formatDateTime(detail.requestSubmittedAt)} />
            <Info label="Desired receive" value={formatDate(detail.desiredReceiveDate)} />
            <Info label="Shipment date" value={formatDateTime(detail.shipmentDate)} />
            <Info label="Requested by" value={detail.requestedByName || '—'} />
            <Info label="Sender" value={contact(detail.senderName, detail.senderPhone)} />
            <Info label="Assigned receiver" value={contact(detail.assignedReceiverName, detail.assignedReceiverPhone)} />
            <Info label="Actual receiver" value={contact(detail.receivedByName, detail.receivedByPhone)} />
            <Info label="Received at" value={formatDateTime(detail.receivedAt)} />
            <Info label="Store" value={detail.storeName || '—'} />
            <div><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">Status</p><Badge tone={meta.tone} className="mt-1">{meta.label}</Badge></div>
          </div>
          <ReceiptTable items={detail.items || []} />
        </div>
      ) : <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error || 'Receipt not found.'}</div>}
    </Modal>
  );
}

export function ReceiptTable({ items }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]"><tr>
          <th className="px-4 py-3">Product</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Unit</th>
          <th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">Document Qty</th>
          <th className="px-4 py-3 text-right">Actual Qty</th><th className="px-4 py-3 text-right">Difference</th><th className="px-4 py-3">Notes</th>
        </tr></thead>
        <tbody>{items.map((item) => {
          const difference = item.difference ?? ((item.receivedQuantity ?? 0) - (item.orderedQuantity ?? 0));
          return <tr key={item.productId} className="border-t border-[var(--admin-border)]">
            <td className="px-4 py-3"><div className="font-medium">{item.productName}</div><div className="font-mono text-xs text-[var(--admin-subtle)]">{item.productCode}</div></td>
            <td className="px-4 py-3 text-[var(--admin-muted)]">{item.categoryName || '—'}</td>
            <td className="px-4 py-3 text-[var(--admin-muted)]">{unitLabel(item.unit)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{money(item.unitCost)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{item.orderedQuantity}</td>
            <td className="px-4 py-3 text-right tabular-nums">{item.receivedQuantity}</td>
            <td className={`px-4 py-3 text-right font-semibold tabular-nums ${difference < 0 ? 'text-red-600' : difference > 0 ? 'text-emerald-600' : 'text-[var(--admin-muted)]'}`}>{difference > 0 ? `+${difference}` : difference}</td>
            <td className="px-4 py-3 text-[var(--admin-muted)]">{item.note || '—'}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function Info({ label, value, mono }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">{label}</p><p className={`mt-1 text-sm font-medium ${mono ? 'font-mono text-[#0058be]' : ''}`}>{value}</p></div>;
}
function contact(name, phone) { return [name, phone].filter(Boolean).join(' · ') || '—'; }
function money(value) { return value == null ? '—' : `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} ₫`; }
