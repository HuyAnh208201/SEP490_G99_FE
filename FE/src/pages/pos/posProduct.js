/** Map ProductResponse (BE) → shape sản phẩm dùng chung cho các màn POS. */
export function toPosProduct(product) {
  return {
    id: product.id,
    barcode: product.barcode,
    code: product.code,
    name: product.name || product.productName || product.code || 'Unnamed product',
    description: product.description ?? null,
    unit: product.unit,
    price: Number(product.defaultSalePrice),
    promoPrice: null,
    stock: product.branchStock ?? product.warehouseStock ?? 0,
    imageUrl: product.imageUrl ?? null,
    categoryId: product.categoryId,
    category: product.categoryName ?? 'Uncategorized',
    refundable: product.refundable !== false,
    // products table hiện chưa có NSX/HSD — giữ null để UI chỉ hiện khi DB bổ sung sau.
    manufacturedAt: product.manufacturedAt ?? product.manufactureDate ?? null,
    expiryDate: product.expiryDate ?? product.expiredAt ?? null,
  };
}

/** Giá bán thực tế của một dòng: ưu tiên giá khuyến mãi nếu có. */
export function unitPrice(product) {
  return product.promoPrice ?? product.price;
}

export function hasPromo(product) {
  return product.promoPrice != null && product.promoPrice < product.price;
}
