import { useEffect, useState } from 'react';
import { fetchMe } from '../../api/users.js';
import { listRequests } from '../../api/purchaseRequests.js';
import { fetchShifts } from '../../api/shifts.js';
import { fetchBranchInventory } from '../../api/inventory.js';
import Card from '../../components/ui/Card.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import { PR_STATUS, normalizeStatus } from '../../constants/purchaseRequests.js';

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

export function CashDiscrepancyPage() {
  return (
    <ModulePageShell
      title="Cash reconciliation"
      description="Approve expected vs actual cash at shift close. Defer sprint W30."
      loading={false}
      error=""
      comingSoon
      moduleData={{ status: 'placeholder' }}
    />
  );
}
