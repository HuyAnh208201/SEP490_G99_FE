import { useCallback, useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { checkInShift, fetchMyShifts } from '../../api/shifts.js';
import { formatDateTime } from '../../lib/datetime.js';

const STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'default' },
  PUBLISHED: { label: 'Published', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

export default function MyShiftsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyShifts();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load shifts');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCheckIn(shift) {
    setBusyId(shift.id);
    setError('');
    try {
      await checkInShift(shift.id);
      await load();
    } catch (err) {
      setError(err?.message || 'Check-in failed');
    } finally {
      setBusyId(null);
    }
  }

  function isCheckedIn(shift) {
    return (shift.assignedEmployees || []).some((emp) => emp.checkInAt);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My shifts"
        description="Your assigned shifts — view the schedule and check in."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">Loading shifts…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">No published shifts assigned to you.</p>
        ) : (
          <ul className="divide-y divide-[var(--admin-border)]">
            {rows.map((shift) => {
              const meta = STATUS_META[shift.status] || STATUS_META.DRAFT;
              const checkedIn = isCheckedIn(shift);
              return (
                <li key={shift.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                  <div>
                    <p className="font-semibold text-[var(--admin-text)]">
                      {formatDateTime(shift.startTime)} → {formatDateTime(shift.endTime)}
                    </p>
                    <p className="text-xs text-[var(--admin-muted)]">
                      Opening cash: {(shift.openingCash ?? 0).toLocaleString('en-US')} VND
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {checkedIn && <Badge tone="brand">Checked in</Badge>}
                    </div>
                  </div>
                  <Button
                    disabled={checkedIn || busyId === shift.id || shift.status !== 'PUBLISHED'}
                    onClick={() => handleCheckIn(shift)}
                  >
                    {checkedIn ? 'Checked in' : busyId === shift.id ? 'Checking in…' : 'Check in'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
