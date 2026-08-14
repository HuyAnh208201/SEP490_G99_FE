import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import { normalizeWebRole } from '../../constants/userRoles.js';
import Card from '../../components/ui/Card.jsx';
import DirectorDashboard from './DirectorDashboard.jsx';
import BranchManagerDashboard from './BranchManagerDashboard.jsx';
import WarehouseDashboard from './WarehouseDashboard.jsx';

export default function DashboardPage() {
  const { role, has } = usePermissions();
  const webRole = normalizeWebRole(role);

  if (webRole === 'CASHIER') {
    return <Navigate to="/pos" replace />;
  }

  if (webRole === 'INVENTORY_STAFF') {
    return <Navigate to="/catalog/products" replace />;
  }

  if (webRole === 'ADMIN') {
    return <Navigate to="/users" replace />;
  }
  if (webRole === 'DIRECTOR' && has('DIRECTOR_DASHBOARD')) {
    return <DirectorDashboard />;
  }
  if (webRole === 'BRANCH_MANAGER' && has('BRANCH_DASHBOARD')) {
    return <BranchManagerDashboard />;
  }
  if (webRole === 'WAREHOUSE_MANAGER' && has('WAREHOUSE_DASHBOARD')) {
    return <WarehouseDashboard />;
  }

  return (
    <div className="w-full">
      <Card>
        <p className="text-sm text-[var(--admin-muted)]">
          This role does not have a dedicated web dashboard. Use the POS or catalog screens for
          Cashier / Inventory staff roles.
        </p>
      </Card>
    </div>
  );
}
