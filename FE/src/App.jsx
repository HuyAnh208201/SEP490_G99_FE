import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/login/LoginPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import UsersPage from './pages/users/UsersPage.jsx';
import ProfilePage from './pages/profile/ProfilePage.jsx';
import BranchesPage from './pages/branches/BranchesPage.jsx';
import PromotionsPage from './pages/promotions/PromotionsPage.jsx';
import SystemSettingsPage from './pages/system/SystemSettingsPage.jsx';
import CategoriesPage from './pages/catalog/CategoriesPage.jsx';
import ProductsPage from './pages/catalog/ProductsPage.jsx';
import SuppliersPage from './pages/catalog/SuppliersPage.jsx';
import WarehouseDashboardPage from './pages/warehouse/WarehousePages.jsx';
import WarehouseInventoryPage from './pages/warehouse/WarehouseInventoryPage.jsx';
import IncomingRequestsPage from './pages/warehouse/IncomingRequestsPage.jsx';
import DispatchPlanningPage from './pages/warehouse/DispatchPlanningPage.jsx';
import DispatchOrdersPage from './pages/warehouse/DispatchOrdersPage.jsx';
import PurchaseOrdersPage from './pages/warehouse/PurchaseOrdersPage.jsx';
import PurchaseRequestsPage from './pages/purchase-requests/PurchaseRequestsPage.jsx';
import ConsolidatedPage from './pages/purchase-requests/ConsolidatedPage.jsx';
import SupplyImportLayout from './pages/purchase-requests/SupplyImportLayout.jsx';
import BranchManagerDashboardPage, {
  CashDiscrepancyPage,
} from './pages/branch-manager/BranchManagerPages.jsx';
import BranchReceivePage from './pages/branch-manager/BranchReceivePage.jsx';
import MyShiftsPage from './pages/branch-manager/MyShiftsPage.jsx';
import ShiftsPage from './pages/branch-manager/ShiftsPage.jsx';
import DirectorDashboardPage, {
  DirectorPlanningPage,
  DirectorReportsPage,
} from './pages/director/DirectorPages.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute, { PermissionRoute } from './routes/ProtectedRoute.jsx';

function AppShell() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/purchase-requests"
          element={
            <PermissionRoute
              anyOf={[
                'CREATE_IMPORT_REQUEST',
                'APPROVE_IMPORT_REQUEST',
                'MANAGE_BRANCH_IMPORT_REQUESTS',
                'SUPPLY_IMPORT_RECEIPT_APPROVE',
              ]}
            >
              <SupplyImportLayout />
            </PermissionRoute>
          }
        >
          <Route index element={<PurchaseRequestsPage />} />
          <Route path="consolidated" element={<ConsolidatedPage />} />
        </Route>
        <Route path="/change-password" element={<Navigate to="/profile?tab=security" replace />} />

        <Route
          path="/users"
          element={
            <PermissionRoute anyOf={['USER_MANAGEMENT_LIST', 'MANAGE_BRANCH_STAFF_INFO']}>
              <UsersPage />
            </PermissionRoute>
          }
        />
        <Route path="/users/create" element={<Navigate to="/users" replace />} />
        <Route
          path="/branches"
          element={
            <PermissionRoute
              anyOf={[
                'BRANCH_LIST_ADMIN',
                'BRANCH_LIST_DIRECTOR',
                'MANAGE_BRANCH_INFORMATION',
              ]}
            >
              <BranchesPage />
            </PermissionRoute>
          }
        />

        <Route
          path="/promotions"
          element={
            <PermissionRoute
              anyOf={['PROMOTION_LIST', 'PROMOTION_DETAILS', 'BRANCH_REVENUE_PROMOS']}
            >
              <PromotionsPage />
            </PermissionRoute>
          }
        />

        <Route
          path="/system/settings"
          element={
            <PermissionRoute permission="SYSTEM_SETTINGS_MASTER_DATA">
              <SystemSettingsPage />
            </PermissionRoute>
          }
        />

        <Route
          path="/catalog/categories"
          element={
            <PermissionRoute permission="CATEGORY_MANAGEMENT">
              <CategoriesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/catalog/products"
          element={
            <PermissionRoute anyOf={['PRODUCT_MANAGEMENT']}>
              <ProductsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/catalog/suppliers"
          element={
            <PermissionRoute anyOf={['SUPPLIER_MANAGEMENT', 'CHOOSE_EXTERNAL_SUPPLIER']}>
              <SuppliersPage />
            </PermissionRoute>
          }
        />

        <Route
          path="/warehouse"
          element={
            <PermissionRoute permission="WAREHOUSE_DASHBOARD">
              <WarehouseDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/warehouse/inventory"
          element={
            <PermissionRoute permission="VIEW_CENTRAL_INVENTORY">
              <WarehouseInventoryPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/warehouse/incoming-requests"
          element={
            <PermissionRoute anyOf={['MANAGE_BRANCH_IMPORT_REQUESTS', 'APPROVE_IMPORT_REQUEST']}>
              <IncomingRequestsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/warehouse/import-requests"
          element={<Navigate to="/warehouse/incoming-requests" replace />}
        />
        <Route
          path="/warehouse/dispatch-planning"
          element={
            <PermissionRoute permission="MANAGE_DISPATCH_ORDERS">
              <DispatchPlanningPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/warehouse/dispatch"
          element={
            <PermissionRoute permission="MANAGE_DISPATCH_ORDERS">
              <DispatchOrdersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/warehouse/purchase-orders"
          element={
            <PermissionRoute permission="CHOOSE_EXTERNAL_SUPPLIER">
              <PurchaseOrdersPage />
            </PermissionRoute>
          }
        />

        <Route
          path="/branch-manager"
          element={
            <PermissionRoute permission="BRANCH_DASHBOARD">
              <BranchManagerDashboardPage />
            </PermissionRoute>
          }
        />
        <Route path="/branch-manager/staff" element={<Navigate to="/users" replace />} />
        <Route
          path="/branch-manager/shifts"
          element={
            <PermissionRoute permission="SHIFT_MANAGEMENT">
              <ShiftsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/branch-manager/import-requests"
          element={<Navigate to="/purchase-requests" replace />}
        />
        <Route
          path="/branch-manager/receive"
          element={
            <PermissionRoute permission="SUPPLY_IMPORT_RECEIPT_APPROVE">
              <BranchReceivePage />
            </PermissionRoute>
          }
        />
        <Route
          path="/my-shifts"
          element={
            <PermissionRoute permission="MY_SHIFTS">
              <MyShiftsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/branch-manager/cash-discrepancy"
          element={
            <PermissionRoute permission="APPROVE_CASH_DISCREPANCY">
              <CashDiscrepancyPage />
            </PermissionRoute>
          }
        />

        <Route
          path="/director"
          element={
            <PermissionRoute permission="DIRECTOR_DASHBOARD">
              <DirectorDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/director/reports"
          element={
            <PermissionRoute permission="BUSINESS_PERFORMANCE_REPORTS">
              <DirectorReportsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/director/planning"
          element={
            <PermissionRoute permission="STRATEGIC_PLANNING_OVERVIEW">
              <DirectorPlanningPage />
            </PermissionRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
