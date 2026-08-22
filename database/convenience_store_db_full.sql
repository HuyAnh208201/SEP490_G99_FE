-- =============================================================================
-- ChainStore — convenience_store_db (FULL / SEED mở rộng)
-- Bổ sung thêm sản phẩm (products 6..15), packaging & tồn kho tương ứng để
-- chạy được 2 màn: (1) Quản lý Yêu cầu Nhập hàng và (2) Tổng hợp / Gom đơn.
-- Một số sản phẩm để tồn kho THẤP hơn reorder point nhằm xuất hiện trong
-- danh sách "Sản phẩm gợi ý" (recommended-products).
-- =============================================================================

DROP DATABASE IF EXISTS `convenience_store_db`;

CREATE DATABASE `convenience_store_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `convenience_store_db`;

CREATE TABLE `roles` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'ADMIN, DIRECTOR, BRANCH_MANAGER, WAREHOUSE_MANAGER, INVENTORY_STAFF, CASHIER, CUSTOMER',
  `description` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `users` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `email` varchar(255) UNIQUE NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `phone` varchar(255),
  `role_id` int NOT NULL,
  `branch_id` int COMMENT 'NULL với Director / Customer / Warehouse Manager',
  `status` varchar(255) DEFAULT 'active' COMMENT 'active / locked',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL
);

CREATE TABLE `password_reset_tokens` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL COMMENT 'Token hết hạn sau 1h',
  `used` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `branches` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` varchar(255),
  `phone` varchar(255),
  `operating_hours` varchar(255) COMMENT 'Giờ hoạt động',
  `manager_id` int COMMENT 'Branch Manager phụ trách',
  `status` varchar(255) DEFAULT 'active' COMMENT 'active / suspended',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL
);

CREATE TABLE `categories` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `parent_id` int COMMENT 'Danh mục cha nếu có',
  `description` text
);

CREATE TABLE `products` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(255) UNIQUE NOT NULL,
  `barcode` varchar(255) UNIQUE,
  `name` varchar(255) NOT NULL,
  `image_url` varchar(255),
  `description` text,
  `category_id` int,
  `unit` varchar(255),
  `reference_import_price` decimal(15,2),
  `default_sale_price` decimal(15,2),
  `status` varchar(255) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL
);

CREATE TABLE `product_packagings` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `conversion_qty` int NOT NULL,
  `barcode` varchar(255),
  `is_base` boolean DEFAULT false
);

CREATE TABLE `branch_inventory` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int DEFAULT 0,
  `reorder_point` int DEFAULT 0 COMMENT 'Mức tồn tối thiểu để gợi ý nhập hàng',
  `updated_at` timestamp NULL
);

CREATE TABLE `product_batches` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `lot_number` varchar(255),
  `manufacture_date` date,
  `expiry_date` date,
  `received_quantity` int,
  `remaining_quantity` int,
  `goods_receipt_item_id` int,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `stock_counts` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `created_by` int NOT NULL,
  `approved_by` int,
  `status` varchar(255) DEFAULT 'pending',
  `note` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL
);

CREATE TABLE `stock_count_items` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `stock_count_id` int NOT NULL,
  `product_id` int NOT NULL,
  `system_quantity` int,
  `actual_quantity` int
);

CREATE TABLE `suppliers` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `contact_person` varchar(255),
  `phone` varchar(255),
  `address` varchar(255),
  `status` varchar(255) DEFAULT 'active'
);

CREATE TABLE `purchase_requests` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `created_by` int NOT NULL,
  `reason` text,
  `status` varchar(255) DEFAULT 'draft' COMMENT 'draft / pending / approved / received / rejected / cancelled',
  `approved_by` int,
  `reject_reason` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL
);

CREATE TABLE `purchase_request_items` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `purchase_request_id` int NOT NULL,
  `product_id` int NOT NULL,
  `supplier_id` int,
  `requested_quantity` int NOT NULL,
  `approved_quantity` int
);

