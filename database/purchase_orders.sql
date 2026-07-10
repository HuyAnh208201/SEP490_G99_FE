-- ============================================================
-- Giai đoạn 3: Đơn đặt hàng nhà cung cấp (Purchase Orders)
-- Kho tổng đặt NCC bổ sung tồn kho -> giải phóng yêu cầu AWAITING_STOCK
-- Chạy tay nếu không dùng auto-migration của BE.
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id BIGINT NOT NULL AUTO_INCREMENT,
    supplier_id INT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ORDERED',
    notes TEXT NULL,
    created_by BIGINT NULL,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    received_at DATETIME NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_purchase_orders_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    purchase_order_id BIGINT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(15,2) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_po_items_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_po_items_product FOREIGN KEY (product_id) REFERENCES products (id)
);
