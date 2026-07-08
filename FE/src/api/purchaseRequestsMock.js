/**
 * In-memory mock cho luồng Purchase Request.
 *
 * Dùng khi BE chưa sẵn sàng (network error / 404 / 501...). Dữ liệu seed bám sát
 * schema `convenience_store_db` + file DB đã bổ sung thêm sản phẩm. Store có state
 * (module-level) nên các thao tác draft/submit/approve/reject/receive phản ánh ngay
 * trên danh sách trong phiên làm việc.
 */

const BRANCHES = [
  { id: 1, name: 'ChainStore Quận 1', address: '123 Nguyễn Huệ, Quận 1, TP.HCM' },
  { id: 2, name: 'ChainStore Cầu Giấy', address: '25 Xuân Thủy, Cầu Giấy, Hà Nội' },
  { id: 3, name: 'ChainStore Đà Nẵng', address: '88 Nguyễn Văn Linh, Hải Châu, Đà Nẵng' },
];

const CATEGORIES = [
  { id: 1, name: 'Đồ uống' },
  { id: 2, name: 'Thực phẩm nhanh' },
  { id: 3, name: 'Sữa & sản phẩm từ sữa' },
  { id: 4, name: 'Gia dụng tiện ích' },
];

// code, name, categoryId, unit, currentStock (branch 1), reorderPoint, supplierId
const PRODUCTS = [
  { id: 1, code: 'DRINK001', name: 'Nước suối Lavie 500ml', categoryId: 1, unit: 'chai', stock: 12, reorder: 30, supplierId: 1 },
  { id: 2, code: 'DRINK002', name: 'Coca-Cola lon 320ml', categoryId: 1, unit: 'lon', stock: 8, reorder: 20, supplierId: 1 },
  { id: 3, code: 'FOOD001', name: 'Mì Hảo Hảo tôm chua cay', categoryId: 2, unit: 'gói', stock: 200, reorder: 60, supplierId: 2 },
  { id: 4, code: 'MILK001', name: 'Sữa tươi Vinamilk 180ml', categoryId: 3, unit: 'hộp', stock: 6, reorder: 20, supplierId: 3 },
  { id: 5, code: 'HOUSE001', name: 'Khăn giấy bỏ túi', categoryId: 4, unit: 'gói', stock: 5, reorder: 15, supplierId: 2 },
  { id: 6, code: 'DRINK003', name: 'Trà xanh không độ 500ml', categoryId: 1, unit: 'chai', stock: 18, reorder: 40, supplierId: 1 },
  { id: 7, code: 'DRINK004', name: 'Cà phê lon Highlands 235ml', categoryId: 1, unit: 'lon', stock: 25, reorder: 30, supplierId: 1 },
  { id: 8, code: 'FOOD002', name: 'Bánh mì tươi ruốc', categoryId: 2, unit: 'cái', stock: 3, reorder: 25, supplierId: 2 },
  { id: 9, code: 'FOOD003', name: 'Xúc xích Đức Việt 200g', categoryId: 2, unit: 'gói', stock: 14, reorder: 20, supplierId: 2 },
  { id: 10, code: 'MILK002', name: 'Sữa chua Vinamilk có đường', categoryId: 3, unit: 'hộp', stock: 40, reorder: 50, supplierId: 3 },
  { id: 11, code: 'MILK003', name: 'Sữa đặc Ông Thọ 380g', categoryId: 3, unit: 'lon', stock: 9, reorder: 15, supplierId: 3 },
  { id: 12, code: 'HOUSE002', name: 'Pin Con Ó AA (vỉ 4)', categoryId: 4, unit: 'vỉ', stock: 22, reorder: 20, supplierId: 2 },
  { id: 13, code: 'HOUSE003', name: 'Nước rửa tay Lifebuoy 250ml', categoryId: 4, unit: 'chai', stock: 4, reorder: 12, supplierId: 2 },
  { id: 14, code: 'FOOD004', name: 'Snack khoai tây Lays 52g', categoryId: 2, unit: 'gói', stock: 30, reorder: 40, supplierId: 2 },
  { id: 15, code: 'DRINK005', name: 'Bia Tiger lon 330ml', categoryId: 1, unit: 'lon', stock: 16, reorder: 48, supplierId: 1 },
];

