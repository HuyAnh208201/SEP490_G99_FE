-- High-value products for Shift Closing verification
-- Safe for MySQL Workbench (no ON DUPLICATE KEY UPDATE, no fixed product ids)
-- Uses product CODE as unique key — avoids error 1062 when id 16–31 already taken.

USE chuoi_cua_hang;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========== CATEGORIES (by name, not fixed id) ==========
INSERT INTO categories (name, parent_id, description)
SELECT 'Thuốc lá', NULL, 'Thuốc lá, xì gà — giá trị cao, dễ sai sót kiểm kê'
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = 'Thuốc lá');

INSERT INTO categories (name, parent_id, description)
SELECT 'Mỹ phẩm & dược mỹ phẩm', NULL, 'Son, kem chống nắng, serum'
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = 'Mỹ phẩm & dược mỹ phẩm');

INSERT INTO categories (name, parent_id, description)
SELECT 'Thẻ cào & thẻ dịch vụ', NULL, 'Thẻ điện thoại, thẻ game'
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = 'Thẻ cào & thẻ dịch vụ');

INSERT INTO categories (name, parent_id, description)
SELECT 'Đồ uống có cồn giá trị cao', NULL, 'Rượu mạnh, whisky, bia nhập khẩu'
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = 'Đồ uống có cồn giá trị cao');

-- ========== PRODUCTS (auto id — match category by name) ==========
INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'TOB001', '893100000016', 'Marlboro Red — thùng 10 gói', 'Thùng 10 gói Marlboro', c.id, 'carton', 480000, 550000, 'active'
FROM categories c WHERE c.name = 'Thuốc lá'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'TOB001');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'TOB002', '893100000017', '555 State Express — thùng 10 gói', 'Thùng 10 gói 555', c.id, 'carton', 450000, 520000, 'active'
FROM categories c WHERE c.name = 'Thuốc lá'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'TOB002');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'TOB003', '893100000018', 'Davidoff Mini Cigarillo — hộp 20 điếu', 'Xì gà mini', c.id, 'tin', 580000, 680000, 'active'
FROM categories c WHERE c.name = 'Thuốc lá'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'TOB003');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'TOB004', '893100000019', 'Dunhill Swiss Blend — gói lẻ cao cấp', 'Gói lẻ thuốc nhập', c.id, 'pack', 260000, 320000, 'active'
FROM categories c WHERE c.name = 'Thuốc lá'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'TOB004');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'COS001', '893100000020', 'MAC Lipstick Ruby Woo 3g', 'Son MAC', c.id, 'piece', 520000, 650000, 'active'
FROM categories c WHERE c.name = 'Mỹ phẩm & dược mỹ phẩm'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'COS001');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'COS002', '893100000021', 'La Roche-Posay Anthelios SPF50+ 50ml', 'Kem chống nắng', c.id, 'tube', 420000, 550000, 'active'
FROM categories c WHERE c.name = 'Mỹ phẩm & dược mỹ phẩm'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'COS002');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'COS003', '893100000022', 'Estée Lauder Advanced Night Repair 30ml', 'Serum cao cấp', c.id, 'bottle', 1500000, 1850000, 'active'
FROM categories c WHERE c.name = 'Mỹ phẩm & dược mỹ phẩm'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'COS003');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'COS004', '893100000023', 'YSL Rouge Volupté Shine — son lì', 'Son YSL', c.id, 'piece', 580000, 720000, 'active'
FROM categories c WHERE c.name = 'Mỹ phẩm & dược mỹ phẩm'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'COS004');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'CRD001', '893100000024', 'Thẻ cào Viettel 500.000đ', 'Thẻ Viettel 500k', c.id, 'card', 495000, 500000, 'active'
FROM categories c WHERE c.name = 'Thẻ cào & thẻ dịch vụ'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'CRD001');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'CRD002', '893100000025', 'Thẻ cào Vinaphone 500.000đ', 'Thẻ Vinaphone 500k', c.id, 'card', 495000, 500000, 'active'
FROM categories c WHERE c.name = 'Thẻ cào & thẻ dịch vụ'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'CRD002');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'CRD003', '893100000026', 'Thẻ Garena 500.000đ', 'Thẻ Garena 500k', c.id, 'card', 490000, 500000, 'active'
FROM categories c WHERE c.name = 'Thẻ cào & thẻ dịch vụ'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'CRD003');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'CRD004', '893100000027', 'Thẻ Steam Wallet 500.000đ', 'Thẻ Steam 500k', c.id, 'card', 490000, 500000, 'active'
FROM categories c WHERE c.name = 'Thẻ cào & thẻ dịch vụ'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'CRD004');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'ALC001', '893100000028', 'Johnnie Walker Red Label 750ml', 'Whisky 750ml', c.id, 'bottle', 520000, 650000, 'active'
FROM categories c WHERE c.name = 'Đồ uống có cồn giá trị cao'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'ALC001');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'ALC002', '893100000029', 'Hennessy VS Cognac 700ml', 'Cognac 700ml', c.id, 'bottle', 980000, 1200000, 'active'
FROM categories c WHERE c.name = 'Đồ uống có cồn giá trị cao'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'ALC002');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'ALC003', '893100000030', 'Corona Extra — lốc 6 lon nhập khẩu', 'Corona lốc 6', c.id, 'pack', 420000, 520000, 'active'
FROM categories c WHERE c.name = 'Đồ uống có cồn giá trị cao'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'ALC003');

