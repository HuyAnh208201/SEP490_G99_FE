import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMe } from '../../api/users.js';
import {
  assignEmployees,
  createShift,
  deleteShift,
  fetchAvailableEmployees,
  fetchShifts,
  publishShift,
} from '../../api/shifts.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import MoneyInput from '../../components/ui/MoneyInput.jsx';
import { formatDateTime } from '../../lib/datetime.js';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

const STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'default' },
  PUBLISHED: { label: 'Published', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

function toIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toDateParam(iso) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toTimeParam(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

const emptyForm = () => ({
  startTime: '',
  endTime: '',
  openingCash: 0,
  expectedCash: 0,
});

export default function ShiftsPage() {
  const [branchId, setBranchId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [assignShift, setAssignShift] = useState(null);
  const [assignRole, setAssignRole] = useState('CASHIER');
  const [available, setAvailable] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchShifts(branchId);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load shifts');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchMe()
      .then((me) => {
        if (me?.branchId) setBranchId(me.branchId);
      })
      .catch(() => setError('Could not load branch context'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
    [rows],
  );

  async function runAction(label, fn) {
    setBusy(label);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err?.message || 'Action failed');
    } finally {
      setBusy('');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!branchId) return;
    await runAction('create', () =>
      createShift({
        branchId,
        startTime: toIso(form.startTime),
        endTime: toIso(form.endTime),
        openingCash: form.openingCash ?? 0,
        expectedCash: form.expectedCash ?? 0,
      }),
    );
    setFormOpen(false);
    setForm(emptyForm());
  }

  async function openAssign(shift) {
    setAssignShift(shift);
    setSelectedIds([]);
    setAssignRole('CASHIER');
    setAvailable([]);
    setError('');
  }

  useEffect(() => {
    if (!assignShift || !branchId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAvailableEmployees({
          branchId,
          date: toDateParam(assignShift.startTime),
          startTime: toTimeParam(assignShift.startTime),
          endTime: toTimeParam(assignShift.endTime),
          requiredRole: assignRole,
        });
        if (!cancelled) setAvailable(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load available staff');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignShift, assignRole, branchId]);

  async function handleAssign() {
    if (!assignShift || selectedIds.length === 0) return;
    await runAction('assign', () => assignEmployees(assignShift.id, selectedIds, assignRole));
    setAssignShift(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
            Branch operations
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--admin-text)]">Shifts</h1>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Create shifts, assign staff, and set opening cash for your branch.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} disabled={!branchId}>
          + Create shift
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3 text-right">Opening cash</th>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : sortedRows.map((shift) => {
                    const meta = STATUS_META[shift.status] || { label: shift.status, tone: 'default' };
                    return (
                      <tr key={shift.id} className="border-t border-[var(--admin-border)]">
                        <td className="px-4 py-3">{formatDateTime(shift.startTime)}</td>
                        <td className="px-4 py-3">{formatDateTime(shift.endTime)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {Number(shift.openingCash || 0).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {shift.assignedEmployees?.length
                            ? shift.assignedEmployees.map((e) => e.fullName).join(', ')
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {shift.status === 'DRAFT' && (
                              <>
                                <Button
                                  variant="secondary"
                                  className="!px-3 !py-1 !text-xs"
                                  onClick={() => openAssign(shift)}
                                >
                                  Assign
                                </Button>
                                <Button
                                  className="!px-3 !py-1 !text-xs"
                                  loading={busy === `publish-${shift.id}`}
                                  onClick={() =>
                                    runAction(`publish-${shift.id}`, () => publishShift(shift.id))
                                  }
                                >
                                  Publish
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="!px-3 !py-1 !text-xs !text-red-600"
                                  loading={busy === `delete-${shift.id}`}
                                  onClick={() => {
                                    if (!window.confirm('Delete this draft shift?')) return;
                                    runAction(`delete-${shift.id}`, () => deleteShift(shift.id));
                                  }}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && sortedRows.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-[var(--admin-muted)]">No shifts yet.</p>
          )}
        </div>
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Create shift" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[var(--admin-text)]">Start time</span>
            <input
              type="datetime-local"
              required
              value={form.startTime}
              onChange={(e) => setForm((s) => ({ ...s, startTime: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[var(--admin-text)]">End time</span>
            <input
              type="datetime-local"
              required
              value={form.endTime}
              onChange={(e) => setForm((s) => ({ ...s, endTime: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[var(--admin-text)]">Opening cash (VND)</span>
            <MoneyInput
              value={form.openingCash}
              onChange={(v) => setForm((s) => ({ ...s, openingCash: v ?? 0 }))}
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy === 'create'}>
              Save draft
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(assignShift)}
        onClose={() => setAssignShift(null)}
        title="Assign staff"
        size="md"
      >
        {assignShift && (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Role</span>
              <select
                value={assignRole}
                onChange={(e) => {
                  setAssignRole(e.target.value);
                  setSelectedIds([]);
                }}
                className={inputClass}
              >
                <option value="CASHIER">Cashier</option>
                <option value="INVENTORY_STAFF">Inventory staff</option>
              </select>
            </label>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-[var(--admin-border)] p-3">
              {available.length === 0 ? (
                <p className="text-sm text-[var(--admin-muted)]">No available staff for this slot.</p>
              ) : (
                available.map((emp) => (
                  <label key={emp.employeeId} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(emp.employeeId)}
                      onChange={(e) => {
                        setSelectedIds((ids) =>
                          e.target.checked
                            ? [...ids, emp.employeeId]
                            : ids.filter((id) => id !== emp.employeeId),
                        );
                      }}
                    />
                    <span className="font-medium">{emp.fullName}</span>
                    <span className="text-[var(--admin-subtle)]">{emp.email}</span>
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
              <Button variant="secondary" onClick={() => setAssignShift(null)}>
                Cancel
              </Button>
              <Button loading={busy === 'assign'} disabled={selectedIds.length === 0} onClick={handleAssign}>
                Assign selected
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