const USERS = {
  3: 'Trần Minh Quản Lý Q1',
  4: 'Lê Anh Quản Lý Cầu Giấy',
  2: 'Nguyễn Văn Director',
};

function productById(id) {
  return PRODUCTS.find((p) => p.id === id);
}
function branchById(id) {
  return BRANCHES.find((b) => b.id === id) || { id, name: `Chi nhánh #${id}`, address: '' };
}
function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || { id, name: '—' };
}

function buildItem(raw) {
  const p = productById(raw.productId) || {};
  return {
    id: raw.id,
    productId: raw.productId,
    productCode: p.code || '',
    productName: p.name || `SP #${raw.productId}`,
    categoryId: p.categoryId,
    categoryName: categoryById(p.categoryId).name,
    unit: p.unit || '',
    currentStock: p.stock ?? 0,
    reorderPoint: p.reorder ?? 0,
    supplierId: raw.supplierId ?? p.supplierId ?? null,
    requestedQuantity: raw.requestedQuantity,
    approvedQuantity: raw.approvedQuantity ?? null,
  };
}

let idSeq = 100;
let itemSeq = 1000;

function reqCode(id, createdAt) {
  const year = new Date(createdAt).getFullYear();
  return `REQ-${year}-${String(id).padStart(4, '0')}`;
}

// Seed danh sách yêu cầu
let REQUESTS = [
  {
    id: 1,
    branchId: 1,
    createdBy: 3,
    reason: 'Bổ sung hàng bán chạy cuối tuần',
    status: 'approved',
    approvedBy: 2,
    rejectReason: null,
    createdAt: '2026-06-20T08:00:00',
    approvedAt: '2026-06-20T10:00:00',
    items: [
      { id: 1, productId: 1, supplierId: 1, requestedQuantity: 100, approvedQuantity: 100 },
      { id: 2, productId: 2, supplierId: 1, requestedQuantity: 80, approvedQuantity: 80 },
    ],
  },
  {
    id: 2,
    branchId: 2,
    createdBy: 4,
    reason: 'Bổ sung tồn kho đồ uống',
    status: 'pending',
    approvedBy: null,
    rejectReason: null,
    createdAt: '2026-06-24T09:15:00',
    approvedAt: null,
    items: [
      { id: 3, productId: 3, supplierId: 2, requestedQuantity: 120, approvedQuantity: null },
      { id: 4, productId: 6, supplierId: 1, requestedQuantity: 60, approvedQuantity: null },
      { id: 5, productId: 7, supplierId: 1, requestedQuantity: 40, approvedQuantity: null },
    ],
  },
  {
    id: 3,
    branchId: 1,
    createdBy: 3,
    reason: 'Đơn nháp chờ hoàn thiện',
    status: 'draft',
    approvedBy: null,
    rejectReason: null,
    createdAt: '2026-06-28T14:30:00',
    approvedAt: null,
    items: [
      { id: 6, productId: 5, supplierId: 2, requestedQuantity: 50, approvedQuantity: null },
      { id: 7, productId: 13, supplierId: 2, requestedQuantity: 30, approvedQuantity: null },
    ],
  },
  {
    id: 4,
    branchId: 3,
    createdBy: 2,
    reason: 'Khai trương mở rộng gian hàng sữa',
    status: 'received',
    approvedBy: 2,
    rejectReason: null,
    createdAt: '2026-06-15T07:45:00',
    approvedAt: '2026-06-16T09:00:00',
    items: [
      { id: 8, productId: 4, supplierId: 3, requestedQuantity: 90, approvedQuantity: 80 },
      { id: 9, productId: 10, supplierId: 3, requestedQuantity: 120, approvedQuantity: 120 },
      { id: 10, productId: 11, supplierId: 3, requestedQuantity: 60, approvedQuantity: 60 },
    ],
  },
  {
    id: 5,
    branchId: 2,
    createdBy: 4,
    reason: 'Đặt thử nhà cung cấp mới',
    status: 'rejected',
    approvedBy: 2,
    rejectReason: 'Ngân sách quý này đã đầy, đề nghị gửi lại tháng sau.',
    createdAt: '2026-06-18T11:20:00',
    approvedAt: '2026-06-19T08:30:00',
    items: [{ id: 11, productId: 15, supplierId: 1, requestedQuantity: 200, approvedQuantity: null }],
  },
];

