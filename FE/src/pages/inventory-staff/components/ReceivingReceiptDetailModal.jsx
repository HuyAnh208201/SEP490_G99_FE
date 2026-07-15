import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { formatDateTime } from '../../../lib/datetime.js';
import { unitLabel } from '../../../constants/productUnits.js';
import { approvalStatusMeta } from '../../../constants/inventoryStaff.js';
import { getReceiptDetail } from '../../../api/branchReceiving.js';

export default function ReceivingReceiptDetailModal({ open, receiptId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !receiptId) return;
    let active = true;
    setLoading(true);
    setError('');
    setDetail(null);
    getReceiptDetail(receiptId)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Failed to load receipt');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, receiptId]);

  const meta = approvalStatusMeta(detail?.status);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Receipt ${detail?.receiptCode || ''}`}
      description="Goods receipt details."
      size="xl"
    >
      {loading ? (
        <div className="h-40 animate-pulse rounded bg-[#eceef0]" />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : detail ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4 sm:grid-cols-4">
            <Info label="Dispatch Order" value={detail.dispatchNumber || '—'} mono />
            <Info label="Request" value={detail.requestNumber || '—'} mono />
            <Info label="Received At" value={formatDateTime(detail.receivedAt)} />
            <Info label="Received By" value={detail.receivedByName || '—'} />
            <Info label="Store" value={detail.storeName || '—'} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                Status
              </p>
              <Badge tone={meta.tone} className="mt-1">
                {meta.label}
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2 text-right">Ordered</th>
                  <th className="px-4 py-2 text-right">Received</th>
                  <th className="px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {(detail.items || []).map((it) => {
                  const variance = (it.receivedQuantity ?? 0) - (it.orderedQuantity ?? 0);
                  return (
                    <tr key={it.productId} className="border-t border-[var(--admin-border)]">
                      <td className="px-4 py-2">
                        <div className="font-medium text-[var(--admin-text)]">{it.productName}</div>
                        <div className="font-mono text-xs text-[var(--admin-subtle)]">
                          {it.productCode}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-[var(--admin-muted)]">{unitLabel(it.unit)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{it.orderedQuantity}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        <span className={variance < 0 ? 'font-semibold text-red-600' : ''}>
                          {it.receivedQuantity}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[var(--admin-muted)]">{it.note || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function Info({ label, value, mono }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-medium text-[var(--admin-text)] ${mono ? 'font-mono text-[#0058be]' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
