import { useCallback, useEffect, useState } from 'react';
import { fetchMe } from '../../api/users.js';
import { listRequests } from '../../api/purchaseRequests.js';
import { fetchShifts } from '../../api/shifts.js';
import { fetchBranchInventory } from '../../api/inventory.js';
import {
  approveSession,
  fetchPendingApprovals,
  rejectSession,
} from '../../api/shiftSessions.js';
import {
  approveRefund,
  fetchPendingRefunds,
  rejectRefund,
} from '../../api/posOrders.js';
import Card from '../../components/ui/Card.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { PR_STATUS, normalizeStatus } from '../../constants/purchaseRequests.js';
import { formatVnd } from '../../lib/money.js';
import { formatDateTime } from '../../lib/datetime.js';

export default function BranchManagerDashboardPage() {
  const [stats, setStats] = useState({
    pendingImports: '—',
    openShifts: '—',
    staffOnShift: '—',
    lowStockSkus: '—',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const me = await fetchMe();
        const branchId = me?.branchId ?? me?.branch_id;
        if (!branchId) throw new Error('Branch not assigned');

        const [requests, shifts, inventory] = await Promise.all([
          listRequests({ branchId }),
          fetchShifts(branchId),
          fetchBranchInventory(branchId),
        ]);

        const pending = (requests || []).filter((r) => {
          const s = normalizeStatus(r.status);
          return s === PR_STATUS.PENDING || s === PR_STATUS.APPROVED || s === PR_STATUS.IN_TRANSIT;
        }).length;

        const published = (shifts || []).filter((s) => s.status === 'PUBLISHED');
        const staffCount = published.reduce(
          (sum, s) => sum + (s.assignedEmployees?.length || 0),
          0,
        );
        const lowStock = (inventory || []).filter((row) => (row.quantity ?? 0) <= 5).length;

        if (!cancelled) {
          setStats({
            pendingImports: String(pending),
            openShifts: String(published.length),
            staffOnShift: String(staffCount),
            lowStockSkus: String(lowStock),
          });
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load branch stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch operations"
        description="Overview of imports, shifts, and branch stock at your branch."
      />
      {error && <p className="text-sm text-amber-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending imports" value={loading ? '…' : stats.pendingImports} icon="request" />
        <StatCard label="Published shifts" value={loading ? '…' : stats.openShifts} icon="clock" />
        <StatCard label="Staff assigned" value={loading ? '…' : stats.staffOnShift} icon="staff" />
        <StatCard label="Low stock SKUs" value={loading ? '…' : stats.lowStockSkus} icon="boxes" />
      </div>
      <Card className="p-4 text-sm text-[var(--admin-muted)]">
        Revenue metrics will be available after the POS module ships (next sprint).
      </Card>
    </div>
  );
}

function DifferenceValue({ difference }) {
  const diff = Number(difference ?? 0);
  if (diff > 0) {
    return (
      <span className="font-semibold text-emerald-600">
        +{formatVnd(diff)} (over)
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="font-semibold text-red-600">
        −{formatVnd(Math.abs(diff))} (short)
      </span>
    );
  }
  return (
    <span className="font-semibold text-[var(--admin-muted)]">
      {formatVnd(0)} (balanced)
    </span>
  );
}

function PendingApprovalCard({ session, note, onNoteChange, onApprove, onReject, submitting }) {
  const diff = Number(session.difference ?? 0);
  const noteFilled = (note || '').trim().length > 0;
  const approveNeedsNote = diff !== 0;
  const approveDisabled = submitting || (approveNeedsNote && !noteFilled);
  const rejectDisabled = submitting || !noteFilled;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[var(--admin-text)]">{session.employeeName}</p>
          <p className="text-xs text-[var(--admin-muted)]">
            Shift #{session.shiftId} · closed {formatDateTime(session.closedAt)}
          </p>
        </div>
        <Badge tone="warning">Pending approval</Badge>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[var(--admin-muted)]">Opening fund</dt>
          <dd className="font-semibold">{formatVnd(session.openingFundAmount)}</dd>
        </div>
        <div>
          <dt className="text-[var(--admin-muted)]">Cash sales</dt>
          <dd className="font-semibold">{formatVnd(session.cashSales)}</dd>
        </div>
        <div>
          <dt className="text-[var(--admin-muted)]">Expected cash</dt>
          <dd className="font-semibold">{formatVnd(session.expectedCash)}</dd>
        </div>
        <div>
          <dt className="text-[var(--admin-muted)]">Actual cash</dt>
          <dd className="font-semibold">{formatVnd(session.actualCash)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--admin-border)] bg-[#f7f9fb] px-4 py-3 text-sm">
        <span className="text-[var(--admin-muted)]">Difference</span>
        <DifferenceValue difference={session.difference} />
        <span className="ml-auto text-xs text-[var(--admin-muted)]">
          {session.transactionCount ?? 0} transactions
        </span>
      </div>

      {session.handoverRemark && (
        <div className="rounded-lg border border-[var(--admin-border)] px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
            Cashier remark
          </p>
          <p className="mt-1 text-[var(--admin-text)]">{session.handoverRemark}</p>
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1 block text-[var(--admin-muted)]">
          Review note {approveNeedsNote ? '(required when there is a difference)' : '(optional)'}
        </span>
        <textarea
          className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"
          rows={3}
          placeholder="Explain your approval or the reason for rejection…"
          value={note || ''}
          onChange={(e) => onNoteChange(session.id, e.target.value)}
        />
      </label>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={rejectDisabled}
          onClick={() => onReject(session)}
        >
          Reject
        </Button>
        <Button
          loading={submitting}
          disabled={approveDisabled}
          onClick={() => onApprove(session)}
        >
          Approve
        </Button>
      </div>
      {approveNeedsNote && (
        <p className="text-xs text-amber-700">
          A note is required to approve a shift that does not balance.
        </p>
      )}
    </Card>
  );
}

export function CashDiscrepancyPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchPendingApprovals();
      setSessions(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message || 'Failed to load pending approvals');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleNoteChange(id, value) {
    setNotes((prev) => ({ ...prev, [id]: value }));
  }

  function clearNote(id) {
    setNotes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleApprove(session) {
    const note = (notes[session.id] || '').trim();
    setSubmittingId(session.id);
    setError('');
    try {
      await approveSession(session.id, note);
      clearNote(session.id);
      await load();
    } catch (err) {
      setError(err?.message || 'Could not approve the shift');
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleReject(session) {
    const note = (notes[session.id] || '').trim();
    if (!note) return;
    setSubmittingId(session.id);
    setError('');
    try {
      await rejectSession(session.id, note);
      clearNote(session.id);
      await load();
    } catch (err) {
      setError(err?.message || 'Could not reject the shift');
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash reconciliation"
        description="Review the expected vs. actual cash of closed cashier shifts and approve or reject the handover."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
      ) : sessions.length === 0 ? (
        <Card className="p-6 text-sm text-[var(--admin-muted)]">
          No shifts are waiting for approval.
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <PendingApprovalCard
              key={session.id}
              session={session}
              note={notes[session.id]}
              onNoteChange={handleNoteChange}
              onApprove={handleApprove}
              onReject={handleReject}
              submitting={submittingId === session.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingRefundCard({ refund, note, onNoteChange, onApprove, onReject, submitting }) {
  const noteFilled = (note || '').trim().length > 0;
  const rejectDisabled = submitting || !noteFilled;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[var(--admin-text)]">{refund.invoiceCode}</p>
          <p className="text-xs text-[var(--admin-muted)]">
            Requested by {refund.requestedByName} · {formatDateTime(refund.createdAt)}
          </p>
        </div>
        <Badge tone="warning">Pending approval</Badge>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--admin-muted)]">Order total</dt>
          <dd className="font-semibold">{formatVnd(refund.orderTotal)}</dd>
        </div>
        <div>
          <dt className="text-[var(--admin-muted)]">Requested by</dt>
          <dd className="font-semibold">{refund.requestedByName}</dd>
        </div>
      </dl>

      <div className="rounded-lg border border-[var(--admin-border)] px-4 py-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
          Refund reason
        </p>
        <p className="mt-1 text-[var(--admin-text)]">{refund.reason || '—'}</p>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-[var(--admin-muted)]">
          Review note (required when rejecting)
        </span>
        <textarea
          className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"
          rows={3}
          placeholder="Add a note explaining your decision…"
          value={note || ''}
          onChange={(e) => onNoteChange(refund.refundId, e.target.value)}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-amber-700">
          Approving will restore stock and cancel the order.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={rejectDisabled} onClick={() => onReject(refund)}>
            Reject
          </Button>
          <Button loading={submitting} disabled={submitting} onClick={() => onApprove(refund)}>
            Approve
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function RefundApprovalPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchPendingRefunds();
      setRefunds(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message || 'Failed to load pending refunds');
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleNoteChange(id, value) {
    setNotes((prev) => ({ ...prev, [id]: value }));
  }

  function clearNote(id) {
    setNotes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleApprove(refund) {
    const note = (notes[refund.refundId] || '').trim();
    setSubmittingId(refund.refundId);
    setError('');
    try {
      await approveRefund(refund.refundId, note);
      clearNote(refund.refundId);
      await load();
    } catch (err) {
      setError(err?.message || 'Could not approve the refund');
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleReject(refund) {
    const note = (notes[refund.refundId] || '').trim();
    if (!note) return;
    setSubmittingId(refund.refundId);
    setError('');
    try {
      await rejectRefund(refund.refundId, note);
      clearNote(refund.refundId);
      await load();
    } catch (err) {
      setError(err?.message || 'Could not reject the refund');
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Refund approvals"
        description="Review refund requests raised by cashiers and approve or reject them."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
      ) : refunds.length === 0 ? (
        <Card className="p-6 text-sm text-[var(--admin-muted)]">
          No refunds are waiting for approval.
        </Card>
      ) : (
        <div className="space-y-4">
          {refunds.map((refund) => (
            <PendingRefundCard
              key={refund.refundId}
              refund={refund}
              note={notes[refund.refundId]}
              onNoteChange={handleNoteChange}
              onApprove={handleApprove}
              onReject={handleReject}
              submitting={submittingId === refund.refundId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
