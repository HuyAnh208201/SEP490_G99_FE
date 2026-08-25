/** Normalize BE purchase-request payloads to FE view models. */

import { normalizeStatus } from '../constants/purchaseRequests.js';

export function normalizeRequestSummary(row) {
  if (!row) return row;
  return {
    ...row,
    code: row.code || row.requestNumber,
    reason: row.reason ?? row.notes ?? '',
    status: normalizeStatus(row.status) || row.status,
  };
}

export function normalizeRequestDetail(row) {
  if (!row) return row;
  const items = (row.items || []).map((it) => ({
    ...it,
    id: it.id,
    requestedQuantity: it.requestedQuantity ?? it.requestedQty ?? 0,
    approvedQuantity: it.approvedQuantity ?? null,
    unitCost: it.unitCost ?? it.referenceImportPrice ?? null,
    referenceImportPrice: it.referenceImportPrice ?? it.unitCost ?? null,
    lineCost: it.lineCost ?? null,
    topPackagingLabel: it.topPackagingLabel,
    topPackagingConversionQty: it.topPackagingConversionQty ?? 1,
    unitsPerImportUnit: it.unitsPerImportUnit ?? it.topPackagingConversionQty ?? 1,
    shortDate: Boolean(it.shortDate),
  }));
  return {
    ...normalizeRequestSummary(row),
    items,
  };
}

/**
 * Flatten nested BE consolidated response into rows for the table UI.
 * BE: branches[] → categories[] → items[]
 */
export function flattenConsolidated(branches = []) {
  const rows = [];
  branches.forEach((branch) => {
    const address = branch.address ?? branch.branchAddress ?? '';
    (branch.categories || []).forEach((cat) => {
      const products = (cat.items || cat.products || []).map((p) => ({
        code: p.productCode ?? p.code,
        name: p.productName ?? p.name,
        unit: p.unit,
        quantity: p.totalQuantity ?? p.quantity ?? 0,
      }));
      const totalQuantity = products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
      rows.push({
        branchId: branch.branchId,
        branchName: branch.branchName,
        address,
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        productCount: products.length,
        totalQuantity,
        products,
      });
    });
  });
  return rows;
}

export function toDraftPayload(payload) {
  return {
    notes: payload.reason?.trim() || null,
    desiredReceiveDate: payload.desiredReceiveDate || null,
    items: (payload.items || []).map((it) => ({
      productId: Number(it.productId),
      requestedQty: Number(it.requestedQuantity) || 0,
    })),
  };
}

export function toApprovePayload(items = []) {
  return {
    items: items.map((it) => ({
      productId: Number(it.productId),
      approvedQuantity: Number(it.approvedQuantity) || 0,
    })),
  };
}