CREATE TABLE `goods_receipts` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `purchase_request_id` int,
  `branch_id` int NOT NULL,
  `stock_staff_id` int NOT NULL,
  `status` varchar(255) DEFAULT 'completed',
  `received_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `goods_receipt_items` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `goods_receipt_id` int NOT NULL,
  `product_id` int NOT NULL,
  `ordered_quantity` int,
  `received_quantity` int
);

CREATE TABLE `campaigns` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `discount_value` decimal(15,2),
  `conditions` json,
  `scope` varchar(255) DEFAULT 'chain',
  `priority` int DEFAULT 0,
  `start_at` timestamp NULL,
  `end_at` timestamp NULL,
  `status` varchar(255) DEFAULT 'draft',
  `created_by` int,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `campaign_branches` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `campaign_id` int NOT NULL,
  `branch_id` int NOT NULL
);

CREATE TABLE `membership_tiers` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `min_points` int NOT NULL,
  `benefits` text
);

CREATE TABLE `customers` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `member_code` varchar(255) UNIQUE,
  `full_name` varchar(255),
  `phone` varchar(255) UNIQUE,
  `email` varchar(255),
  `points` int DEFAULT 0,
  `tier_id` int,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `loyalty_configs` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `spend_per_point` int,
  `description` varchar(255),
  `updated_at` timestamp NULL
);

CREATE TABLE `point_transactions` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `order_id` int,
  `points` int NOT NULL,
  `type` varchar(255) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `voucher_catalog` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `discount_type` varchar(255),
  `discount_value` decimal(15,2),
  `points_required` int NOT NULL,
  `status` varchar(255) DEFAULT 'active'
);

CREATE TABLE `shifts` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `created_by` int NOT NULL,
  `start_time` timestamp NULL,
  `end_time` timestamp NULL,
  `opening_cash` decimal(15,2),
  `expected_cash` decimal(15,2),
  `actual_cash` decimal(15,2),
  `difference` decimal(15,2),
  `status` varchar(255) DEFAULT 'scheduled',
  `approved_by` int,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `shift_assignments` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `shift_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `check_in_at` timestamp NULL,
  `check_out_at` timestamp NULL
);

CREATE TABLE `orders` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `shift_id` int,
  `cashier_id` int NOT NULL,
  `customer_id` int,
  `subtotal` decimal(15,2),
  `discount_amount` decimal(15,2) DEFAULT 0,
  `total` decimal(15,2),
  `status` varchar(255) DEFAULT 'completed',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `order_items` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `batch_id` int,
  `quantity` int NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `line_total` decimal(15,2)
);

CREATE TABLE `order_discounts` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `campaign_id` int,
  `discount_amount` decimal(15,2) NOT NULL
);

CREATE TABLE `payments` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `method` varchar(255) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `cash_received` decimal(15,2),
  `change_amount` decimal(15,2),
  `transaction_ref` varchar(255),
  `status` varchar(255) DEFAULT 'success',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX `product_packagings_index_0` ON `product_packagings` (`product_id`, `name`);
CREATE UNIQUE INDEX `branch_inventory_index_1` ON `branch_inventory` (`branch_id`, `product_id`);
CREATE UNIQUE INDEX `product_batches_index_2` ON `product_batches` (`product_id`, `branch_id`, `lot_number`);
CREATE UNIQUE INDEX `campaign_branches_index_3` ON `campaign_branches` (`campaign_id`, `branch_id`);

