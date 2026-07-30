import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { fetchShiftSessionHistory } from '../../api/shiftSessions.js';
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
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchShiftSessionHistory();
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
      <PageHeader title="Shift history" description="Your recent shift sessions." />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Card padding={false} className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">No shift sessions yet.</p>
        ) : (
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
                </div>
                <Badge tone={STATUS_TONE[row.status] || 'default'}>{row.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
