import { useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { formatDate, formatDateTime } from '../../../lib/datetime.js';
import {
  PR_STATUS,
  statusMeta,
  normalizeStatus,
  canApproveRequest,
} from '../../../constants/purchaseRequests.js';
import { approveRequest } from '../../../api/purchaseRequests.js';
import { unitLabel } from '../../../constants/productUnits.js';
import { useSaveConfirmation } from '../../../contexts/SaveConfirmationContext.jsx';
import { usePermissions } from '../../../contexts/PermissionsContext.jsx';

/**
 * Incoming request detail for central warehouse.
 * Approve + editable approved qty are WM-only; Admin/Director are view-only.
 */
export default function IncomingRequestDetailModal({ open, onClose, request, onChanged }) {
  const confirmSave = useSaveConfirmation();
  const { has } = usePermissions();
  const canApprove = canApproveRequest(has);
  const [approvedQty, setApprovedQty] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

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
  const canEditApprove = isPending && canApprove;

  /**
   * Products short on central stock for the current approved qty. Approved qty is
   * entered in TOP packaging units (e.g. cases); warehouse stock is tracked in BASE
   * units, so it must be converted via topPackagingConversionQty before comparing.
   */
  const shortages = useMemo(() => {
    if (!request?.items) return [];
    return request.items.filter((it) => {
      // Short-date SKUs skip central warehouse — BE does not reserve stock for them.
      if (it.shortDate) return false;
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

  async function handleApprove() {
    const items = request.items.map((it) => ({
      productId: it.productId,
      approvedQuantity: Number(approvedQty[it.id]) || 0,
    }));
    const confirmed = await confirmSave({
      title: 'Confirm request approval',
      message: `Approve ${request.code || 'this request'} with ${items.length} reviewed product line(s)?`,
      confirmLabel: 'Yes, approve request',
    });
    if (!confirmed) return;
    run('approve', () => approveRequest(request.id, items));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Request ${request.code}`}
      size="xl"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/60 p-4 sm:grid-cols-5">
          <Info label="Branch" value={request.branchName} />
          <Info label="Created by" value={request.createdByName} />
          <Info label="Sent request" value={formatDateTime(request.submittedAt || request.createdAt)} />
          <Info label="Desired receive" value={formatDate(request.desiredReceiveDate)} />
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

        {canEditApprove && shortages.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span className="font-semibold">Insufficient central stock.</span>{' '}
            ({shortages.length} product
            {shortages.length > 1 ? 's' : ''} short)
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
                const conversionQty = it.topPackagingConversionQty || 1;
                const approved = Number(approvedQty[it.id] ?? it.requestedQuantity ?? 0) || 0;
                const approvedBaseUnits = approved * conversionQty;
                const isShortDate = Boolean(it.shortDate);
                const isShort =
                  !isShortDate &&
                  it.warehouseStock != null &&
                  approvedBaseUnits > it.warehouseStock;
                // Display warehouse stock in TOP units to match Requested / Approved.
                const warehouseStockTop =
                  isShortDate || it.warehouseStock == null
                    ? null
                    : Math.floor(Number(it.warehouseStock) / conversionQty);
                return (
                  <tr key={it.id} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[var(--admin-text)]">
                        {it.productName || it.name || it.productCode || '—'}
                      </div>
                      <div className="font-mono text-xs text-[var(--admin-subtle)]">
                        {it.productCode}
                      </div>
                      {isShortDate && (
                        <div className="mt-0.5 text-[11px] font-medium text-amber-700">
                          Short-date — supplier direct (no central stock)
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--admin-muted)]">{it.categoryName}</td>
                    <td className="px-4 py-2.5 text-[var(--admin-muted)]">
                      {it.topPackagingLabel || unitLabel(it.unit)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{it.requestedQuantity}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {isShortDate ? (
                        <span className="text-[var(--admin-subtle)]">N/A</span>
                      ) : warehouseStockTop == null ? (
                        <span className="text-[var(--admin-subtle)]">—</span>
                      ) : (
                        <span className={isShort ? 'font-semibold text-amber-700' : ''}>
                          {warehouseStockTop}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {canEditApprove ? (
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
                        <span
                          className={
                            it.approvedQuantity == null && !isPending
                              ? 'text-[var(--admin-subtle)]'
                              : ''
                          }
                        >
                          {isPending
                            ? (approvedQty[it.id] ?? it.requestedQuantity ?? '—')
                            : (it.approvedQuantity ?? '—')}
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
          {canEditApprove && (
            <Button loading={busy === 'approve'} onClick={handleApprove}>
              Approve
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
