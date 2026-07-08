import { NavLink, Outlet } from 'react-router-dom';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import { canViewConsolidatedImports } from '../../constants/purchaseRequests.js';

const tabClass = ({ isActive }) =>
  [
    'rounded-lg px-4 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-[#0058be]/10 text-[var(--admin-brand)]'
      : 'text-[var(--admin-muted)] hover:bg-[#f0f4f8] hover:text-[var(--admin-text)]',
  ].join(' ');

export default function SupplyImportLayout() {
  const { has } = usePermissions();
  const showConsolidated = canViewConsolidatedImports(has);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
            Warehouse & imports
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--admin-text)]">
            Supply import requests
          </h1>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Create, approve, and receive branch stock requests — one flow for the whole chain.
          </p>
        </div>
        <nav className="flex flex-wrap gap-1 rounded-xl border border-[var(--admin-border)] bg-white p-1">
          <NavLink to="/purchase-requests" end className={tabClass}>
            Requests
          </NavLink>
          {showConsolidated && (
            <NavLink to="/purchase-requests/consolidated" className={tabClass}>
              Consolidated view
            </NavLink>
          )}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
