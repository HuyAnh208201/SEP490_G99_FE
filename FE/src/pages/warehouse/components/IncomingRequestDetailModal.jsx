import { useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import RejectReasonModal from '../../purchase-requests/components/RejectReasonModal.jsx';
import { formatDateTime } from '../../../lib/datetime.js';
import { PR_STATUS, statusMeta, normalizeStatus } from '../../../constants/purchaseRequests.js';
import { approveRequest, rejectRequest } from '../../../api/purchaseRequests.js';
import { unitLabel } from '../../../constants/productUnits.js';

/**
 * Chi tiết yêu cầu nhập hàng cho KHO TỔNG (màn 2.2).
 * Hiển thị tồn kho tổng theo từng sản phẩm để biết còn/hết hàng, cho phép duyệt/từ chối.
 * Khi duyệt: BE tự quyết định trạng thái APPROVED (đủ hàng) hoặc AWAITING_STOCK (thiếu).
 */
export default function IncomingRequestDetailModal({ open, onClose, request, onChanged }) {
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

  const isPending = request && normalizeStatus(request.status) === PR_STATUS.PENDING;

  /**
   * Danh sách sản phẩm thiếu tồn kho tổng theo SL duyệt hiện tại. Approved qty is
   * entered in TOP packaging units (e.g. cases); warehouse stock is tracked in BASE
   * units, so it must be converted via topPackagingConversionQty before comparing.
   */
  const shortages = useMemo(() => {
    if (!request?.items) return [];
    return request.items.filter((it) => {
      if (it.warehouseStock == null) return false;
      const approvedTopUnits = Number(approvedQty[it.id] ?? it.requestedQuantity ?? 0) || 0;
      const approvedBaseUnits = approvedTopUnits * (it.topPackagingConversionQty || 1);
      return approvedBaseUnits > it.warehouseStock;
    });
  }, [request, approvedQty]);

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
      <Modal
        open={open}
        onClose={onClose}
        title={`Request ${request.code}`}
        description="Review branch request against central warehouse stock, then approve or reject."
        size="xl"
      >
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

          {isPending && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                shortages.length
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {shortages.length ? (
                <>
                  <span className="font-semibold">Insufficient central stock.</span>{' '}
                  Approving will set status to <strong>AWAITING STOCK</strong> — a purchase order to
                  the supplier is required before dispatch. ({shortages.length} product
                  {shortages.length > 1 ? 's' : ''} short)
                </>
              ) : (
                <>
                  <span className="font-semibold">Central stock is sufficient.</span>{' '}
                  Approving will set status to <strong>APPROVED</strong> and move to dispatch
                  planning.
                </>
              )}
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
                  <th className="px-4 py-2.5 text-right">Warehouse stock</th>
                  <th className="px-4 py-2.5 text-right">Approved</th>
                </tr>
              </thead>
              <tbody>
                {request.items?.map((it) => {
                  const approved = Number(approvedQty[it.id] ?? it.requestedQuantity ?? 0) || 0;
                  const approvedBaseUnits = approved * (it.topPackagingConversionQty || 1);
                  const isShort = it.warehouseStock != null && approvedBaseUnits > it.warehouseStock;
                  return (
                    <tr key={it.id} className="border-t border-[var(--admin-border)]">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-[var(--admin-text)]">{it.productName}</div>
                        <div className="font-mono text-xs text-[var(--admin-subtle)]">
                          {it.productCode}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--admin-muted)]">{it.categoryName}</td>
                      <td className="px-4 py-2.5 text-[var(--admin-muted)]">
                        {it.topPackagingLabel || unitLabel(it.unit)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{it.requestedQuantity}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {it.warehouseStock == null ? (
                          <span className="text-[var(--admin-subtle)]">—</span>
                        ) : (
                          <span className={isShort ? 'font-semibold text-amber-700' : ''}>
                            {it.warehouseStock}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {isPending ? (
                          <input
                            type="number"
                            min={0}
                            value={approvedQty[it.id] ?? ''}
                            onChange={(e) =>
                              setApprovedQty((s) => ({ ...s, [it.id]: e.target.value }))
                            }
                            className={`w-20 rounded-lg border px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 ${
                              isShort
                                ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20'
                                : 'border-[var(--admin-border)] focus:border-[#0058be] focus:ring-[#0058be]/20'
                            }`}
                          />
                        ) : (
                          <span className={it.approvedQuantity == null ? 'text-[var(--admin-subtle)]' : ''}>
                            {it.approvedQuantity ?? '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
            {isPending && (
              <>
                <Button
                  variant="ghost"
                  className="!text-red-600"
                  disabled={Boolean(busy)}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </Button>
                <Button loading={busy === 'approve'} onClick={handleApprove}>
                  Approve
                </Button>
              </>
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--admin-text)]">{value}</p>
    </div>
  );
}
