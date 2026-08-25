import { Navigate, Route, Routes, Outlet } from 'react-router-dom';
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
import WarehouseInventoryPage from './pages/warehouse/WarehouseInventoryPage.jsx';
import IncomingRequestsPage from './pages/warehouse/IncomingRequestsPage.jsx';
import DispatchPlanningPage from './pages/warehouse/DispatchPlanningPage.jsx';
import DispatchOrdersPage from './pages/warehouse/DispatchOrdersPage.jsx';
import PurchaseOrdersPage from './pages/warehouse/PurchaseOrdersPage.jsx';
import OrderTrackingPage from './pages/inventory-staff/OrderTrackingPage.jsx';
import ReceiveShipmentPage from './pages/inventory-staff/ReceiveShipmentPage.jsx';
import ReceivingHistoryPage from './pages/inventory-staff/ReceivingHistoryPage.jsx';
import InventoryCountPage from './pages/inventory-staff/InventoryCountPage.jsx';
import PurchaseRequestsPage from './pages/purchase-requests/PurchaseRequestsPage.jsx';
import PurchaseRequestFormPage from './pages/purchase-requests/PurchaseRequestFormPage.jsx';
import ConsolidatedPage from './pages/purchase-requests/ConsolidatedPage.jsx';
import SupplyImportLayout from './pages/purchase-requests/SupplyImportLayout.jsx';
import CashReconciliationReviewPage from './pages/branch-manager/CashReconciliationReviewPage.jsx';
import BranchAuditPage from './pages/branch-manager/BranchAuditPage.jsx';
import MyShiftsPage from './pages/branch-manager/MyShiftsPage.jsx';
import ShiftsPage from './pages/branch-manager/ShiftsPage.jsx';
import ReportsPage from './pages/reports/ReportsPage.jsx';
import PosLayout from './pages/pos/PosLayout.jsx';
import PosNewOrderPage from './pages/pos/PosNewOrderPage.jsx';
import OrderHistoryPage from './pages/pos/OrderHistoryPage.jsx';
import InventoryPage from './pages/pos/InventoryPage.jsx';
import SettingsPage from './pages/pos/SettingsPage.jsx';
import CashPaymentPage from './pages/pos/CashPaymentPage.jsx';
import PayOSPaymentPage from './pages/pos/PayOSPaymentPage.jsx';
import PosPaymentPage from './pages/pos/PosPaymentPage.jsx';
import CustomerDisplayPage from './pages/pos/CustomerDisplayPage.jsx';
import ShiftOpeningPage from './pages/shift/ShiftOpeningPage.jsx';
import ShiftClosingPage from './pages/shift/ShiftClosingPage.jsx';
import ShiftHistoryPage from './pages/shift/ShiftHistoryPage.jsx';
import ShiftHomePage from './pages/shift/ShiftHomePage.jsx';
import ShiftCurrentPage from './pages/shift/ShiftCurrentPage.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute, { PermissionRoute } from './routes/ProtectedRoute.jsx';
import PosRoute from './routes/PosRoute.jsx';
import RequireOpenShift from './routes/RequireOpenShift.jsx';
import { SaveConfirmationProvider } from './contexts/SaveConfirmationContext.jsx';

function AppShell() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}

function PosShell() {
  return (
    <ProtectedRoute>
      <PosRoute>
        <Outlet />
      </PosRoute>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <SaveConfirmationProvider>
      <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<PosShell />}>
        <Route path="/pos/customer-display" element={<CustomerDisplayPage />} />
        <Route element={<PosLayout />}>
          <Route path="/pos/shift" element={<ShiftHomePage />} />
          <Route path="/pos/shift/opening" element={<ShiftOpeningPage />} />
          <Route path="/pos/shift/current" element={<ShiftCurrentPage />} />
          <Route path="/pos/shift/closing" element={<ShiftClosingPage />} />
          <Route path="/pos/shift/history" element={<ShiftHistoryPage />} />
          <Route path="/pos/my-shifts" element={<MyShiftsPage />} />
          <Route path="/pos/settings" element={<SettingsPage />} />
          <Route element={<RequireOpenShift />}>
            <Route path="/pos" element={<PosNewOrderPage />} />
            <Route path="/pos/history" element={<OrderHistoryPage />} />
            <Route path="/pos/inventory" element={<InventoryPage />} />
            <Route path="/pos/payment" element={<PosPaymentPage />} />
            <Route path="/pos/payment/cash" element={<CashPaymentPage />} />
            <Route path="/pos/payment/payos" element={<PayOSPaymentPage />} />
          </Route>
        </Route>
      </Route>

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
          <Route path="new" element={<PurchaseRequestFormPage />} />
          <Route path=":id/edit" element={<PurchaseRequestFormPage />} />
          <Route
            path="consolidated"
            element={
              <PermissionRoute anyOf={['APPROVE_IMPORT_REQUEST', 'MANAGE_BRANCH_IMPORT_REQUESTS']}>
                <ConsolidatedPage />
              </PermissionRoute>
            }
          />
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
            <PermissionRoute
              anyOf={['PRODUCT_MANAGEMENT', 'PRODUCT_VIEW']}
              roles={['INVENTORY_STAFF']}
            >
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
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/warehouse/inventory"
          element={<Navigate to="/catalog/products" replace />}
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
            <PermissionRoute anyOf={['CHOOSE_EXTERNAL_SUPPLIER', 'VIEW_SUPPLIER_RECEIPTS_PRICES']}>
              <PurchaseOrdersPage />
            </PermissionRoute>
          }
        />

        <Route
          path="/inventory/order-tracking"
          element={
            <PermissionRoute permission="RECEIVE_SHIPMENT">
              <OrderTrackingPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/inventory/receive/:dispatchOrderId/:requestId"
          element={
            <PermissionRoute permission="RECEIVE_SHIPMENT">
              <ReceiveShipmentPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/inventory/receiving-history"
          element={
            <PermissionRoute permission="RECEIVE_SHIPMENT">
              <ReceivingHistoryPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/inventory/count"
          element={<Navigate to="/catalog/products?count=1" replace />}
        />
        <Route
          path="/inventory/count-history"
          element={<Navigate to="/branch-manager/audit?tab=inventory-counts" replace />}
        />

        <Route path="/branch-manager" element={<Navigate to="/reports" replace />} />
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
          path="/my-shifts"
          element={
            <PermissionRoute permission="MY_SHIFTS">
              <MyShiftsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/branch-manager/audit"
          element={
            <PermissionRoute permission="APPROVE_CASH_DISCREPANCY">
              <BranchAuditPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/branch-manager/cash-reconciliation"
          element={<Navigate to="/branch-manager/audit?tab=discrepancies" replace />}
        />
        <Route
          path="/branch-manager/cash-reconciliation/:sessionId"
          element={
            <PermissionRoute permission="APPROVE_CASH_DISCREPANCY">
              <CashReconciliationReviewPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/branch-manager/cash-discrepancy"
          element={<Navigate to="/branch-manager/audit?tab=discrepancies" replace />}
        />
        <Route
          path="/branch-manager/supply-receipts"
          element={<Navigate to="/inventory/receiving-history" replace />}
        />

        <Route path="/director" element={<Navigate to="/reports" replace />} />
        <Route path="/director/reports" element={<Navigate to="/reports" replace />} />
        <Route path="/director/planning" element={<Navigate to="/reports" replace />} />

        <Route
          path="/reports"
          element={
            <PermissionRoute anyOf={['REPORTS_VIEW', 'BUSINESS_PERFORMANCE_REPORTS']}>
              <ReportsPage />
            </PermissionRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </SaveConfirmationProvider>
  );
}
