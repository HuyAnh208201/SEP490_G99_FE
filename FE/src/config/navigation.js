/**
 * Sidebar menu — each item maps to a BE permission code (WebPermission).
 * `anyPermission: true` → visible if user has at least one listed permission.
 */
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
        permissions: ['PRODUCT_MANAGEMENT'],
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
        path: '/warehouse/inventory',
        label: 'Inventory',
        icon: 'boxes',
        permissions: ['VIEW_CENTRAL_INVENTORY'],
      },
      {
        path: '/warehouse/import-requests',
        label: 'Import requests',
        icon: 'inbox',
        permissions: ['MANAGE_BRANCH_IMPORT_REQUESTS'],
      },
      {
        path: '/warehouse/dispatch',
        label: 'Dispatch orders',
        icon: 'dispatch',
        permissions: ['MANAGE_DISPATCH_ORDERS'],
      },
      {
        path: '/branch-manager/import-requests',
        label: 'Branch requests',
        icon: 'request',
        anyPermission: true,
        permissions: ['CREATE_IMPORT_REQUEST', 'SUPPLY_IMPORT_RECEIPT_APPROVE'],
      },
      {
        path: '/purchase-requests',
        label: 'Purchase requests',
        icon: 'request',
        roles: [
          'ADMIN',
          'DIRECTOR',
          'BRANCH_MANAGER',
          'WAREHOUSE_MANAGER',
          'INVENTORY_STAFF',
        ],
      },
      {
        path: '/purchase-requests/consolidated',
        label: 'Consolidated orders',
        icon: 'boxes',
        roles: ['ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER'],
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

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  DIRECTOR: 'Director',
  BRANCH_MANAGER: 'Branch manager',
  WAREHOUSE_MANAGER: 'Warehouse manager',
  INVENTORY_STAFF: 'Inventory staff',
  CASHIER: 'Cashier',
  CUSTOMER: 'Customer',
  OWNER: 'Owner',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

export const SETUP_WORKFLOW = [
  { step: 1, label: 'Categories', path: '/catalog/categories' },
  { step: 2, label: 'Products', path: '/catalog/products' },
  { step: 3, label: 'Suppliers', path: '/catalog/suppliers' },
  { step: 4, label: 'Branches', path: '/branches' },
  { step: 5, label: 'Team', path: '/users' },
  { step: 6, label: 'Promotions', path: '/promotions' },
  { step: 7, label: 'Import requests', path: '/branch-manager/import-requests' },
  { step: 8, label: 'Inventory', path: '/warehouse/inventory' },
  { step: 9, label: 'Shifts', path: '/branch-manager/shifts' },
  { step: 10, label: 'Reports', path: '/director/reports' },
];
