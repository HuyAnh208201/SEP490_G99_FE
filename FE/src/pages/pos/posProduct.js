/** Map ProductResponse (BE) → shape sản phẩm dùng chung cho các màn POS. */
export function toPosProduct(product) {
  return {
    id: product.id,
    barcode: product.barcode,
    code: product.code,
    name: product.name,
    unit: product.unit,
    price: Number(product.defaultSalePrice),
    promoPrice: null,
    stock: product.branchStock ?? product.warehouseStock ?? 0,
    category: product.categoryName ?? 'Uncategorized',
  };
}

/** Giá bán thực tế của một dòng: ưu tiên giá khuyến mãi nếu có. */
export function unitPrice(product) {
  return product.promoPrice ?? product.price;
}

export function hasPromo(product) {
  return product.promoPrice != null && product.promoPrice < product.price;
}
