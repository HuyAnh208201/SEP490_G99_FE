-- Remove duplicate high-value products (keep TOB/COS/CRD/ALC from SQL, drop CVS-HV from BE seed)
-- Safe-update friendly (MySQL Workbench error 1175): every DELETE uses PRIMARY KEY `id > 0`.
-- Run after high_value_products.sql if Shift Closing shows duplicates.

USE chuoi_cua_hang;

-- 1) Remove verification rows pointing at duplicate SKUs
DELETE FROM shift_session_high_value_items
WHERE id > 0
  AND product_id IN (SELECT id FROM (SELECT id FROM products WHERE code LIKE 'CVS-HV-%') AS dup);

-- 2) Remove branch stock for duplicate SKUs
DELETE FROM branch_inventory
WHERE id > 0
  AND product_id IN (SELECT id FROM (SELECT id FROM products WHERE code LIKE 'CVS-HV-%') AS dup);

-- 3) Remove duplicate products (English mirror catalog from BE migration)
DELETE FROM products
WHERE id > 0
  AND code LIKE 'CVS-HV-%';

-- 4) Drop duplicate verification lines (keeps one row per product name / product_id)
-- Uses primary key (id) in WHERE — safe for MySQL Workbench error 1175
DELETE FROM shift_session_high_value_items
WHERE id > 0
  AND id IN (
    SELECT drop_id FROM (
      SELECT hi.id AS drop_id
      FROM shift_session_high_value_items hi
      INNER JOIN shift_session_high_value_items hi2
        ON hi.session_id = hi2.session_id
      INNER JOIN products p1 ON p1.id = hi.product_id
      INNER JOIN products p2 ON p2.id = hi2.product_id
      WHERE hi.id > hi2.id
        AND LOWER(TRIM(p1.name)) = LOWER(TRIM(p2.name))
    ) AS dup_names
  );

DELETE FROM shift_session_high_value_items
WHERE id > 0
  AND id IN (
    SELECT drop_id FROM (
      SELECT hi.id AS drop_id
      FROM shift_session_high_value_items hi
      INNER JOIN shift_session_high_value_items hi2
        ON hi.session_id = hi2.session_id
       AND hi.product_id = hi2.product_id
      WHERE hi.id > hi2.id
    ) AS dup_products
  );

-- 4b) Optional: wipe all lines for active sessions so BE re-seeds on next Shift Closing visit
-- DELETE FROM shift_session_high_value_items
-- WHERE id > 0
--   AND session_id IN (
--     SELECT sid FROM (
--       SELECT id AS sid FROM shift_sessions
--       WHERE status IN ('OPEN', 'CLOSING', 'PENDING_HANDOVER')
--     ) AS active_sessions
--   );

-- 5) Verify: should be 16 rows, no duplicate names
SELECT p.code, p.name, c.name AS category, bi.quantity AS stock_q1
FROM products p
JOIN categories c ON c.id = p.category_id
LEFT JOIN branch_inventory bi ON bi.product_id = p.id AND bi.branch_id = 1
WHERE p.code IN (
  'TOB001','TOB002','TOB003','TOB004',
  'COS001','COS002','COS003','COS004',
  'CRD001','CRD002','CRD003','CRD004',
  'ALC001','ALC002','ALC003','ALC004'
)
ORDER BY p.code;
