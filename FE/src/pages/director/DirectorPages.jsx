import { directorApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import StatCard from '../../components/ui/StatCard.jsx';

export default function DirectorDashboardPage() {
  const { data, loading, error } = useModuleData(directorApi.dashboard, []);
  return (
    <ModulePageShell
      title="Executive overview"
      description="Monitor chain-wide business performance and strategic decisions."
      loading={loading}
      error={error}
      comingSoon
      moduleData={data}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Chain revenue" value="—" icon="chart" />
        <StatCard label="Top branches" value="—" icon="store" />
        <StatCard label="Promo campaigns" value="—" icon="tag" />
        <StatCard label="AI forecast" value="—" icon="plan" hint="Demand forecast" />
      </div>
    </ModulePageShell>
  );
}

export function DirectorReportsPage() {
  const { data, loading, error } = useModuleData(directorApi.performance, []);
  return (
    <ModulePageShell
      title="Performance reports"
      description="Revenue, orders, top products by branch. Planned: charts + export (SRS 2.7.2 Business Analytics)."
      loading={loading}
      error={error}
      comingSoon
      moduleData={data}
    />
  );
}

export function DirectorPlanningPage() {
  const { data, loading, error } = useModuleData(directorApi.planning, []);
  return (
    <ModulePageShell
      title="Strategic planning"
      description="Overview of import planning and branch expansion."
      loading={loading}
      error={error}
      comingSoon
      moduleData={data}
    />
  );
}
