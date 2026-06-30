import { warehouseApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import StatCard from '../../components/ui/StatCard.jsx';

export default function WarehouseDashboardPage() {
  const { data, loading, error } = useModuleData(warehouseApi.dashboard, []);

  return (
    <ModulePageShell
      title="Kho trung tâm"
      description="Giám sát tồn kho tổng, yêu cầu nhập từ chi nhánh và phiếu xuất điều phối."
      loading={loading}
      error={error}
      moduleData={data}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="SKU trong kho" value="—" icon="boxes" hint="Central inventory" />
        <StatCard label="Yêu cầu chờ" value="—" icon="inbox" hint="Import requests" />
        <StatCard label="Đang vận chuyển" value="—" icon="dispatch" hint="Dispatch orders" />
        <StatCard label="NCC active" value="—" icon="truck" hint="Suppliers" />
      </div>
    </ModulePageShell>
  );
}

export function WarehouseInventoryPage() {
  const { data, loading, error } = useModuleData(warehouseApi.inventory, []);
  return (
    <ModulePageShell
      title="Tồn kho trung tâm"
      description="Xem và quản lý tồn kho kho chính trước khi điều phối về chi nhánh."
      loading={loading}
      error={error}
      moduleData={data}
    />
  );
}

export function WarehouseImportRequestsPage() {
  const { data, loading, error } = useModuleData(warehouseApi.importRequests, []);
  return (
    <ModulePageShell
      title="Yêu cầu nhập hàng (Kho)"
      description="Tổng hợp và xử lý yêu cầu nhập từ các chi nhánh."
      loading={loading}
      error={error}
      moduleData={data}
    />
  );
}

export function WarehouseDispatchPage() {
  const { data, loading, error } = useModuleData(warehouseApi.dispatchOrders, []);
  return (
    <ModulePageShell
      title="Phiếu xuất kho"
      description="Tạo và theo dõi dispatch order từ kho trung tâm đến chi nhánh."
      loading={loading}
      error={error}
      moduleData={data}
    />
  );
}