ALTER TABLE `users` ADD FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
ALTER TABLE `users` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);
ALTER TABLE `password_reset_tokens` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
ALTER TABLE `branches` ADD FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`);
ALTER TABLE `categories` ADD FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`);
ALTER TABLE `products` ADD FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);
ALTER TABLE `product_packagings` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
ALTER TABLE `branch_inventory` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);
ALTER TABLE `branch_inventory` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
ALTER TABLE `product_batches` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
ALTER TABLE `product_batches` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);
ALTER TABLE `product_batches` ADD FOREIGN KEY (`goods_receipt_item_id`) REFERENCES `goods_receipt_items` (`id`);
ALTER TABLE `stock_counts` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);
ALTER TABLE `stock_counts` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);
ALTER TABLE `stock_counts` ADD FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);
ALTER TABLE `stock_count_items` ADD FOREIGN KEY (`stock_count_id`) REFERENCES `stock_counts` (`id`);
ALTER TABLE `stock_count_items` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
ALTER TABLE `purchase_requests` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);
ALTER TABLE `purchase_requests` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);
ALTER TABLE `purchase_requests` ADD FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);
ALTER TABLE `purchase_request_items` ADD FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`);
ALTER TABLE `purchase_request_items` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
ALTER TABLE `purchase_request_items` ADD FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);
ALTER TABLE `goods_receipts` ADD FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`);
ALTER TABLE `goods_receipts` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);
ALTER TABLE `goods_receipts` ADD FOREIGN KEY (`stock_staff_id`) REFERENCES `users` (`id`);
ALTER TABLE `goods_receipt_items` ADD FOREIGN KEY (`goods_receipt_id`) REFERENCES `goods_receipts` (`id`);
ALTER TABLE `goods_receipt_items` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
ALTER TABLE `campaigns` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);
ALTER TABLE `campaign_branches` ADD FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`);
ALTER TABLE `campaign_branches` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);
ALTER TABLE `customers` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `customers` ADD FOREIGN KEY (`tier_id`) REFERENCES `membership_tiers` (`id`);
ALTER TABLE `point_transactions` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);
ALTER TABLE `point_transactions` ADD FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);
ALTER TABLE `shifts` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);
ALTER TABLE `shifts` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);
ALTER TABLE `shifts` ADD FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);
ALTER TABLE `shift_assignments` ADD FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`);
ALTER TABLE `shift_assignments` ADD FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`);
ALTER TABLE `orders` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);
ALTER TABLE `orders` ADD FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`);
ALTER TABLE `orders` ADD FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`);
ALTER TABLE `orders` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);
ALTER TABLE `order_items` ADD FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);
ALTER TABLE `order_items` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
ALTER TABLE `order_items` ADD FOREIGN KEY (`batch_id`) REFERENCES `product_batches` (`id`);
ALTER TABLE `order_discounts` ADD FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);
ALTER TABLE `order_discounts` ADD FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`);
ALTER TABLE `payments` ADD FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);

-- ============================ SEED DATA ============================

INSERT INTO roles (id, name, description) VALUES
(1, 'ADMIN', 'Quản trị hệ thống web quản lý'),
(2, 'DIRECTOR', 'Giám đốc chuỗi cửa hàng, dùng web quản lý'),
(3, 'BRANCH_MANAGER', 'Quản lý chi nhánh, dùng web quản lý'),
(4, 'WAREHOUSE_MANAGER', 'Quản lý kho trung tâm, dùng web quản lý'),
(5, 'INVENTORY_STAFF', 'Nhân viên kiểm kho, dùng POS / Inventory app, không vào web quản lý'),
(6, 'CASHIER', 'Thu ngân, dùng POS'),
(7, 'CUSTOMER', 'Khách hàng, dùng customer app');

INSERT INTO branches (id, name, address, phone, operating_hours, manager_id, status) VALUES
(1, 'ChainStore Quận 1', '123 Nguyễn Huệ, Quận 1, TP.HCM', '02811110001', '06:00 - 23:00', NULL, 'active'),
(2, 'ChainStore Cầu Giấy', '25 Xuân Thủy, Cầu Giấy, Hà Nội', '02411110002', '06:00 - 23:00', NULL, 'active'),
(3, 'ChainStore Đà Nẵng', '88 Nguyễn Văn Linh, Hải Châu, Đà Nẵng', '02361111003', '06:00 - 23:00', NULL, 'active');

