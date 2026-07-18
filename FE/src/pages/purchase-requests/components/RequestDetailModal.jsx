import { useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import RejectReasonModal from './RejectReasonModal.jsx';
import { formatDateTime } from '../../../lib/datetime.js';
import {
  PR_STATUS,
  statusMeta,
  normalizeStatus,
  canApproveRequest,
  canReceiveRequest,
  canCreateRequest,
} from '../../../constants/purchaseRequests.js';
import { usePermissions } from '../../../contexts/PermissionsContext.jsx';
import {
  approveRequest,
  rejectRequest,
  receiveRequest,
  cancelRequest,
} from '../../../api/purchaseRequests.js';
import { unitLabel } from '../../../constants/productUnits.js';

export default function RequestDetailModal({ open, onClose, request, currentUserId, onEdit, onChanged }) {
  const { has } = usePermissions();
  const [approvedQty, setApprovedQty] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    if (request?.items) {
      const seed = {};
      request.items.forEach((it) => {
        seed[it.id] = it.approvedQuantity ?? it.requestedQuantity ?? 0;
      });
      setApprovedQty(seed);
      setError('');
    }
  }, [request]);

  const isOwner = request && currentUserId != null && request.createdBy === currentUserId;

  const mode = useMemo(() => {
    if (!request) return 'view';
    const status = normalizeStatus(request.status);
    if (status === PR_STATUS.DRAFT && canCreateRequest(has)) return 'draft';
    if (status === PR_STATUS.PENDING && canApproveRequest(has)) return 'approve';
    if (status === PR_STATUS.APPROVED && canReceiveRequest(has)) return 'receive';
    return 'view';
  }, [request, has]);

  if (!request) return null;
  const meta = statusMeta(request.status);

  async function run(label, fn) {
    setBusy(label);
    setError('');
    try {
      await fn();
      onChanged?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Action failed');
    } finally {
      setBusy('');
    }
  }

  function handleApprove() {
    const items = request.items.map((it) => ({
      productId: it.productId,
      approvedQuantity: Number(approvedQty[it.id]) || 0,
    }));
    run('approve', () => approveRequest(request.id, items));
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Request ${request.code}`} size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4 sm:grid-cols-4">
            <Info label="Branch" value={request.branchName} />
            <Info label="Created by" value={request.createdByName} />
            <Info label="Created" value={formatDateTime(request.createdAt)} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                Status
              </p>
              <Badge tone={meta.tone} className="mt-1">
                {meta.display}
              </Badge>
            </div>
          </div>

          {request.reason && (
            <p className="text-sm text-[var(--admin-muted)]">
              <span className="font-semibold text-[var(--admin-text)]">Reason: </span>
              {request.reason}
            </p>
          )}

          {normalizeStatus(request.status) === PR_STATUS.REJECTED && request.rejectReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <span className="font-semibold">Rejection reason: </span>
              {request.rejectReason}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Purchase unit</th>
                  <th className="px-4 py-2.5 text-right">Requested</th>
                  <th className="px-4 py-2.5 text-right">Approved</th>
                </tr>
              </thead>
              <tbody>
                {request.items?.map((it) => (
                  <tr key={it.id} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[var(--admin-text)]">{it.productName}</div>
                      <div className="font-mono text-xs text-[var(--admin-subtle)]">{it.productCode}</div>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--admin-muted)]">{it.categoryName}</td>
                    <td className="px-4 py-2.5 text-[var(--admin-muted)]">
                      {it.topPackagingLabel || unitLabel(it.unit)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{it.requestedQuantity}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {mode === 'approve' ? (
                        <input
                          type="number"
                          min={0}
                          value={approvedQty[it.id] ?? ''}
                          onChange={(e) =>
                            setApprovedQty((s) => ({ ...s, [it.id]: e.target.value }))
                          }
                          className="w-20 rounded-lg border border-[var(--admin-border)] px-2 py-1 text-right text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                        />
                      ) : (
                        <span className={it.approvedQuantity == null ? 'text-[var(--admin-subtle)]' : ''}>
                          {it.approvedQuantity ?? '—'}
                        </span>
                      )}
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

            {mode === 'draft' && isOwner && (
              <>
                <Button
                  variant="ghost"
                  className="!text-red-600"
                  loading={busy === 'cancel'}
                  onClick={() => run('cancel', () => cancelRequest(request.id))}
                >
                  Cancel draft
                </Button>
                <Button onClick={() => onEdit?.(request)}>Edit request</Button>
              </>
            )}

            {mode === 'approve' && (
              <>
                <Button
                  variant="ghost"
                  className="!text-red-600"
                  disabled={busy}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </Button>
                <Button loading={busy === 'approve'} onClick={handleApprove}>
                  Approve
                </Button>
              </>
            )}

            {mode === 'receive' && (
              <Button loading={busy === 'receive'} onClick={() => run('receive', () => receiveRequest(request.id))}>
                Receive goods
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <RejectReasonModal
        open={rejectOpen}
        loading={busy === 'reject'}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => {
          setRejectOpen(false);
          run('reject', () => rejectRequest(request.id, reason));
        }}
      />
    </>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--admin-text)]">{value}</p>
    </div>
  );
}
