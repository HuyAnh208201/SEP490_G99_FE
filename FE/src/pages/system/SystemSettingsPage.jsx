import { systemApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import Card from '../../components/ui/Card.jsx';

export default function SystemSettingsPage() {
  const { data, loading, error } = useModuleData(systemApi.settings, []);

  return (
    <ModulePageShell
      title="Cấu hình hệ thống"
      description="Master data, quy tắc tích điểm, cấu hình chung cho chuỗi cửa hàng."
      loading={loading}
      error={error}
      moduleData={data}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Loyalty rules</h3>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Công thức quy đổi điểm (VD: 10.000đ = 1 điểm) và mốc hạng thành viên.
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold">Audit & monitoring</h3>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Theo dõi trạng thái hệ thống và nhật ký thao tác quan trọng.
          </p>
        </Card>
      </div>
    </ModulePageShell>
  );
}
