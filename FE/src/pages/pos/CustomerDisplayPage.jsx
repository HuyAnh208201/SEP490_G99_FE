import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatVnd } from '../../lib/money.js';
import { readCustomerDisplay, subscribeCustomerDisplay } from './customerDisplayChannel.js';

const STATUS_COPY = {
  CREATING: ['Preparing payment', 'The QR code will appear in a moment.'],
  PENDING: ['Scan to pay', 'Use any banking app that supports VietQR.'],
  PAID: ['Payment received', 'Thank you for shopping with us.'],
  CANCELLED: ['Payment cancelled', 'Please follow the cashier’s instructions.'],
  EXPIRED: ['QR code expired', 'Please ask the cashier to create a new payment.'],
  FAILED: ['Payment unavailable', 'Please ask the cashier for another payment method.'],
  IDLE: ['Welcome', 'Your payment QR will appear here.'],
};

export default function CustomerDisplayPage() {
  const [snapshot, setSnapshot] = useState(readCustomerDisplay);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => subscribeCustomerDisplay(setSnapshot), []);

  useEffect(() => {
    if (!snapshot.qrCode || snapshot.status !== 'PENDING') {
      setQrDataUrl('');
      return undefined;
    }
    let stale = false;
    QRCode.toDataURL(snapshot.qrCode, { width: 440, margin: 1 })
      .then((url) => {
        if (!stale) setQrDataUrl(url);
      })
      .catch(() => {
        if (!stale) setQrDataUrl('');
      });
    return () => {
      stale = true;
    };
  }, [snapshot.qrCode, snapshot.status]);

  const [title, description] = STATUS_COPY[snapshot.status] || STATUS_COPY.IDLE;
  const paid = snapshot.status === 'PAID';
  const discount = Math.max(0, snapshot.discount);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef3f8] p-6 text-[var(--admin-text)]">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-elevated)] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-h-[560px] flex-col items-center justify-center p-8 text-center lg:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--admin-brand)]">ChainStore checkout</p>
          {paid ? (
            <div className="mt-8 flex h-32 w-32 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <svg viewBox="0 0 24 24" className="h-20 w-20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ) : qrDataUrl ? (
            <img src={qrDataUrl} alt="PayOS payment QR code" className="mt-8 h-80 w-80 rounded-2xl border border-[var(--admin-border)] bg-white p-3" />
          ) : (
            <div className="mt-8 flex h-80 w-80 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--admin-border)] bg-[#f7f9fb] px-8 text-sm text-[var(--admin-subtle)]">
              {description}
            </div>
          )}
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-base text-[var(--admin-muted)]">{description}</p>
        </div>

        <aside className="flex flex-col justify-center bg-[var(--admin-brand)] p-8 text-white lg:p-10">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white/70">Final summary</h2>
          <dl className="mt-8 space-y-5 text-base">
            <div className="flex justify-between gap-4">
              <dt className="text-white/70">Items</dt>
              <dd className="font-bold tabular-nums">{snapshot.itemCount}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-white/70">Discount</dt>
                <dd className="font-bold tabular-nums">− {formatVnd(discount)}</dd>
              </div>
            ) : null}
            <div className="border-t border-white/20 pt-6">
              <dt className="text-sm text-white/70">Amount to pay</dt>
              <dd className="mt-2 whitespace-nowrap text-4xl font-extrabold tracking-tight">{formatVnd(snapshot.amount)}</dd>
            </div>
          </dl>
          {snapshot.invoiceCode ? (
            <p className="mt-10 text-xs text-white/65">Invoice {snapshot.invoiceCode}</p>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
