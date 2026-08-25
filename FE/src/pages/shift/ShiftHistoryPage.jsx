import { useCallback } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { fetchShiftSessionHistory } from '../../api/shiftSessions.js';
import useServerPage from '../../hooks/useServerPage.js';
import { formatDateTime } from '../../lib/datetime.js';

const STATUS_TONE = {
  SCHEDULED: 'default',
  OPEN: 'brand',
  CLOSING: 'warning',
  PENDING_HANDOVER: 'warning',
  CLOSED: 'success',
  COMPLETED: 'success',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export default function ShiftHistoryPage() {
  const fetchPage = useCallback((params) => fetchShiftSessionHistory(params), []);
  const pageData = useServerPage(fetchPage);
  const { items: rows, loading, error } = pageData;

  return (
    <div className="mx-auto min-h-0 w-full max-w-3xl flex-1 space-y-6 overflow-y-auto p-4 lg:p-6">
      <PageHeader title="Shift history" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Card padding={false} className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-[#eef2f6]" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">No shift sessions yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-[var(--admin-border)]">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                  <div>
                    <p className="font-semibold text-[var(--admin-text)]">
                      Shift #{row.shift?.shiftNumber ?? '—'}{' '}
                      {row.shift && (
                        <span className="text-sm font-normal text-[var(--admin-muted)]">
                          {formatDateTime(row.shift.startTime)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--admin-muted)]">
                      Opened {formatDateTime(row.openedAt)} · Closed {formatDateTime(row.closedAt)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      Opening fund: {Number(row.openingFundAmount ?? 0).toLocaleString('en-US')} VND
                      {row.openingFundReceivedFromName ? ` · From ${row.openingFundReceivedFromName}` : ''}
                      {row.openingFundMethod ? ` · ${row.openingFundMethod === 'TRANSFER' ? 'Transfer' : 'Cash'}` : ''}
                    </p>
                    {row.handoverToEmployeeName ? (
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        Handed over to {row.handoverToEmployeeName}
                        {row.actualCash != null ? ` · Actual cash ${Number(row.actualCash).toLocaleString('en-US')} VND` : ''}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={STATUS_TONE[row.status] || 'default'}>{row.status}</Badge>
                </li>
              ))}
            </ul>
            <Pagination
              {...pageData}
              onPageChange={pageData.setPage}
              onSizeChange={pageData.setSize}
              disabled={loading}
            />
          </>
        )}
      </Card>
    </div>
  );
}
