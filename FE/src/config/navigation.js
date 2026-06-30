/**
 * Menu sidebar — mỗi item gắn permission code từ BE (WebPermission).
 * `anyPermission: true` → hiện nếu user có ít nhất 1 quyền trong danh sách.
 */
export const NAV_GROUPS = [
  {
    label: 'Tổng quan',
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
    label: 'Quản trị chuỗi',
    items: [
      {
        path: '/users',
        label: 'Người dùng',
        icon: 'users',
        permissions: ['USER_MANAGEMENT_LIST'],
      },
      {
        path: '/branches',
        label: 'Chi nhánh',
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
        label: 'Khuyến mãi',
        icon: 'tag',
        anyPermission: true,
        permissions: ['PROMOTION_LIST', 'PROMOTION_DETAILS', 'BRANCH_REVENUE_PROMOS'],
      },
      {
        path: '/system/settings',
        label: 'Cấu hình hệ thống',
        icon: 'settings',
        permissions: ['SYSTEM_SETTINGS_MASTER_DATA'],
      },
    ],
  },
  {
    label: 'Danh mục & NCC',
    items: [
      {
        path: '/catalog/categories',
        label: 'Nhóm sản phẩm',
        icon: 'folder',
        roles: ['ADMIN', 'DIRECTOR'],
        comingSoon: true,
      },
      {
        path: '/catalog/products',
        label: 'Sản phẩm',
        icon: 'package',
        roles: ['ADMIN', 'DIRECTOR'],
        comingSoon: true,
      },
      {
        path: '/catalog/suppliers',
        label: 'Nhà cung cấp',
        icon: 'truck',
        roles: ['ADMIN', 'DIRECTOR'],
        comingSoon: true,
      },
    ],
  },
  {
    label: 'Kho & Nhập hàng',
    items: [
      {
        path: '/warehouse',
        label: 'Kho trung tâm',
        icon: 'warehouse',
        permissions: ['WAREHOUSE_DASHBOARD'],
      },
      {
        path: '/warehouse/inventory',
        label: 'Tồn kho',
        icon: 'boxes',
        permissions: ['VIEW_CENTRAL_INVENTORY'],
      },
      {
        path: '/warehouse/import-requests',
        label: 'Yêu cầu nhập',
        icon: 'inbox',
        permissions: ['MANAGE_BRANCH_IMPORT_REQUESTS'],
      },
      {
        path: '/warehouse/dispatch',
        label: 'Phiếu xuất kho',
        icon: 'dispatch',
        permissions: ['MANAGE_DISPATCH_ORDERS'],
      },
      {
        path: '/branch-manager/import-requests',
        label: 'Yêu cầu chi nhánh',
        icon: 'request',
        anyPermission: true,
        permissions: ['CREATE_IMPORT_REQUEST', 'SUPPLY_IMPORT_RECEIPT_APPROVE'],
      },
    ],
  },
  {
    label: 'Vận hành chi nhánh',
    items: [
      {
        path: '/branch-manager',
        label: 'Chi nhánh (BM)',
        icon: 'branch',
        permissions: ['BRANCH_DASHBOARD'],
      },
      {
        path: '/branch-manager/staff',
        label: 'Nhân viên',
        icon: 'staff',
        permissions: ['MANAGE_BRANCH_STAFF_INFO'],
      },
      {
        path: '/branch-manager/shifts',
        label: 'Ca làm việc',
        icon: 'clock',
        permissions: ['SHIFT_MANAGEMENT'],
      },
      {
        path: '/branch-manager/cash-discrepancy',
        label: 'Đối soát tiền mặt',
        icon: 'cash',
        permissions: ['APPROVE_CASH_DISCREPANCY'],
      },
    ],
  },
  {
    label: 'Điều hành',
    items: [
      {
        path: '/director',
        label: 'Ban điều hành',
        icon: 'chart',
        permissions: ['DIRECTOR_DASHBOARD'],
      },
      {
        path: '/director/reports',
        label: 'Báo cáo hiệu suất',
        icon: 'report',
        permissions: ['BUSINESS_PERFORMANCE_REPORTS'],
      },
      {
        path: '/director/planning',
        label: 'Kế hoạch chiến lược',
        icon: 'plan',
        permissions: ['STRATEGIC_PLANNING_OVERVIEW'],
      },
    ],
  },
  {
    label: 'Tài khoản',
    items: [
      {
        path: '/profile',
        label: 'Hồ sơ cá nhân',
        icon: 'user',
        publicNav: true,
      },
      {
        path: '/change-password',
        label: 'Đổi mật khẩu',
        icon: 'lock',
        publicNav: true,
      },
    ],
  },
];

export const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  DIRECTOR: 'Giám đốc',
  BRANCH_MANAGER: 'Quản lý chi nhánh',
  WAREHOUSE_MANAGER: 'Quản lý kho',
  INVENTORY_STAFF: 'Nhân viên kho',
  CASHIER: 'Thu ngân',
  CUSTOMER: 'Khách hàng',
  OWNER: 'Chủ chuỗi',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên',
};

export const SETUP_WORKFLOW = [
  { step: 1, label: 'Nhóm sản phẩm', path: '/catalog/categories' },
  { step: 2, label: 'Sản phẩm', path: '/catalog/products' },
  { step: 3, label: 'Nhà cung cấp', path: '/catalog/suppliers' },
  { step: 4, label: 'Chi nhánh', path: '/branches' },
  { step: 5, label: 'Người dùng', path: '/users' },
  { step: 6, label: 'Khuyến mãi', path: '/promotions' },
  { step: 7, label: 'Yêu cầu nhập', path: '/branch-manager/import-requests' },
  { step: 8, label: 'Tồn kho', path: '/warehouse/inventory' },
  { step: 9, label: 'Ca làm việc', path: '/branch-manager/shifts' },
  { step: 10, label: 'Báo cáo', path: '/director/reports' },
];