INSERT INTO products (code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
SELECT 'ALC004', '893100000031', 'Suntory Kakubin Whisky 700ml', 'Whisky Nhật 700ml', c.id, 'bottle', 460000, 580000, 'active'
FROM categories c WHERE c.name = 'Đồ uống có cồn giá trị cao'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.code = 'ALC004');

-- ========== BRANCH INVENTORY (lookup product id by code) ==========
INSERT INTO branch_inventory (branch_id, product_id, quantity, reorder_point, updated_at)
SELECT 1, p.id, v.qty, v.reorder_pt, NOW()
FROM (
  SELECT 'TOB001' AS code, 8 AS qty, 4 AS reorder_pt UNION ALL
  SELECT 'TOB002', 6, 3 UNION ALL SELECT 'TOB003', 12, 5 UNION ALL SELECT 'TOB004', 24, 10 UNION ALL
  SELECT 'COS001', 10, 4 UNION ALL SELECT 'COS002', 14, 5 UNION ALL SELECT 'COS003', 6, 2 UNION ALL SELECT 'COS004', 8, 3 UNION ALL
  SELECT 'CRD001', 20, 8 UNION ALL SELECT 'CRD002', 18, 8 UNION ALL SELECT 'CRD003', 15, 6 UNION ALL SELECT 'CRD004', 12, 5 UNION ALL
  SELECT 'ALC001', 9, 3 UNION ALL SELECT 'ALC002', 5, 2 UNION ALL SELECT 'ALC003', 11, 4 UNION ALL SELECT 'ALC004', 7, 3
) AS v
JOIN products p ON p.code = v.code
WHERE NOT EXISTS (
  SELECT 1 FROM branch_inventory bi WHERE bi.branch_id = 1 AND bi.product_id = p.id
);

INSERT INTO branch_inventory (branch_id, product_id, quantity, reorder_point, updated_at)
SELECT 2, p.id, v.qty, v.reorder_pt, NOW()
FROM (
  SELECT 'TOB001' AS code, 5 AS qty, 3 AS reorder_pt UNION ALL
  SELECT 'TOB002', 4, 2 UNION ALL SELECT 'TOB003', 8, 3 UNION ALL SELECT 'TOB004', 15, 6 UNION ALL
  SELECT 'COS001', 6, 2 UNION ALL SELECT 'COS002', 8, 3 UNION ALL SELECT 'COS003', 3, 1 UNION ALL SELECT 'COS004', 5, 2 UNION ALL
  SELECT 'CRD001', 12, 5 UNION ALL SELECT 'CRD002', 10, 5 UNION ALL SELECT 'CRD003', 8, 4 UNION ALL SELECT 'CRD004', 6, 3 UNION ALL
  SELECT 'ALC001', 4, 2 UNION ALL SELECT 'ALC002', 3, 1 UNION ALL SELECT 'ALC003', 6, 2 UNION ALL SELECT 'ALC004', 4, 2
) AS v
JOIN products p ON p.code = v.code
WHERE NOT EXISTS (
  SELECT 1 FROM branch_inventory bi WHERE bi.branch_id = 2 AND bi.product_id = p.id
);

-- ========== VERIFY (expect 16 rows) ==========
SELECT p.id, p.code, c.name AS category, p.name, p.default_sale_price, bi.quantity AS stock_q1
FROM products p
JOIN categories c ON c.id = p.category_id
LEFT JOIN branch_inventory bi ON bi.product_id = p.id AND bi.branch_id = 1
WHERE p.code IN (
  'TOB001','TOB002','TOB003','TOB004',
  'COS001','COS002','COS003','COS004',
  'CRD001','CRD002','CRD003','CRD004',
  'ALC001','ALC002','ALC003','ALC004'
)
ORDER BY c.name, p.code;
