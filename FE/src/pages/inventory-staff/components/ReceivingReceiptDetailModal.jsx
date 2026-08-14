import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { formatDate, formatDateTime } from '../../../lib/datetime.js';
import { approvalStatusMeta } from '../../../constants/inventoryStaff.js';
import { getReceiptDetail } from '../../../api/branchReceiving.js';
import { ReceiptTable } from '../../branch-manager/components/SupplyReceiptDetailModal.jsx';

export default function ReceivingReceiptDetailModal({ open, receiptId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !receiptId) return;
    let active = true;
    setLoading(true);
    setError('');
    getReceiptDetail(receiptId)
      .then((data) => active && setDetail(data))
      .catch((err) => active && setError(err?.message || 'Failed to load receipt'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, receiptId]);

  const meta = approvalStatusMeta(detail?.status);
  return (
    <Modal open={open} onClose={onClose} title={`Receipt ${detail?.receiptCode || ''}`} description="Full receipt details and recorded variances." size="viewport">
      {loading ? <div className="h-40 animate-pulse rounded bg-[#eceef0]" /> : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : detail ? <div className="space-y-5">
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
      </div> : null}
    </Modal>
  );
}

function Info({ label, value, mono }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">{label}</p><p className={`mt-1 text-sm font-medium ${mono ? 'font-mono text-[#0058be]' : ''}`}>{value}</p></div>;
}
function contact(name, phone) { return [name, phone].filter(Boolean).join(' · ') || '—'; }
