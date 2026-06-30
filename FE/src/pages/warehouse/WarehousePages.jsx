import { warehouseApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import StatCard from '../../components/ui/StatCard.jsx';

export default function WarehouseDashboardPage() {
  const { data, loading, error } = useModuleData(warehouseApi.dashboard, []);

  return (
    <ModulePageShell
      title="Central warehouse"
      description="Monitor central inventory, branch import requests, and dispatch orders."
      loading={loading}
      error={error}
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
      description="View and manage central warehouse stock before dispatching to branches."
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
      title="Import requests (warehouse)"
      description="Aggregate and process import requests from branches."
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
      title="Dispatch orders"
      description="Create and track dispatch orders from central warehouse to branches."
      loading={loading}
      error={error}
      moduleData={data}
    />
  );
}
