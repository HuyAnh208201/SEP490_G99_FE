const STORAGE_KEY = 'chainstore_pos_customer_display';
const CHANNEL_NAME = 'chainstore-pos-customer-display';

function normalizeSnapshot(snapshot) {
  return {
    status: snapshot?.status || 'IDLE',
    qrCode: snapshot?.qrCode || '',
    amount: Number(snapshot?.amount ?? 0),
    itemCount: Number(snapshot?.itemCount ?? 0),
    discount: Number(snapshot?.discount ?? 0),
    invoiceCode: snapshot?.invoiceCode || '',
    orderCode: snapshot?.orderCode || '',
    updatedAt: Date.now(),
  };
}

export function publishCustomerDisplay(snapshot) {
  const payload = normalizeSnapshot(snapshot);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(payload);
    channel.close();
  }
  return payload;
}

export function readCustomerDisplay() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeSnapshot(JSON.parse(raw)) : normalizeSnapshot(null);
  } catch {
    return normalizeSnapshot(null);
  }
}

export function subscribeCustomerDisplay(onSnapshot) {
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;
  const onMessage = (event) => onSnapshot(normalizeSnapshot(event.data));
  const onStorage = (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        onSnapshot(normalizeSnapshot(JSON.parse(event.newValue)));
      } catch {
        // Ignore an incomplete write and wait for the next customer-display update.
      }
    }
  };
  channel?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    channel?.removeEventListener('message', onMessage);
    channel?.close();
    window.removeEventListener('storage', onStorage);
  };
}

export function openCustomerDisplay() {
  return window.open(
    '/pos/customer-display',
    'chainstore-customer-display',
    'popup=yes,width=1024,height=768',
  );
}
