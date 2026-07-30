-- =============================================================================
-- Shift Closing — test data for Branch Q1
-- Cashier: cashier.q1@chainstore.vn
-- Branch Manager: bm.q1@chainstore.vn
--
-- Creates: 1 PUBLISHED shift (running now), assignment, OPEN shift_session
-- with sample cash sales so /pos/shift/closing shows expected cash.
--
-- Run against the same DB as BE (see application.properties).
-- WARNING: Removes existing shift_sessions for this cashier first.
-- =============================================================================

USE chuoi_cua_hang;

-- Tránh lỗi 1267: collation email (unicode) vs chuỗi literal (general)
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @cashier_email = 'cashier.q1@chainstore.vn' COLLATE utf8mb4_unicode_ci;
SET @bm_email = 'bm.q1@chainstore.vn' COLLATE utf8mb4_unicode_ci;

SET @cashier_id = (
  SELECT id FROM users
  WHERE email COLLATE utf8mb4_unicode_ci = @cashier_email
  LIMIT 1
);
SET @bm_id = (
  SELECT id FROM users
  WHERE email COLLATE utf8mb4_unicode_ci = @bm_email
  LIMIT 1
);
-- Require seed users (fallback id nếu email khác seed file: cashier=8, bm=3, branch=1)
SET @cashier_id = COALESCE(@cashier_id, 8);
SET @bm_id = COALESCE(@bm_id, 3);
SET @branch_id = COALESCE((SELECT branch_id FROM users WHERE id = @cashier_id LIMIT 1), 1);

SELECT @cashier_id AS cashier_id, @bm_id AS bm_id, @branch_id AS branch_id;

-- Require seed users
SELECT IF(@cashier_id IS NULL, 'ERROR: cashier.q1@chainstore.vn not found', 'OK cashier') AS check_cashier;
SELECT IF(@bm_id IS NULL, 'ERROR: bm.q1@chainstore.vn not found', 'OK bm') AS check_bm;

-- ---------------------------------------------------------------------------
-- 1) Clean prior test rows for this cashier / branch OPEN session
-- ---------------------------------------------------------------------------
DELETE sa FROM shift_session_approvals sa
INNER JOIN shift_sessions ss ON ss.id = sa.session_id
WHERE ss.employee_id = @cashier_id;

DELETE hi FROM shift_session_high_value_items hi
INNER JOIN shift_sessions ss ON ss.id = hi.session_id
WHERE ss.employee_id = @cashier_id;

DELETE FROM shift_sessions WHERE employee_id = @cashier_id;

UPDATE shift_sessions
SET status = 'COMPLETED', closed_at = NOW()
WHERE branch_id = @branch_id AND status = 'OPEN';

-- ---------------------------------------------------------------------------
-- 2) Published shift window: started 1h ago, ends in 3h (covers "now ± 30min")
-- ---------------------------------------------------------------------------
INSERT INTO shifts (
  branch_id, created_by, start_time, end_time,
  opening_cash, expected_cash, actual_cash, difference, status, approved_by, created_at
) VALUES (
  @branch_id, @bm_id,
  DATE_SUB(NOW(), INTERVAL 1 HOUR),
  DATE_ADD(NOW(), INTERVAL 3 HOUR),
  2000000, NULL, NULL, NULL,
  'PUBLISHED', NULL, NOW()
);

SET @shift_id = LAST_INSERT_ID();

-- assigned_role column: added by ShiftAssignmentRoleMigration on BE startup
INSERT INTO shift_assignments (shift_id, staff_id, assigned_role, check_in_at, check_out_at)
VALUES (@shift_id, @cashier_id, 'CASHIER', NOW(), NULL);

SET @assignment_id = LAST_INSERT_ID();

-- ---------------------------------------------------------------------------
-- 3) OPEN shift session (ready for Shift Closing UI)
--    Expected cash = 2,000,000 + 850,000 - 50,000 = 2,800,000
-- ---------------------------------------------------------------------------
SET @opening_fund = 2000000;
SET @cash_sales = 850000;
SET @refund = 50000;
SET @expected = @opening_fund + @cash_sales - @refund;

INSERT INTO shift_sessions (
  shift_id,
  shift_assignment_id,
  employee_id,
  role,
  branch_id,
  status,
  opened_at,
  opening_confirmed,
  verification_confirmed,
  handover_confirmed,
  opening_fund_amount,
  opening_fund_received_from,
  opening_fund_received_at,
  transaction_count,
  cash_sales,
  refund_amount,
  expected_cash,
  created_at,
  updated_at
) VALUES (
  @shift_id,
  @assignment_id,
  @cashier_id,
  'CASHIER',
  @branch_id,
  'OPEN',
  NOW(),
  1,
  0,
  0,
  @opening_fund,
  @bm_id,
  NOW(),
  15,
  @cash_sales,
  @refund,
  @expected,
  NOW(),
  NOW()
);

SET @session_id = LAST_INSERT_ID();

-- ---------------------------------------------------------------------------
-- 4) Summary
-- ---------------------------------------------------------------------------
SELECT
  @shift_id AS shift_id,
  @assignment_id AS assignment_id,
  @session_id AS session_id,
  @opening_fund AS opening_fund_vnd,
  @cash_sales AS cash_sales_vnd,
  @refund AS refund_vnd,
  @expected AS expected_cash_vnd;

SELECT ss.id, ss.status, ss.opened_at, ss.cash_sales, ss.expected_cash, s.start_time, s.end_time
FROM shift_sessions ss
JOIN shifts s ON s.id = ss.shift_id
WHERE ss.id = @session_id;