INSERT INTO users (id, email, password_hash, full_name, phone, role_id, branch_id, status) VALUES
(1, 'admin@chainstore.vn', '$2a$10$EblZqNptyYvcLm/VwDCVAuBjzZOI7khzdyGPBr08PpIi0na624b8.', 'System Admin', '0900000001', 1, NULL, 'active'),
(2, 'director@chainstore.vn', '$2a$10$EblZqNptyYvcLm/VwDCVAuBjzZOI7khzdyGPBr08PpIi0na624b8.', 'Nguyễn Văn Director', '0900000002', 2, NULL, 'active'),
(3, 'bm.q1@chainstore.vn', '$2a$10$EblZqNptyYvcLm/VwDCVAuBjzZOI7khzdyGPBr08PpIi0na624b8.', 'Trần Minh Quản Lý Q1', '0900000003', 3, 1, 'active'),
(4, 'bm.cg@chainstore.vn', '$2a$10$EblZqNptyYvcLm/VwDCVAuBjzZOI7khzdyGPBr08PpIi0na624b8.', 'Lê Anh Quản Lý Cầu Giấy', '0900000004', 3, 2, 'active'),
(5, 'warehouse@chainstore.vn', '$2a$10$EblZqNptyYvcLm/VwDCVAuBjzZOI7khzdyGPBr08PpIi0na624b8.', 'Phạm Hoàng Kho Tổng', '0900000005', 4, NULL, 'active'),
(6, 'inventory.q1@chainstore.vn', '$2a$10$EblZqNptyYvcLm/VwDCVAuBjzZOI7khzdyGPBr08PpIi0na624b8.', 'Võ Kiểm Kho Q1', '0900000006', 5, 1, 'active'),
(7, 'inventory.cg@chainstore.vn', '$2a$10$EblZqNptyYvcLm/VwDCVAuBjzZOI7khzdyGPBr08PpIi0na624b8.', 'Đặng Kiểm Kho Cầu Giấy', '0900000007', 5, 2, 'active'),
(8, 'cashier.q1@chainstore.vn', '$2a$10$EblZqNptyYvcLm/VwDCVAuBjzZOI7khzdyGPBr08PpIi0na624b8.', 'Nguyễn Thu Ngân Q1', '0900000008', 6, 1, 'active'),
(9, 'cashier.cg@chainstore.vn', '$2a$10$EblZqNptyYvcLm/VwDCVAuBjzZOI7khzdyGPBr08PpIi0na624b8.', 'Hoàng Thu Ngân Cầu Giấy', '0900000009', 6, 2, 'active'),
(10, 'customer01@gmail.com', '$2a$10$EblZqNptyYvcLm/VwDCVAuBjzZOI7khzdyGPBr08PpIi0na624b8.', 'Khách Hàng Một', '0911111111', 7, NULL, 'active'),
(11, 'customer02@gmail.com', '$2a$10$EblZqNptyYvcLm/VwDCVAuBjzZOI7khzdyGPBr08PpIi0na624b8.', 'Khách Hàng Hai', '0922222222', 7, NULL, 'active');

UPDATE branches SET manager_id = 3 WHERE id = 1;
UPDATE branches SET manager_id = 4 WHERE id = 2;

INSERT INTO membership_tiers (id, name, min_points, benefits) VALUES
(1, 'Đồng', 0, 'Tích điểm cơ bản'),
(2, 'Bạc', 500, 'Ưu đãi sinh nhật, đổi voucher tốt hơn'),
(3, 'Vàng', 1500, 'Ưu tiên khuyến mãi, voucher giá trị cao');

INSERT INTO customers (id, user_id, member_code, full_name, phone, email, points, tier_id) VALUES
(1, 10, 'CUS000001', 'Khách Hàng Một', '0911111111', 'customer01@gmail.com', 120, 1),
(2, 11, 'CUS000002', 'Khách Hàng Hai', '0922222222', 'customer02@gmail.com', 800, 2);

INSERT INTO categories (id, name, parent_id, description) VALUES
(1, 'Đồ uống', NULL, 'Nước giải khát, nước suối, cà phê'),
(2, 'Thực phẩm nhanh', NULL, 'Mì gói, bánh mì, đồ ăn liền'),
(3, 'Sữa & sản phẩm từ sữa', NULL, 'Sữa tươi, sữa chua'),
(4, 'Gia dụng tiện ích', NULL, 'Khăn giấy, pin, đồ dùng nhỏ');

