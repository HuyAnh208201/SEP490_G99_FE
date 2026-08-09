/** Categories that use the lower price bar for shift-closing verification (≥ 300,000 VND). */
const HIGH_RISK_CATEGORY_PATTERNS = [
  'thuốc lá',
  'tobacco',
  'mỹ phẩm',
  'cosmetic',
  'beauty',
  'thẻ cào',
  'thẻ dịch vụ',
  'prepaid',
  'service card',
  'cồn giá trị cao',
  'premium alcohol',
];

export const HIGH_VALUE_PRICE_DEFAULT = 500_000;
export const HIGH_VALUE_PRICE_RISK_CATEGORY = 300_000;

export function isHighRiskCategoryName(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return HIGH_RISK_CATEGORY_PATTERNS.some((p) => n.includes(p));
}

export function minPriceForHighValueVerification(categoryName) {
  return isHighRiskCategoryName(categoryName)
    ? HIGH_VALUE_PRICE_RISK_CATEGORY
    : HIGH_VALUE_PRICE_DEFAULT;
}

export function willAppearInShiftVerification(categoryName, salePrice) {
  const price = Number(salePrice);
  if (!Number.isFinite(price) || price <= 0) return false;
  return price >= minPriceForHighValueVerification(categoryName);
}

export function highValueVerificationHint(categoryName, salePrice) {
  const min = minPriceForHighValueVerification(categoryName);
  const qualifies = willAppearInShiftVerification(categoryName, salePrice);
  if (qualifies) {
    return `This product will appear in Shift Closing verification (retail ≥ ${min.toLocaleString('en-US')} VND and in branch stock).`;
  }
  if (isHighRiskCategoryName(categoryName)) {
    return `High-theft-risk category: set retail price ≥ ${min.toLocaleString('en-US')} VND and ensure branch stock so cashiers can count it at shift close.`;
  }
  return `Other categories need retail price ≥ ${HIGH_VALUE_PRICE_DEFAULT.toLocaleString('en-US')} VND plus branch stock to appear in shift closing verification.`;
}
