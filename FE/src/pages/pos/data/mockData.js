/** Mock POS catalog — mirrors seed SQL until BE POS APIs exist. */

export const MOCK_PRODUCTS = [
  {
    id: 1,
    barcode: '893000000001',
    code: 'DRINK001',
    name: 'Lavie Natural Mineral Water 500ml',
    unit: 'bottle',
    price: 7000,
    promoPrice: null,
    stock: 12,
    category: 'Beverage',
  },
  {
    id: 2,
    barcode: '893000000002',
    code: 'DRINK002',
    name: 'Coca-Cola Can 320ml',
    unit: 'can',
    price: 12000,
    promoPrice: 10000,
    stock: 8,
    category: 'Beverage',
  },
  {
    id: 3,
    barcode: '893000000003',
    code: 'FOOD001',
    name: 'Hao Hao Spicy Shrimp Instant Noodles',
    unit: 'pack',
    price: 6000,
    promoPrice: null,
    stock: 200,
    category: 'Instant Food',
  },
  {
    id: 4,
    barcode: '893000000004',
    code: 'MILK001',
    name: 'Vinamilk Fresh Milk 180ml',
    unit: 'box',
    price: 9000,
    promoPrice: 7500,
    stock: 6,
    category: 'Dairy',
  },
  {
    id: 5,
    barcode: '893000000005',
    code: 'HOUSE001',
    name: 'Pocket Tissue Pack',
    unit: 'pack',
    price: 6000,
    promoPrice: null,
    stock: 5,
    category: 'Personal Care',
  },
  {
    id: 6,
    barcode: '893000000006',
    code: 'DRINK003',
    name: 'Green Tea Unsweetened 500ml',
    unit: 'bottle',
    price: 9000,
    promoPrice: null,
    stock: 18,
    category: 'Beverage',
  },
  {
    id: 7,
    barcode: '893000000007',
    code: 'DRINK004',
    name: 'Highlands Coffee Can 235ml',
    unit: 'can',
    price: 15000,
    promoPrice: 12900,
    stock: 25,
    category: 'Beverage',
  },
];

export const MOCK_CUSTOMERS = [
  {
    id: 1,
    memberCode: 'CUS000001',
    fullName: 'Customer One',
    phone: '0911111111',
    points: 120,
    tier: 'Bronze',
  },
  {
    id: 2,
    memberCode: 'CUS000002',
    fullName: 'Customer Two',
    phone: '0922222222',
    points: 800,
    tier: 'Silver',
  },
];

/** Campaign discount codes (mock). */
export const MOCK_DISCOUNT_CODES = {
  SAVE10: { type: 'percent', value: 10, label: '10% off invoice' },
  MINUS50K: { type: 'fixed', value: 50000, label: '50,000 VND off' },
};

export const POINT_VALUE_VND = 1000;
export const EARN_VND_PER_POINT = 10000;

export const MOCK_ORDER_HISTORY = [
  {
    id: 50,
    invoiceCode: 'INV-2026-050',
    createdAt: '2026-07-16T14:32:00',
    customerName: 'Customer One',
    itemCount: 4,
    total: 156000,
    paymentMethod: 'CASH',
    status: 'COMPLETED',
  },
  {
    id: 49,
    invoiceCode: 'INV-2026-049',
    createdAt: '2026-07-16T13:05:00',
    customerName: 'Retail',
    itemCount: 2,
    total: 19000,
    paymentMethod: 'CASH',
    status: 'COMPLETED',
  },
];

export function findProductByBarcode(barcode) {
  const code = String(barcode || '').trim();
  if (!code) return null;
  return MOCK_PRODUCTS.find((p) => p.barcode === code || p.code === code) ?? null;
}

export function findCustomerByPhone(phone) {
  const normalized = String(phone || '').replace(/\D/g, '');
  return MOCK_CUSTOMERS.find((c) => c.phone === normalized) ?? null;
}

export function unitPrice(product) {
  return product.promoPrice ?? product.price;
}

export function hasPromo(product) {
  return product.promoPrice != null && product.promoPrice < product.price;
}
