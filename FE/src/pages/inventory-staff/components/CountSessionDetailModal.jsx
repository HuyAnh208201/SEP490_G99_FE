import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { formatDateTime } from '../../../lib/datetime.js';
import { unitLabel } from '../../../constants/productUnits.js';
import { approvalStatusMeta } from '../../../constants/inventoryStaff.js';
import {
  approveCountSession,
  getCountSession,
  rejectCountSession,
} from '../../../api/inventoryCount.js';
import { useSaveConfirmation } from '../../../contexts/SaveConfirmationContext.jsx';

export default function CountSessionDetailModal({ open, sessionId, onClose, onChanged }) {
  const confirmSave = useSaveConfirmation();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!open || !sessionId) return;
    let active = true;
    setLoading(true);
    setError('');
    setDetail(null);
    getCountSession(sessionId)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Failed to load count session');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, sessionId]);

  const meta = approvalStatusMeta(detail?.status);
  const pending = String(detail?.status).toUpperCase() === 'PENDING_APPROVAL';

  async function act(kind) {
    const confirmed = await confirmSave({
      title: kind === 'approve' ? 'Confirm count approval' : 'Confirm count rejection',
      message:
        kind === 'approve'
          ? 'Approve this physical count and update stock with every recorded variance?'
          : 'Reject this physical count without updating stock?',
      confirmLabel: kind === 'approve' ? 'Yes, approve and update' : 'Yes, reject count',
      danger: kind !== 'approve',
    });
    if (!confirmed) return;
    setBusy(kind);
    setError('');
    try {
      const updated =
        kind === 'approve'
          ? await approveCountSession(sessionId)
          : await rejectCountSession(sessionId);
      setDetail(updated);
      onChanged?.();
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
      title={`Count Session ${detail?.sessionCode || ''}`}
      description="Physical stock count details and approval."
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {error && <span className="mr-auto text-sm text-red-600">{error}</span>}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {pending && (
            <>
              <Button
                variant="secondary"
                loading={busy === 'reject'}
                onClick={() => act('reject')}
              >
                Reject
              </Button>
              <Button loading={busy === 'approve'} onClick={() => act('approve')}>
                Approve &amp; update stock
              </Button>
            </>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="h-40 animate-pulse rounded bg-[#eceef0]" />
      ) : detail ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4 sm:grid-cols-4">
            <Info label="Count Date" value={detail.countDate || '—'} />
            <Info label="Counted By" value={detail.countedByName || '—'} />
            <Info label="Total Products" value={detail.totalProducts ?? 0} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                Status
              </p>
              <Badge tone={meta.tone} className="mt-1">
                {meta.label}
              </Badge>
            </div>
            <Info label="Submitted" value={formatDateTime(detail.createdAt)} />
            <Info label="Reviewed By" value={detail.reviewedByName || '—'} />
            <Info
              label="Reviewed At"
              value={detail.reviewedAt ? formatDateTime(detail.reviewedAt) : '—'}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2 text-right">System</th>
                  <th className="px-4 py-2 text-right">Counted</th>
                  <th className="px-4 py-2 text-right">Variance</th>
                  <th className="px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {(detail.items || []).map((it) => (
                  <tr key={it.productId} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-2">
                      <div className="font-medium text-[var(--admin-text)]">{it.productName}</div>
                      <div className="font-mono text-xs text-[var(--admin-subtle)]">
                        {it.productCode}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-[var(--admin-muted)]">{unitLabel(it.unit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{it.systemQty}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{it.countedQty}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      <span
                        className={
                          it.variance === 0
                            ? 'text-[var(--admin-muted)]'
                            : it.variance > 0
                              ? 'font-semibold text-emerald-600'
                              : 'font-semibold text-red-600'
                        }
                      >
                        {it.variance > 0 ? `+${it.variance}` : it.variance}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[var(--admin-muted)]">{it.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || 'Count session not found.'}
        </div>
      )}
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
