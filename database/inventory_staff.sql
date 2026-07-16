-- =============================================================================
-- ChainStore — Bổ sung nghiệp vụ NHÂN VIÊN KHO CHI NHÁNH (Inventory Staff) — mục 2.6
--   - Nhập kho thực tế (Receive Shipment)  → dùng bảng goods_receipts sẵn có,
--     bổ sung cột dispatch_order_id + note để lưu lô vận chuyển & ghi chú.
--   - Kiểm kê hàng hóa (Inventory Count)    → bảng inventory_count_sessions / _items.
--   - Cập nhật tồn kho (Update Stock)       → duyệt phiên kiểm kê sẽ set lại branch_inventory.
--
-- Ghi chú: Backend đã tự tạo bảng + cột khi khởi động (InventoryStaffTableMigration).
-- File này chỉ để chạy tay khi cần.
-- =============================================================================

USE `convenience_store_db`;

-- Cột bổ sung cho phiếu nhập kho ---------------------------------------------
ALTER TABLE `goods_receipts`      ADD COLUMN IF NOT EXISTS `dispatch_order_id` BIGINT NULL;
ALTER TABLE `goods_receipt_items` ADD COLUMN IF NOT EXISTS `note`              VARCHAR(500) NULL;

-- Phiên kiểm kê hàng hóa -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_count_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `branch_id` BIGINT NOT NULL,
  `count_date` DATE NOT NULL,
  `counted_by` BIGINT NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL' COMMENT 'PENDING_APPROVAL / APPROVED / REJECTED',
  `total_products` INT NULL DEFAULT 0,
  `note` TEXT NULL,
  `reviewed_by` BIGINT NULL,
  `reviewed_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_count_session_branch` (`branch_id`)
);

CREATE TABLE IF NOT EXISTS `inventory_count_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT NOT NULL,
  `product_id` INT NOT NULL,
  `system_qty` INT NOT NULL DEFAULT 0,
  `counted_qty` INT NOT NULL DEFAULT 0,
  `variance` INT NOT NULL DEFAULT 0,
  `note` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_count_item_session` (`session_id`)
);

ALTER TABLE `inventory_count_items`
  ADD CONSTRAINT `fk_count_item_session` FOREIGN KEY (`session_id`) REFERENCES `inventory_count_sessions` (`id`);
