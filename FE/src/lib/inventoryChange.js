export function resolveReceivedQuantity(shippedQuantity, receivedValue) {
  const shipped = Number(shippedQuantity) || 0;
  if (receivedValue === '' || receivedValue == null) return shipped;

  const received = Number(receivedValue);
  return Number.isFinite(received) ? received : 0;
}

export function shipmentDifference(shippedQuantity, receivedValue) {
  return resolveReceivedQuantity(shippedQuantity, receivedValue) - (Number(shippedQuantity) || 0);
}

export function countShipmentDifferences(items, form) {
  return items.filter(
    (item) => shipmentDifference(item.shippedQuantity, form[item.productId]?.received) !== 0,
  ).length;
}

export function formatSignedDifference(value) {
  const difference = Number(value) || 0;
  return difference > 0 ? `+${difference}` : String(difference);
}
