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
