/**
 * Sidebar menu — each item maps to a BE permission code (WebPermission).
 * `anyPermission: true` → visible if user has at least one listed permission.
 *
 * Role abbreviations: BM = Branch Manager, IS = Inventory Staff, WM = Warehouse Manager.
 */
import { ROLE_LABELS } from '../constants/userRoles.js';

export { ROLE_LABELS };

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      {
        path: '/dashboard',
        label: 'Dashboard',
        icon: 'dashboard',
        anyPermission: true,
        permissions: [
          'ADMIN_DASHBOARD',
          'DIRECTOR_DASHBOARD',
          'BRANCH_DASHBOARD',
          'WAREHOUSE_DASHBOARD',
        ],
      },
    ],
  },
  {
    label: 'Chain administration',
    items: [
      {
        path: '/users',
        label: 'Team & accounts',
        icon: 'users',
        anyPermission: true,
        permissions: ['USER_MANAGEMENT_LIST', 'MANAGE_BRANCH_STAFF_INFO'],
      },
      {
        path: '/branches',
        label: 'Branches',
        icon: 'store',
        anyPermission: true,
        permissions: [
          'BRANCH_LIST_ADMIN',
          'BRANCH_LIST_DIRECTOR',
          'MANAGE_BRANCH_INFORMATION',
        ],
      },
      {
        path: '/promotions',
        label: 'Promotions',
        icon: 'tag',
        anyPermission: true,
        permissions: ['PROMOTION_LIST', 'PROMOTION_DETAILS', 'BRANCH_REVENUE_PROMOS'],
      },
      {
        path: '/system/settings',
        label: 'System settings',
        icon: 'settings',
        permissions: ['SYSTEM_SETTINGS_MASTER_DATA'],
      },
    ],
  },
  {
    label: 'Catalog & suppliers',
    items: [
      {
        path: '/catalog/categories',
        label: 'Product categories',
        icon: 'folder',
        permissions: ['CATEGORY_MANAGEMENT'],
      },
      {
        path: '/catalog/products',
        label: 'Products',
        icon: 'package',
        anyPermission: true,
        permissions: ['PRODUCT_MANAGEMENT', 'PRODUCT_VIEW'],
        alsoRoles: ['INVENTORY_STAFF'],
      },
      {
        path: '/catalog/suppliers',
        label: 'Suppliers',
        icon: 'truck',
        anyPermission: true,
        permissions: ['SUPPLIER_MANAGEMENT', 'CHOOSE_EXTERNAL_SUPPLIER'],
      },
    ],
  },
  {
    label: 'Warehouse & imports',
    items: [
      {
        path: '/warehouse',
        label: 'Central warehouse',
        icon: 'warehouse',
        permissions: ['WAREHOUSE_DASHBOARD'],
      },
      {
        path: '/warehouse/incoming-requests',
        label: 'Incoming requests',
        icon: 'inbox',
        anyPermission: true,
        permissions: ['MANAGE_BRANCH_IMPORT_REQUESTS', 'APPROVE_IMPORT_REQUEST'],
      },
      {
        path: '/warehouse/dispatch-planning',
        label: 'Dispatch planning',
        icon: 'plan',
        permissions: ['MANAGE_DISPATCH_ORDERS'],
      },
      {
        path: '/warehouse/dispatch',
        label: 'Dispatch orders',
        icon: 'dispatch',
        permissions: ['MANAGE_DISPATCH_ORDERS'],
      },
      {
        path: '/warehouse/purchase-orders',
        label: 'Purchase orders',
        icon: 'truck',
        permissions: ['CHOOSE_EXTERNAL_SUPPLIER'],
      },
    ],
  },
  {
    label: 'Inventory staff',
    items: [
      {
        path: '/inventory/count-history',
        label: 'Count History',
        icon: 'report',
        permissions: ['INVENTORY_COUNT'],
      },
      {
        path: '/inventory/order-tracking',
        label: 'Order Tracking',
        icon: 'dispatch',
        permissions: ['RECEIVE_SHIPMENT'],
      },
      {
        path: '/inventory/receiving-history',
        label: 'Receiving History',
        icon: 'inbox',
        permissions: ['RECEIVE_SHIPMENT'],
      },
    ],
  },
  {
    label: 'Branch staff',
    items: [
      {
        path: '/branch-manager/receive',
        label: 'Receive goods',
        icon: 'boxes',
        permissions: ['SUPPLY_IMPORT_RECEIPT_APPROVE'],
      },
      {
        path: '/my-shifts',
        label: 'My shifts',
        icon: 'clock',
        permissions: ['MY_SHIFTS'],
      },
    ],
  },
  {
    label: 'Branch operations',
    items: [
      {
        path: '/branch-manager',
        label: 'Branch (BM)',
        icon: 'branch',
        permissions: ['BRANCH_DASHBOARD'],
      },
      {
        path: '/purchase-requests',
        label: 'Import requests',
        icon: 'request',
        permissions: ['CREATE_IMPORT_REQUEST'],
      },
      {
        path: '/branch-manager/shifts',
        label: 'Shifts',
        icon: 'clock',
        permissions: ['SHIFT_MANAGEMENT'],
      },
      {
        path: '/branch-manager/cash-discrepancy',
        label: 'Cash reconciliation',
        icon: 'cash',
        permissions: ['APPROVE_CASH_DISCREPANCY'],
      },
      {
        path: '/branch-manager/refunds',
        label: 'Refund approvals',
        icon: 'report',
        permissions: ['REFUND_APPROVAL'],
      },
    ],
  },
  {
    label: 'Executive',
    items: [
      {
        path: '/director',
        label: 'Director',
        icon: 'chart',
        permissions: ['DIRECTOR_DASHBOARD'],
      },
      {
        path: '/director/reports',
        label: 'Performance reports',
        icon: 'report',
        permissions: ['BUSINESS_PERFORMANCE_REPORTS'],
      },
      {
        path: '/director/planning',
        label: 'Strategic planning',
        icon: 'plan',
        permissions: ['STRATEGIC_PLANNING_OVERVIEW'],
      },
    ],
  },
  {
    label: 'Reports',
    items: [
      {
        path: '/reports',
        label: 'Reports',
        icon: 'report',
        permissions: ['REPORTS_VIEW'],
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        path: '/profile',
        label: 'Account settings',
        icon: 'user',
        publicNav: true,
      },
    ],
  },
];

export const SETUP_WORKFLOW = [
  { step: 1, label: 'Categories', path: '/catalog/categories' },
  { step: 2, label: 'Products', path: '/catalog/products' },
  { step: 3, label: 'Suppliers', path: '/catalog/suppliers' },
  { step: 4, label: 'Branches', path: '/branches' },
  { step: 5, label: 'Team', path: '/users' },
  { step: 6, label: 'Promotions', path: '/promotions' },
  { step: 7, label: 'Import requests', path: '/purchase-requests' },
  { step: 8, label: 'Products', path: '/catalog/products' },
  { step: 9, label: 'Shifts', path: '/branch-manager/shifts' },
  { step: 10, label: 'Reports', path: '/director/reports' },
];