-- ---- SẢN PHẨM (đã bổ sung thêm id 6..15) ----
INSERT INTO products
(id, code, barcode, name, image_url, description, category_id, unit, reference_import_price, default_sale_price, status)
VALUES
(1, 'DRINK001', '893000000001', 'Lavie Natural Mineral Water 500ml', NULL, 'Bottled mineral water', 1, 'bottle', 4000, 7000, 'active'),
(2, 'DRINK002', '893000000002', 'Coca-Cola Can 320ml', NULL, 'Carbonated soft drink', 1, 'can', 7000, 12000, 'active'),
(3, 'FOOD001', '893000000003', 'Hao Hao Spicy Shrimp Instant Noodles', NULL, 'Instant noodles', 2, 'pack', 3500, 6000, 'active'),
(4, 'MILK001', '893000000004', 'Vinamilk Fresh Milk 180ml', NULL, 'UHT fresh milk', 3, 'box', 5500, 9000, 'active'),
(5, 'HOUSE001', '893000000005', 'Pocket Tissue Pack', NULL, 'Convenience tissue pack', 4, 'pack', 3000, 6000, 'active'),
(6, 'DRINK003', '893000000006', 'Green Tea Unsweetened 500ml', NULL, 'Ready-to-drink green tea', 1, 'bottle', 5000, 9000, 'active'),
(7, 'DRINK004', '893000000007', 'Highlands Coffee Can 235ml', NULL, 'Ready-to-drink coffee', 1, 'can', 8000, 15000, 'active'),
(8, 'FOOD002', '893000000008', 'Pork Floss Bread', NULL, 'Packaged sandwich', 2, 'piece', 6000, 12000, 'active'),
(9, 'FOOD003', '893000000009', 'Duc Viet Sausage 200g', NULL, 'Vacuum-packed sausage', 2, 'pack', 18000, 28000, 'active'),
(10, 'MILK002', '893000000010', 'Vinamilk Sweet Yogurt', NULL, 'Yogurt cup', 3, 'box', 4500, 8000, 'active'),
(11, 'MILK003', '893000000011', 'Longevity Condensed Milk 380g', NULL, 'Sweetened condensed milk', 3, 'can', 15000, 24000, 'active'),
(12, 'HOUSE002', '893000000012', 'Con Coc AA Batteries (blister 4)', NULL, 'AA alkaline batteries', 4, 'blister', 20000, 35000, 'active'),
(13, 'HOUSE003', '893000000013', 'Lifebuoy Hand Wash 250ml', NULL, 'Antibacterial hand wash', 4, 'bottle', 22000, 39000, 'active'),
(14, 'FOOD004', '893000000014', 'Lays Potato Chips 52g', NULL, 'Potato chips snack', 2, 'pack', 7000, 12000, 'active'),
(15, 'DRINK005', '893000000015', 'Tiger Beer Can 330ml', NULL, 'Beer can', 1, 'can', 12000, 18000, 'active');

INSERT INTO product_packagings (product_id, name, conversion_qty, barcode, is_base) VALUES
(1, 'Chai', 1, '893000000001', true),
(1, 'Thùng 24 chai', 24, '893000000101', false),
(2, 'Lon', 1, '893000000002', true),
(2, 'Thùng 24 lon', 24, '893000000102', false),
(3, 'Gói', 1, '893000000003', true),
(3, 'Thùng 30 gói', 30, '893000000103', false),
(4, 'Hộp', 1, '893000000004', true),
(4, 'Lốc 4 hộp', 4, '893000000104', false),
(5, 'Gói', 1, '893000000005', true),
(6, 'Chai', 1, '893000000006', true),
(6, 'Thùng 24 chai', 24, '893000000106', false),
(7, 'Lon', 1, '893000000007', true),
(7, 'Thùng 24 lon', 24, '893000000107', false),
(8, 'Cái', 1, '893000000008', true),
(9, 'Gói', 1, '893000000009', true),
(10, 'Hộp', 1, '893000000010', true),
(10, 'Lốc 4 hộp', 4, '893000000110', false),
(11, 'Lon', 1, '893000000011', true),
(12, 'Vỉ', 1, '893000000012', true),
(13, 'Chai', 1, '893000000013', true),
(14, 'Gói', 1, '893000000014', true),
(15, 'Lon', 1, '893000000015', true),
(15, 'Thùng 24 lon', 24, '893000000115', false);

-- ---- TỒN KHO (kèm reorder_point; một số SP tồn thấp để lọt vào "gợi ý") ----
INSERT INTO branch_inventory (branch_id, product_id, quantity, reorder_point, updated_at) VALUES
(1, 1, 12, 30, NOW()),
(1, 2, 8, 20, NOW()),
(1, 3, 200, 60, NOW()),
(1, 4, 6, 20, NOW()),
(1, 5, 5, 15, NOW()),
(1, 6, 18, 40, NOW()),
(1, 7, 25, 30, NOW()),
(1, 8, 3, 25, NOW()),
(1, 9, 14, 20, NOW()),
(1, 10, 40, 50, NOW()),
(1, 11, 9, 15, NOW()),
(1, 12, 22, 20, NOW()),
(1, 13, 4, 12, NOW()),
(1, 14, 30, 40, NOW()),
(1, 15, 16, 48, NOW()),
(2, 1, 100, 30, NOW()),
(2, 2, 70, 20, NOW()),
(2, 3, 160, 60, NOW()),
(2, 4, 50, 20, NOW()),
(2, 5, 75, 15, NOW()),
(2, 6, 30, 40, NOW()),
(2, 7, 12, 30, NOW()),
(2, 8, 40, 25, NOW()),
(2, 9, 8, 20, NOW()),
(2, 10, 60, 50, NOW()),
(3, 1, 20, 30, NOW()),
(3, 4, 5, 20, NOW()),
(3, 10, 15, 50, NOW()),
(3, 11, 4, 15, NOW());

