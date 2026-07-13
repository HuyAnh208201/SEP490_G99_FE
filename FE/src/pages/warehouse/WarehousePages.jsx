import { warehouseApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import StatCard from '../../components/ui/StatCard.jsx';

export default function WarehouseDashboardPage() {
  const { data, loading, error } = useModuleData(warehouseApi.dashboard, []);

  return (
    <ModulePageShell
      title="Central warehouse"
      description="Monitor central inventory, branch import requests, and dispatch orders. SRS: Import Process 1.2.3, Inventory 1.2.4."
      loading={loading}
      error={error}
      comingSoon
      moduleData={data}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="SKUs in stock" value="—" icon="boxes" hint="Central inventory" />
        <StatCard label="Pending requests" value="—" icon="inbox" hint="Import requests" />
        <StatCard label="In transit" value="—" icon="dispatch" hint="Dispatch orders" />
        <StatCard label="Active suppliers" value="—" icon="truck" hint="Suppliers" />
      </div>
    </ModulePageShell>
  );
}

export function WarehouseInventoryPage() {
  const { data, loading, error } = useModuleData(warehouseApi.inventory, []);
  return (
    <ModulePageShell
      title="Central inventory"
      description="Legacy stub — use /warehouse/inventory route for live data."
      loading={loading}
      error={error}
      comingSoon
      moduleData={data}
    />
  );
}

export function WarehouseImportRequestsPage() {
  const { data, loading, error } = useModuleData(warehouseApi.importRequests, []);
  return (
    <ModulePageShell
      title="Import requests (warehouse)"
      description="Compile branch import requests. Planned: queue, approve/reject, status workflow (SRS 2.3.1)."
      loading={loading}
      error={error}
      comingSoon
      moduleData={data}
    />
  );
}

export function WarehouseDispatchPage() {
  const { data, loading, error } = useModuleData(warehouseApi.dispatchOrders, []);
  return (
    <ModulePageShell
      title="Dispatch orders"
      description="Create and track dispatch to branches. Planned: create order, status updates (SRS 2.3.4–2.3.6)."
      loading={loading}
      error={error}
      comingSoon
      moduleData={data}
    />
  );
}
