-- Chỉ xóa dòng kiểm kê ca bị TRÙNG (cache cũ trong shift_session_high_value_items)
-- KHÔNG dùng: DELETE hi FROM shift_session_high_value_items hi INNER JOIN ...
-- (câu đó gây lỗi 1175 trên MySQL Workbench Safe Updates)
--
-- Cách chạy: mở file này → Execute toàn bộ (Ctrl+Shift+Enter)

USE chuoi_cua_hang;

-- Xóa trùng theo TÊN sản phẩm (giữ 1 dòng / tên / ca)
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

-- Xóa trùng theo product_id (giữ 1 dòng / sản phẩm / ca)
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

-- Kiểm tra: mỗi ca không còn tên trùng
SELECT hi.session_id, p.name, COUNT(*) AS cnt
FROM shift_session_high_value_items hi
JOIN products p ON p.id = hi.product_id
GROUP BY hi.session_id, p.name
HAVING cnt > 1;