function hydrate(req) {
  const branch = branchById(req.branchId);
  return {
    id: req.id,
    code: reqCode(req.id, req.createdAt),
    branchId: req.branchId,
    branchName: branch.name,
    branchAddress: branch.address,
    createdBy: req.createdBy,
    createdByName: USERS[req.createdBy] || `User #${req.createdBy}`,
    reason: req.reason,
    status: req.status,
    approvedBy: req.approvedBy,
    approvedByName: req.approvedBy ? USERS[req.approvedBy] : null,
    rejectReason: req.rejectReason,
    createdAt: req.createdAt,
    approvedAt: req.approvedAt,
    items: (req.items || []).map(buildItem),
    itemCount: (req.items || []).length,
  };
}

function delay(value, ms = 220) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function findRaw(id) {
  return REQUESTS.find((r) => r.id === Number(id));
}

/* ---------------- Public mock API ---------------- */

export function listRequestsMock({ status, branchId } = {}) {
  let rows = REQUESTS.slice();
  if (status) rows = rows.filter((r) => r.status === status);
  if (branchId) rows = rows.filter((r) => r.branchId === Number(branchId));
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return delay(rows.map(hydrate));
}

export function getRequestMock(id) {
  const raw = findRaw(id);
  if (!raw) return Promise.reject(new Error('Không tìm thấy yêu cầu'));
  return delay(hydrate(raw));
}

export function getRecommendedProductsMock(branchId = 1) {
  const rows = PRODUCTS.filter((p) => p.stock <= p.reorder).map((p) => ({
    productId: p.id,
    code: p.code,
    name: p.name,
    unit: p.unit,
    categoryName: categoryById(p.categoryId).name,
    currentStock: p.stock,
    reorderPoint: p.reorder,
    suggestedQty: Math.max(p.reorder * 2 - p.stock, p.reorder),
    supplierId: p.supplierId,
  }));
  return delay(rows);
}

export function getConsolidatedMock() {
  // Gom theo (chi nhánh + danh mục), cộng dồn approvedQuantity (fallback requested) của đơn approved/received.
  const map = new Map();
  REQUESTS.filter((r) => r.status === 'approved' || r.status === 'received').forEach((r) => {
    r.items.forEach((it) => {
      const p = productById(it.productId);
      if (!p) return;
      const qty = it.approvedQuantity ?? it.requestedQuantity ?? 0;
      const key = `${r.branchId}::${p.categoryId}`;
      if (!map.has(key)) {
        const branch = branchById(r.branchId);
        map.set(key, {
          branchId: r.branchId,
          branchName: branch.name,
          address: branch.address,
          categoryId: p.categoryId,
          categoryName: categoryById(p.categoryId).name,
          totalQuantity: 0,
          products: new Map(),
        });
      }
      const group = map.get(key);
      group.totalQuantity += qty;
      const prev = group.products.get(p.id) || { code: p.code, name: p.name, unit: p.unit, quantity: 0 };
      prev.quantity += qty;
      group.products.set(p.id, prev);
    });
  });
  const rows = Array.from(map.values()).map((g) => ({
    ...g,
    productCount: g.products.size,
    products: Array.from(g.products.values()),
  }));
  rows.sort((a, b) =>
    a.branchName.localeCompare(b.branchName) || a.categoryName.localeCompare(b.categoryName),
  );
  return delay(rows);
}