-- ---- Danh mục & sản phẩm giá trị cao (kiểm kê đóng ca) ----
INSERT INTO categories (id, name, parent_id, description) VALUES
(5, 'Thuốc lá', NULL, 'Thuốc lá, xì gà — đơn giá cao, kích thước nhỏ'),
(6, 'Mỹ phẩm & dược mỹ phẩm', NULL, 'Son, kem chống nắng, serum giá trị cao'),
(7, 'Thẻ cào & thẻ dịch vụ', NULL, 'Thẻ điện thoại, thẻ game vật lý'),
(8, 'Đồ uống có cồn giá trị cao', NULL, 'Rượu mạnh, whisky, bia nhập khẩu lẻ');

INSERT INTO products
(id, code, barcode, name, description, category_id, unit, reference_import_price, default_sale_price, status)
VALUES
(16, 'TOB001', '893100000016', 'Marlboro Red — thùng 10 gói', 'Thùng 10 gói Marlboro Red', 5, 'carton', 480000, 550000, 'active'),
(17, 'TOB002', '893100000017', '555 State Express — thùng 10 gói', 'Thùng 10 gói 555', 5, 'carton', 450000, 520000, 'active'),
(18, 'TOB003', '893100000018', 'Davidoff Mini Cigarillo — hộp 20 điếu', 'Xì gà mini cao cấp', 5, 'tin', 580000, 680000, 'active'),
(19, 'TOB004', '893100000019', 'Dunhill Swiss Blend — gói lẻ cao cấp', 'Gói lẻ thuốc nhập', 5, 'pack', 260000, 320000, 'active'),
(20, 'COS001', '893100000020', 'MAC Lipstick Ruby Woo 3g', 'Son môi MAC', 6, 'piece', 520000, 650000, 'active'),
(21, 'COS002', '893100000021', 'La Roche-Posay Anthelios SPF50+ 50ml', 'Kem chống nắng', 6, 'tube', 420000, 550000, 'active'),
(22, 'COS003', '893100000022', 'Estée Lauder Advanced Night Repair 30ml', 'Serum cao cấp', 6, 'bottle', 1500000, 1850000, 'active'),
(23, 'COS004', '893100000023', 'YSL Rouge Volupté Shine', 'Son YSL', 6, 'piece', 580000, 720000, 'active'),
(24, 'CRD001', '893100000024', 'Thẻ cào Viettel 500.000đ', 'Thẻ Viettel 500k', 7, 'card', 495000, 500000, 'active'),
(25, 'CRD002', '893100000025', 'Thẻ cào Vinaphone 500.000đ', 'Thẻ Vinaphone 500k', 7, 'card', 495000, 500000, 'active'),
(26, 'CRD003', '893100000026', 'Thẻ Garena 500.000đ', 'Thẻ Garena 500k', 7, 'card', 490000, 500000, 'active'),
(27, 'CRD004', '893100000027', 'Thẻ Steam Wallet 500.000đ', 'Thẻ Steam 500k', 7, 'card', 490000, 500000, 'active'),
(28, 'ALC001', '893100000028', 'Johnnie Walker Red Label 750ml', 'Whisky 750ml', 8, 'bottle', 520000, 650000, 'active'),
(29, 'ALC002', '893100000029', 'Hennessy VS Cognac 700ml', 'Cognac 700ml', 8, 'bottle', 980000, 1200000, 'active'),
(30, 'ALC003', '893100000030', 'Corona Extra — lốc 6 lon nhập khẩu', 'Bia Corona lốc 6', 8, 'pack', 420000, 520000, 'active'),
(31, 'ALC004', '893100000031', 'Suntory Kakubin Whisky 700ml', 'Whisky Nhật 700ml', 8, 'bottle', 460000, 580000, 'active');

