-- =============================================================================
-- ChainStore — Bổ sung LÔ VẬN CHUYỂN (dispatch_orders) cho luồng 2.4 & 2.5
--   2.4 Dispatch Planning: gom các yêu cầu đã duyệt (approved) thành lô.
--   2.5 Dispatch Orders  : theo dõi & cập nhật trạng thái giao hàng.
-- Ngoài ra bổ sung cột area/route cho branches (dùng để gom đơn theo khu vực/tuyến).
--
-- Ghi chú: Backend đã tự tạo bảng + cột + seed khi khởi động (DispatchTableMigration).
-- File này chỉ để chạy tay khi cần.
-- =============================================================================

USE `convenience_store_db`;

-- Cột khu vực / tuyến giao cho chi nhánh -------------------------------------
ALTER TABLE `branches` ADD COLUMN IF NOT EXISTS `area`  VARCHAR(100) NULL;
ALTER TABLE `branches` ADD COLUMN IF NOT EXISTS `route` VARCHAR(100) NULL;

UPDATE `branches`
SET `area` = CASE WHEN (id % 3) = 1 THEN 'Central' WHEN (id % 3) = 2 THEN 'West' ELSE 'East' END,
    `route` = CASE WHEN (id % 3) = 1 THEN 'Route A' WHEN (id % 3) = 2 THEN 'Route C' ELSE 'Route B' END
WHERE `area` IS NULL OR `route` IS NULL OR `area` = '' OR `route` = '';

-- Lô vận chuyển --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dispatch_orders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PREPARING' COMMENT 'PREPARING / DELIVERING / RECEIVED',
  `vehicle` VARCHAR(100) NULL,
  `delivery_area` VARCHAR(100) NULL,
  `route` VARCHAR(100) NULL,
  `created_by` BIGINT NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  `delivered_at` DATETIME NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `dispatch_order_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `dispatch_order_id` BIGINT NOT NULL,
  `purchase_request_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dispatch_request` (`dispatch_order_id`, `purchase_request_id`)
);

ALTER TABLE `dispatch_order_requests`
  ADD CONSTRAINT `fk_dor_dispatch` FOREIGN KEY (`dispatch_order_id`) REFERENCES `dispatch_orders` (`id`),
  ADD CONSTRAINT `fk_dor_request`  FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`);