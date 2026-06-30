import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import {
  adminApi,
  branchManagerApi,
  directorApi,
  warehouseApi,
} from '../../api/modules.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import SetupWorkflowBanner from '../../components/domain/SetupWorkflowBanner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';

const ROLE_DASHBOARD = {
  ADMIN: {
    permission: 'ADMIN_DASHBOARD',
    title: 'Admin Dashboard',
    fetch: adminApi.dashboard,
    stats: [
      { label: 'Chi nhánh', value: '—', icon: 'store', hint: 'Chờ API branches' },
      { label: 'Người dùng', value: '—', icon: 'users', hint: 'Xem mục Người dùng' },
      { label: 'Khuyến mãi', value: '—', icon: 'tag', hint: 'Chờ API promotions' },
      { label: 'Cấu hình', value: '—', icon: 'settings', hint: 'Master data' },
    ],
  },
  DIRECTOR: {
    permission: 'DIRECTOR_DASHBOARD',
    title: 'Ban điều hành',
    fetch: directorApi.dashboard,
    stats: [
      { label: 'Doanh thu chuỗi', value: '—', icon: 'chart', hint: 'Báo cáo tổng hợp' },
      { label: 'Chi nhánh', value: '—', icon: 'store', hint: 'Theo dõi hiệu suất' },
      { label: 'Khuyến mãi', value: '—', icon: 'tag', hint: 'Chiến dịch đang chạy' },
      { label: 'Kế hoạch', value: '—', icon: 'plan', hint: 'Chiến lược nhập hàng' },
    ],
  },
  BRANCH_MANAGER: {
    permission: 'BRANCH_DASHBOARD',
    title: 'Chi nhánh',
    fetch: branchManagerApi.dashboard,
    stats: [
      { label: 'Doanh thu hôm nay', value: '—', icon: 'cash', hint: 'POS + đóng ca' },
      { label: 'Ca làm việc', value: '—', icon: 'clock', hint: 'Quản lý ca' },
      { label: 'Nhân viên', value: '—', icon: 'staff', hint: 'Phân công' },
      { label: 'Yêu cầu nhập', value: '—', icon: 'request', hint: 'Purchase request' },
    ],
  },
  WAREHOUSE_MANAGER: {
    permission: 'WAREHOUSE_DASHBOARD',
    title: 'Kho trung tâm',
    fetch: warehouseApi.dashboard,
    stats: [
      { label: 'Tồn kho', value: '—', icon: 'boxes', hint: 'Central inventory' },
      { label: 'Yêu cầu nhập', value: '—', icon: 'inbox', hint: 'Từ chi nhánh' },
      { label: 'Phiếu xuất', value: '—', icon: 'dispatch', hint: 'Dispatch orders' },
      { label: 'NCC', value: '—', icon: 'truck', hint: 'Chọn supplier' },
    ],
  },
};

const QUICK_LINKS = {
  ADMIN: [
    { to: '/users', label: 'Quản lý người dùng' },
    { to: '/branches', label: 'Chi nhánh' },
    { to: '/catalog/products', label: 'Sản phẩm (sắp có)' },
    { to: '/system/settings', label: 'Cấu hình hệ thống' },
  ],
  DIRECTOR: [
    { to: '/director/reports', label: 'Báo cáo hiệu suất' },
    { to: '/promotions', label: 'Khuyến mãi' },
    { to: '/branches', label: 'Danh sách chi nhánh' },
    { to: '/catalog/suppliers', label: 'Nhà cung cấp' },
  ],
  BRANCH_MANAGER: [
    { to: '/branch-manager/shifts', label: 'Ca làm việc' },
    { to: '/branch-manager/staff', label: 'Nhân viên' },
    { to: '/branch-manager/import-requests', label: 'Yêu cầu nhập hàng' },
    { to: '/branch-manager/cash-discrepancy', label: 'Đối soát tiền mặt' },
  ],
  WAREHOUSE_MANAGER: [
    { to: '/warehouse/inventory', label: 'Tồn kho' },
    { to: '/warehouse/import-requests', label: 'Yêu cầu nhập' },
    { to: '/warehouse/dispatch', label: 'Phiếu xuất kho' },
    { to: '/catalog/suppliers', label: 'Nhà cung cấp' },
  ],
};

export default function DashboardPage() {
  const { role, has } = usePermissions();
  const webRole =
    role === 'MANAGER' ? 'BRANCH_MANAGER' : role === 'OWNER' ? 'DIRECTOR' : role;

  const config = ROLE_DASHBOARD[webRole];
  const [moduleData, setModuleData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cfg = ROLE_DASHBOARD[webRole];
    if (!cfg?.fetch || !has(cfg.permission)) {
      setLoading(false);
      setModuleData(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    cfg
      .fetch()
      .then((data) => {
        if (!cancelled) setModuleData(data);
      })
      .catch(() => {
        if (!cancelled) setModuleData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [webRole, has]);

  const quickLinks = QUICK_LINKS[webRole] || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={config?.title || 'Tổng quan'}
        description={`Vai trò: ${ROLE_LABELS[webRole] || webRole || '—'}. Hệ thống quản lý chuỗi cửa hàng tiện lợi Shelfly / ChainStore.`}
        badge={
          moduleData?.status === 'placeholder' ? (
            <Badge tone="soon">API placeholder</Badge>
          ) : null
        }
      />

      {(webRole === 'ADMIN' || webRole === 'DIRECTOR') && <SetupWorkflowBanner />}

      {config ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {config.stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h2 className="text-base font-semibold text-[var(--admin-text)]">
                Trạng thái module
              </h2>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                {loading
                  ? 'Đang tải dữ liệu từ backend...'
                  : moduleData?.message ||
                    'Kết nối API thành công. Nghiệp vụ chi tiết sẽ được bổ sung ở các sprint tiếp theo.'}
              </p>
              {moduleData && (
                <div className="mt-4 rounded-lg bg-[#f7f9fb] px-4 py-3 text-sm">
                  <p>
                    <span className="font-medium">Module:</span> {moduleData.module || '—'}
                  </p>
                  <p>
                    <span className="font-medium">Screen:</span> {moduleData.screen || '—'}
                  </p>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-[var(--admin-text)]">Truy cập nhanh</h2>
              <ul className="mt-3 space-y-2">
                {quickLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-[var(--admin-brand)] transition hover:bg-[#0058be]/5"
                    >
                      {link.label}
                      <span aria-hidden>→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <p className="text-sm text-[var(--admin-muted)]">
            Vai trò hiện tại không có dashboard web riêng. Vui lòng sử dụng ứng dụng POS hoặc
            mobile cho vai trò Thu ngân / Nhân viên kho.
          </p>
        </Card>
      )}
    </div>
  );
}
