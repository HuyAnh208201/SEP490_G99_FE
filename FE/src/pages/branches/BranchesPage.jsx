import { branchApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import Card from '../../components/ui/Card.jsx';

export default function BranchesPage() {
  const { data, loading, error } = useModuleData(branchApi.list, []);

  return (
    <ModulePageShell
      title="Danh sách chi nhánh"
      description="Quản lý chi nhánh trong chuỗi — thêm, sửa, tạm ngưng. API CRUD sẽ được bổ sung theo tracking sprint."
      loading={loading}
      error={error}
      moduleData={data}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-[var(--admin-text)]">Thông tin chi nhánh</h3>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Tên, địa chỉ, SĐT, giờ mở cửa, quản lý được gán.
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold text-[var(--admin-text)]">Đồng bộ trạng thái</h3>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Hệ thống đồng bộ trạng thái active/inactive cho toàn chuỗi.
          </p>
        </Card>
      </div>
    </ModulePageShell>
  );
}
