import XLSX from 'xlsx';

const EXCEL =
  'c:\\Users\\dongp\\Downloads\\[Tracking Task] - [Cus361][HL][Capstone]- quản lý chuỗi cửa hàng.xlsx';

const sprintRows = [
  ['Sprint W29', 'Transcribe + tóm tắt feedback mentor', 'Output: MENTOR_REVIEW_ACTION_ITEMS.md + transcript script', 'Huy Anh', 'Done'],
  ['GĐ2', 'E2E test luồng PR: còn hàng → dispatch → nhận kho', 'Fix bug phát hiện, ghi vào issue list', 'Minh, Kiên', 'To do'],
  ['GĐ2', 'E2E test luồng PR: hết hàng → PO → auto approved → dispatch', 'Dùng product seed low-stock (product_id=7)', 'Huy Anh, Kiên', 'To do'],
  ['GĐ2-BE', 'API inventory: warehouse + branch stock', 'GET /api/inventory/*', 'Kiên', 'Done'],
  ['GĐ2-FE', 'Màn Central Inventory thật (thay stub)', 'Bảng + filter + badge low-stock', 'Minh', 'Done'],
  ['GĐ2-FE', 'Màn Inventory Staff nhận hàng chi nhánh', 'Gọi receive API, cập nhật tồn kho hiển thị', 'Kiên, Minh', 'Done'],
  ['GĐ2-FE', 'Chuẩn hóa label trạng thái PR tiếng Việt + timeline UI', 'Khớp diagram 6 trạng thái chính', 'Huy Anh', 'Done'],
  ['GĐ2', 'Polish gom đơn + dispatch planning UX', 'Consolidated → dispatch planning link', 'Minh, Huy Anh', 'Done'],
  ['GĐ2', 'Tắt PR mock cho demo; viết script demo 15p', 'VITE_PR_MOCK_FALLBACK=false', 'Đông', 'Done'],
  ['GĐ3-BE', 'API check-in ca + GET my-shifts', 'Cashier permission MY_SHIFTS', 'Kiên, Đông', 'Done'],
  ['GĐ3-FE', 'Polish ShiftsPage + trang My Shifts (cashier)', 'Weekly view + nút Mở ca', 'Đông, Giang', 'Done'],
  ['GĐ1', 'Review & chốt Done các task In review (rows 2–11)', 'Checklist PHASE1_REVIEW_CHECKLIST.md', 'Cả team', 'To do'],
];

const wb = XLSX.readFile(EXCEL);
const ws = wb.Sheets[wb.SheetNames[0]];

sprintRows.forEach((row, i) => {
  const r = 20 + i;
  ws[`A${r}`] = { t: 's', v: row[0] };
  ws[`B${r}`] = { t: 's', v: row[1] };
  ws[`C${r}`] = { t: 's', v: row[2] };
  ws[`D${r}`] = { t: 's', v: row[3] };
  ws[`E${r}`] = { t: 's', v: row[4] };
});

ws.E13 = { t: 's', v: 'In progress' };
ws.E14 = { t: 's', v: 'In progress' };
ws.E15 = { t: 's', v: 'In progress' };
ws.C16 = { t: 's', v: 'Defer sprint W30 — POS chưa có BE' };
ws.C17 = { t: 's', v: 'Defer sprint W30' };
ws.C18 = { t: 's', v: 'Defer sprint W30' };
ws.C19 = { t: 's', v: 'Defer sprint W30' };

XLSX.writeFile(wb, EXCEL);
console.log('Excel updated:', EXCEL);
