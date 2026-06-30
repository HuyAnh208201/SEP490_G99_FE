import { branchManagerApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import StatCard from '../../components/ui/StatCard.jsx';

export default function BranchManagerDashboardPage() {
  const { data, loading, error } = useModuleData(branchManagerApi.dashboard, []);
  return (
    <ModulePageShell
      title="Vận hành chi nhánh"
      description="Tổng quan doanh thu, ca làm, nhân sự và yêu cầu nhập hàng tại chi nhánh."
      loading={loading}
      error={error}
      moduleData={data}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Doanh thu hôm nay" value="—" icon="cash" />
        <StatCard label="Ca đang mở" value="—" icon="clock" />
        <StatCard label="Nhân viên ca" value="—" icon="staff" />
        <StatCard label="YC nhập chờ" value="—" icon="request" />
      </div>
    </ModulePageShell>
  );
}

export function BranchStaffPage() {
  const { data, loading, error } = useModuleData(branchManagerApi.staff, []);
  return (
    <ModulePageShell
      title="Nhân viên chi nhánh"
      description="Xem hồ sơ và phân công nhân viên thu ngân / kho tại chi nhánh."
      loading={loading}
      error={error}
      moduleData={data}
    />
  );
}

export function BranchShiftsPage() {
  const { data, loading, error } = useModuleData(branchManagerApi.shifts, []);
  return (
    <ModulePageShell
      title="Ca làm việc"
      description="Tạo ca, gán nhân viên, nhập số dư tiền mặt đầu ca — theo UC Shift Management."
      loading={loading}
      error={error}
      moduleData={data}
    />
  );
}

export function BranchImportRequestsPage() {
  const { data, loading, error } = useModuleData(branchManagerApi.importRequests, []);
  return (
    <ModulePageShell
      title="Yêu cầu nhập hàng"
      description="BM tạo purchase request gửi kho trung tâm / Admin duyệt."
      loading={loading}
      error={error}
      moduleData={data}
    />
  );
}

export function CashDiscrepancyPage() {
  const { data, loading, error } = useModuleData(
    () => Promise.resolve({ module: 'branch-manager', screen: 'cash-discrepancy', status: 'placeholder' }),
    [],
  );
  return (
    <ModulePageShell
      title="Đối soát tiền mặt"
      description="BM phê duyệt chênh lệch Expected vs Actual khi đóng ca."
      loading={loading}
      error={error}
      moduleData={data}
    />
  );
}