function normalizeItemsInput(items = []) {
  return items.map((it) => ({
    id: it.id && it.id > 0 ? it.id : ++itemSeq,
    productId: Number(it.productId),
    supplierId: it.supplierId ?? productById(Number(it.productId))?.supplierId ?? null,
    requestedQuantity: Number(it.requestedQuantity) || 0,
    approvedQuantity: it.approvedQuantity ?? null,
  }));
}

export function saveDraftMock(payload) {
  const items = normalizeItemsInput(payload.items);
  if (payload.id) {
    const raw = findRaw(payload.id);
    if (!raw) return Promise.reject(new Error('Không tìm thấy yêu cầu'));
    raw.branchId = Number(payload.branchId) || raw.branchId;
    raw.reason = payload.reason ?? raw.reason;
    raw.items = items;
    raw.status = 'draft';
    return delay(hydrate(raw));
  }
  const raw = {
    id: ++idSeq,
    branchId: Number(payload.branchId) || 1,
    createdBy: payload.createdBy || 3,
    reason: payload.reason || '',
    status: 'draft',
    approvedBy: null,
    rejectReason: null,
    createdAt: new Date().toISOString(),
    approvedAt: null,
    items,
  };
  REQUESTS.unshift(raw);
  return delay(hydrate(raw));
}

export function submitRequestMock(payload) {
  if (payload.id && findRaw(payload.id)) {
    const raw = findRaw(payload.id);
    if (payload.items) raw.items = normalizeItemsInput(payload.items);
    if (payload.reason != null) raw.reason = payload.reason;
    if (payload.branchId) raw.branchId = Number(payload.branchId);
    raw.status = 'pending';
    return delay(hydrate(raw));
  }
  return saveDraftMock(payload).then((created) => {
    const raw = findRaw(created.id);
    raw.status = 'pending';
    return hydrate(raw);
  });
}

export function cancelRequestMock(id) {
  const raw = findRaw(id);
  if (!raw) return Promise.reject(new Error('Không tìm thấy yêu cầu'));
  raw.status = 'cancelled';
  return delay(hydrate(raw));
}

export function approveRequestMock(id, { items = [] } = {}) {
  const raw = findRaw(id);
  if (!raw) return Promise.reject(new Error('Không tìm thấy yêu cầu'));
  const qtyMap = new Map(
    items.map((it) => [
      Number(it.productId ?? it.itemId ?? it.id),
      Number(it.approvedQuantity),
    ]),
  );
  raw.items = raw.items.map((it) => ({
    ...it,
    approvedQuantity: qtyMap.has(it.productId)
      ? qtyMap.get(it.productId)
      : it.approvedQuantity ?? it.requestedQuantity,
  }));
  raw.status = 'approved';
  raw.approvedBy = 2;
  raw.approvedAt = new Date().toISOString();
  return delay(hydrate(raw));
}

export function rejectRequestMock(id, reason) {
  const raw = findRaw(id);
  if (!raw) return Promise.reject(new Error('Không tìm thấy yêu cầu'));
  raw.status = 'rejected';
  raw.rejectReason = reason;
  raw.approvedBy = 2;
  raw.approvedAt = new Date().toISOString();
  return delay(hydrate(raw));
}

export function receiveRequestMock(id) {
  const raw = findRaw(id);
  if (!raw) return Promise.reject(new Error('Không tìm thấy yêu cầu'));
  raw.status = 'received';
  return delay(hydrate(raw));
}

export const MOCK_BRANCHES = BRANCHES;
export const MOCK_PRODUCTS = PRODUCTS.map((p) => ({
  id: p.id,
  code: p.code,
  name: p.name,
  unit: p.unit,
  categoryId: p.categoryId,
  categoryName: categoryById(p.categoryId).name,
  currentStock: p.stock,
  reorderPoint: p.reorder,
  supplierId: p.supplierId,
}));
