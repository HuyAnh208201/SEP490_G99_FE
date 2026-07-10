-- =============================================================================
-- ChainStore — Bổ sung TỒN KHO KHO TỔNG (warehouse_inventory)
-- Dùng cho luồng 2.2: Kho tổng duyệt yêu cầu nhập hàng của chi nhánh.
-- Kho tổng dựa vào tồn kho này để quyết định "còn hàng / hết hàng":
--   - Đủ tồn cho toàn bộ SL duyệt  -> yêu cầu chuyển trạng thái 'approved'
--   - Thiếu tồn ở bất kỳ sản phẩm -> yêu cầu chuyển 'awaiting_stock' (chờ đặt NCC)
--
-- Ghi chú: Backend đã tự tạo bảng + seed khi khởi động (WarehouseInventoryTableMigration).
-- File này chỉ để chạy tay khi cần (an toàn khi chạy lại nhờ IF NOT EXISTS / NOT EXISTS).
-- =============================================================================

USE `convenience_store_db`;

CREATE TABLE IF NOT EXISTS `warehouse_inventory` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0 COMMENT 'Tồn kho tổng hiện tại',
  `reorder_point` INT NOT NULL DEFAULT 0 COMMENT 'Mức tồn tối thiểu để gợi ý đặt NCC',
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_warehouse_inventory_product` (`product_id`)
);

ALTER TABLE `warehouse_inventory`
  ADD CONSTRAINT `fk_warehouse_inventory_product`
  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

-- Seed: mặc định 500/sản phẩm; riêng product_id = 7 để 20 nhằm test luồng "hết hàng".
INSERT INTO `warehouse_inventory` (`product_id`, `quantity`, `reorder_point`, `updated_at`)
SELECT p.id,
       CASE WHEN p.id = 7 THEN 20 ELSE 500 END,
       50,
       NOW()
FROM `products` p
WHERE NOT EXISTS (
    SELECT 1 FROM `warehouse_inventory` w WHERE w.product_id = p.id
);
