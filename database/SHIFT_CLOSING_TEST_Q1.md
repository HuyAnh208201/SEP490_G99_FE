# Test Shift Closing — Q1 (cashier + BM)

## Tài khoản

| Vai trò | Email | Chi nhánh |
|--------|--------|-----------|
| Cashier | `cashier.q1@chainstore.vn` | Q1 (branch id thường = 1) |
| Branch Manager | `bm.q1@chainstore.vn` | Q1 |

Mật khẩu: dùng **cùng mật khẩu seed** với các user demo trong DB (hash `$2a$10$EblZqNptyYvcLm/...`). Nếu không đăng nhập được, reset mật khẩu user qua admin hoặc SQL.

## 1. Chạy script data

DB trùng với BE (`spring.datasource.url` trong `SEB490_G99_BE/BE/src/main/resources/application.properties`).

**Lỗi collation 1267:** Script đã thêm `SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci` và so sánh email có `COLLATE`. Chạy lại toàn bộ file từ đầu.

**MySQL Workbench / CLI:**

```bash
mysql -h <host> -u chuoi_cua_hang -p chuoi_cua_hang < SEP490_G99_FE/database/shift_closing_test_q1.sql
```

Script sẽ:

- Xóa `shift_sessions` cũ của `cashier.q1@chainstore.vn`
- Tạo ca **PUBLISHED** (bắt đầu từ 1 giờ trước → còn 3 giờ)
- Gán cashier, check-in
- Tạo session **OPEN** với:
  - Opening fund: **2,000,000 VND**
  - Cash sales: **850,000 VND**
  - Refund: **50,000 VND**
  - **Expected cash: 2,800,000 VND**

## 2. Test Cashier — đóng ca

1. BE + FE chạy (`4313` / `5175`)
2. Đăng nhập **cashier.q1@chainstore.vn**
3. POS → **Shift** → **End shift** / `/pos/shift/closing`
4. Kiểm tra summary (expected **2,800,000**)
5. High-value verification (nếu có sản phẩm ≥ 500k trong tồn chi nhánh) → **Confirm verification**
6. Nhập **Actual cash**:
   - **2,800,000** → đóng ca → **COMPLETED** (khớp quỹ)
   - **2,790,000** → ghi chú lệch → **PENDING_APPROVAL** (BM duyệt)

## 3. Test BM — cash reconciliation

1. Đăng nhập **bm.q1@chainstore.vn**
2. **Cash reconciliation** (`/branch-manager/cash-discrepancy`)
3. Duyệt ca **PENDING_APPROVAL** (nếu cashier đóng lệch tiền)

## 4. Lỗi thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Không thấy ca / opening | Chạy lại script; ca phải **PUBLISHED** và thời gian bao quanh **now** |
| `assigned_role` column missing | Start BE một lần (migration `ShiftAssignmentRoleMigration`) |
| `shift_assignment_id` missing | Start BE (migration `ShiftSessionTableMigration`) |
| Another cashier OPEN | Script đóng OPEN khác tại cùng branch; chỉ 1 OPEN / branch |

## 5. Chỉ reset session (giữ ca)

```sql
UPDATE shift_sessions
SET cash_sales = 1200000, refund_amount = 0, transaction_count = 20,
    expected_cash = opening_fund_amount + 1200000,
    verification_confirmed = 0, handover_confirmed = 0,
    actual_cash = NULL, difference = NULL, handover_remark = NULL,
    status = 'OPEN'
WHERE employee_id = (SELECT id FROM users WHERE email = 'cashier.q1@chainstore.vn')
ORDER BY id DESC LIMIT 1;
```
