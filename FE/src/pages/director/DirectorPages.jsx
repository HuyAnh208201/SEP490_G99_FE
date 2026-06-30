import { directorApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import StatCard from '../../components/ui/StatCard.jsx';

export default function DirectorDashboardPage() {
  const { data, loading, error } = useModuleData(directorApi.dashboard, []);
  return (
    <ModulePageShell
      title="Ban điều hành"
      description="Giám sát hiệu suất kinh doanh toàn chuỗi và ra quyết định chiến lược."
      loading={loading}
      error={error}
      moduleData={data}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Doanh thu chuỗi" value="—" icon="chart" />
        <StatCard label="Chi nhánh top" value="—" icon="store" />
        <StatCard label="Chiến dịch KM" value="—" icon="tag" />
        <StatCard label="Dự báo AI" value="—" icon="plan" hint="Demand forecast" />
      </div>
    </ModulePageShell>
  );
}

export function DirectorReportsPage() {
  const { data, loading, error } = useModuleData(directorApi.performance, []);
  return (
    <ModulePageShell
      title="Báo cáo hiệu suất"
      description="Doanh thu, đơn hàng, sản phẩm bán chạy và hiệu quả khuyến mãi theo chi nhánh."
      loading={loading}
      error={error}
      moduleData={data}
    />
  );
}

export function DirectorPlanningPage() {
  const { data, loading, error } = useModuleData(directorApi.planning, []);
  return (
    <ModulePageShell
      title="Kế hoạch chiến lược"
      description="Tổng quan kế hoạch nhập hàng và mở rộng chi nhánh."
      loading={loading}
      error={error}
      moduleData={data}
    />
  );
}