INSERT INTO product_packagings (product_id, name, conversion_qty, barcode, is_base) VALUES
(16, 'Thùng', 1, '893100000016', true), (17, 'Thùng', 1, '893100000017', true),
(18, 'Hộp', 1, '893100000018', true), (19, 'Gói', 1, '893100000019', true),
(20, 'Cây', 1, '893100000020', true), (21, 'Tuýp', 1, '893100000021', true),
(22, 'Chai', 1, '893100000022', true), (23, 'Cây', 1, '893100000023', true),
(24, 'Thẻ', 1, '893100000024', true), (25, 'Thẻ', 1, '893100000025', true),
(26, 'Thẻ', 1, '893100000026', true), (27, 'Thẻ', 1, '893100000027', true),
(28, 'Chai', 1, '893100000028', true), (29, 'Chai', 1, '893100000029', true),
(30, 'Lốc', 1, '893100000030', true), (31, 'Chai', 1, '893100000031', true);

INSERT INTO branch_inventory (branch_id, product_id, quantity, reorder_point, updated_at) VALUES
(1, 16, 8, 4, NOW()), (1, 17, 6, 3, NOW()), (1, 18, 12, 5, NOW()), (1, 19, 24, 10, NOW()),
(1, 20, 10, 4, NOW()), (1, 21, 14, 5, NOW()), (1, 22, 6, 2, NOW()), (1, 23, 8, 3, NOW()),
(1, 24, 20, 8, NOW()), (1, 25, 18, 8, NOW()), (1, 26, 15, 6, NOW()), (1, 27, 12, 5, NOW()),
(1, 28, 9, 3, NOW()), (1, 29, 5, 2, NOW()), (1, 30, 11, 4, NOW()), (1, 31, 7, 3, NOW()),
(2, 16, 5, 3, NOW()), (2, 17, 4, 2, NOW()), (2, 18, 8, 3, NOW()), (2, 19, 15, 6, NOW()),
(2, 20, 6, 2, NOW()), (2, 21, 8, 3, NOW()), (2, 22, 3, 1, NOW()), (2, 23, 5, 2, NOW()),
(2, 24, 12, 5, NOW()), (2, 25, 10, 5, NOW()), (2, 26, 8, 4, NOW()), (2, 27, 6, 3, NOW()),
(2, 28, 4, 2, NOW()), (2, 29, 3, 1, NOW()), (2, 30, 6, 2, NOW()), (2, 31, 4, 2, NOW());

INSERT INTO suppliers (id, name, contact_person, phone, address, status) VALUES
(1, 'Nhà phân phối nước giải khát ABC', 'Anh Nam', '0988000001', 'TP.HCM', 'active'),
(2, 'Công ty thực phẩm nhanh XYZ', 'Chị Hạnh', '0988000002', 'Hà Nội', 'active'),
(3, 'Nhà cung cấp sữa Việt', 'Anh Long', '0988000003', 'Bình Dương', 'active');

INSERT INTO loyalty_configs (id, spend_per_point, description, updated_at) VALUES
(1, 10000, 'Mỗi 10.000đ chi tiêu được 1 điểm', NOW());

INSERT INTO voucher_catalog (id, name, discount_type, discount_value, points_required, status) VALUES
(1, 'Giảm 10.000đ', 'fixed', 10000, 100, 'active'),
(2, 'Giảm 5%', 'percent', 5, 200, 'active'),
(3, 'Giảm 20.000đ', 'fixed', 20000, 300, 'active');

INSERT INTO campaigns (id, name, type, discount_value, conditions, scope, priority, start_at, end_at, status, created_by) VALUES
(1, 'Giảm 10% đồ uống mùa hè', 'percent', 10, JSON_OBJECT('category_id', 1), 'chain', 1, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'active', 1);

INSERT INTO campaign_branches (campaign_id, branch_id) VALUES
(1, 1),
(1, 2);

