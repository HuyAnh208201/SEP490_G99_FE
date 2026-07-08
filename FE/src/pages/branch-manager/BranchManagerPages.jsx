import { branchManagerApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import StatCard from '../../components/ui/StatCard.jsx';

export default function BranchManagerDashboardPage() {
  const { data, loading, error } = useModuleData(branchManagerApi.dashboard, []);
  return (
    <ModulePageShell
      title="Branch operations"
      description="Revenue, shifts, staff, and import requests at your branch."
      loading={loading}
      error={error}
      comingSoon
      moduleData={data}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today revenue" value="—" icon="cash" />
        <StatCard label="Open shifts" value="—" icon="clock" />
        <StatCard label="Staff on shift" value="—" icon="staff" />
        <StatCard label="Pending imports" value="—" icon="request" />
      </div>
    </ModulePageShell>
  );
}

export function CashDiscrepancyPage() {
  const { data, loading, error } = useModuleData(
    () => Promise.resolve({ module: 'branch-manager', screen: 'cash-discrepancy', status: 'placeholder' }),
    [],
  );
  return (
    <ModulePageShell
      title="Cash reconciliation"
      description="Approve expected vs actual cash at shift close. Planned: variance list + approve (SRS 2.6.14)."
      loading={loading}
      error={error}
      comingSoon
      moduleData={data}
    />
  );
}