-- ---- YÊU CẦU NHẬP HÀNG (đủ 6 trạng thái để test 2 màn) ----
INSERT INTO purchase_requests (id, branch_id, created_by, reason, status, approved_by, reject_reason, created_at, approved_at) VALUES
(1, 1, 3, 'Bổ sung hàng bán chạy cuối tuần', 'approved', 2, NULL, '2026-06-20 08:00:00', '2026-06-20 10:00:00'),
(2, 2, 4, 'Bổ sung tồn kho đồ uống', 'pending', NULL, NULL, '2026-06-24 09:15:00', NULL),
(3, 1, 3, 'Đơn nháp chờ hoàn thiện', 'draft', NULL, NULL, '2026-06-28 14:30:00', NULL),
(4, 3, 2, 'Khai trương mở rộng gian hàng sữa', 'received', 2, NULL, '2026-06-15 07:45:00', '2026-06-16 09:00:00'),
(5, 2, 4, 'Đặt thử nhà cung cấp mới', 'rejected', 2, 'Ngân sách quý này đã đầy, đề nghị gửi lại tháng sau.', '2026-06-18 11:20:00', '2026-06-19 08:30:00');

INSERT INTO purchase_request_items (purchase_request_id, product_id, supplier_id, requested_quantity, approved_quantity) VALUES
(1, 1, 1, 100, 100),
(1, 2, 1, 80, 80),
(2, 3, 2, 120, NULL),
(2, 6, 1, 60, NULL),
(2, 7, 1, 40, NULL),
(3, 5, 2, 50, NULL),
(3, 13, 2, 30, NULL),
(4, 4, 3, 90, 80),
(4, 10, 3, 120, 120),
(4, 11, 3, 60, 60),
(5, 15, 1, 200, NULL);

INSERT INTO goods_receipts (id, purchase_request_id, branch_id, stock_staff_id, status, received_at) VALUES
(1, 4, 3, 6, 'completed', NOW());

INSERT INTO goods_receipt_items (id, goods_receipt_id, product_id, ordered_quantity, received_quantity) VALUES
(1, 1, 4, 80, 80),
(2, 1, 10, 120, 120),
(3, 1, 11, 60, 60);

INSERT INTO product_batches
(product_id, branch_id, lot_number, manufacture_date, expiry_date, received_quantity, remaining_quantity, goods_receipt_item_id)
VALUES
(1, 1, 'LOT-LAVIE-001', '2026-01-01', '2027-01-01', 100, 100, NULL),
(2, 1, 'LOT-COCA-001', '2026-01-10', '2026-10-10', 80, 80, NULL),
(3, 1, 'LOT-HAOHAO-001', '2026-02-01', '2026-08-01', 200, 200, NULL),
(4, 3, 'LOT-MILK-001', '2026-06-01', '2026-12-15', 80, 80, 1),
(10, 3, 'LOT-YOGURT-001', '2026-06-05', '2026-09-05', 120, 120, 2),
(11, 3, 'LOT-CONDMILK-001', '2026-05-20', '2027-05-20', 60, 60, 3);

INSERT INTO stock_counts (id, branch_id, created_by, approved_by, status, note, created_at, approved_at) VALUES
(1, 1, 6, 3, 'approved', 'Kiểm kê đầu tháng', NOW(), NOW());

INSERT INTO stock_count_items (stock_count_id, product_id, system_quantity, actual_quantity) VALUES
(1, 1, 12, 12),
(1, 2, 8, 8);

INSERT INTO shifts
(id, branch_id, created_by, start_time, end_time, opening_cash, expected_cash, actual_cash, difference, status, approved_by)
VALUES
(1, 1, 3, NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR), 1000000, 0, NULL, NULL, 'PUBLISHED', NULL);

INSERT INTO shift_assignments (shift_id, staff_id, check_in_at, check_out_at) VALUES
(1, 8, NOW(), NULL);

INSERT INTO orders
(id, branch_id, shift_id, cashier_id, customer_id, subtotal, discount_amount, total, status, created_at)
VALUES
(1, 1, 1, 8, 1, 25000, 3000, 22000, 'completed', NOW());

INSERT INTO order_items (order_id, product_id, batch_id, quantity, unit_price, line_total) VALUES
(1, 1, 1, 2, 7000, 14000),
(1, 3, 3, 1, 6000, 6000),
(1, 5, NULL, 1, 6000, 6000);

INSERT INTO order_discounts (order_id, campaign_id, discount_amount) VALUES
(1, 1, 3000);

INSERT INTO payments (order_id, method, amount, cash_received, change_amount, transaction_ref, status) VALUES
(1, 'cash', 22000, 50000, 28000, NULL, 'success');

INSERT INTO point_transactions (customer_id, order_id, points, type) VALUES
(1, 1, 2, 'earn');
