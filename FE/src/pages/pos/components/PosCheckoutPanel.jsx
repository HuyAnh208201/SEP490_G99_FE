import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatMoneyInput, formatVnd, parseMoneyInput } from '../../../lib/money.js';
import { isTypingTarget } from '../posHotkeys.js';
import Modal from '../../../components/ui/Modal.jsx';

const METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'payos', label: 'PayOS' },
];

export default function PosCheckoutPanel({
  open,
  onOpenChange,
  lines,
  totals,
  initialMethod = 'cash',
  reviewOpen,
  onRequestReview,
}) {
  const [method, setMethod] = useState(initialMethod === 'payos' ? 'payos' : 'cash');
  const [receivedRaw, setReceivedRaw] = useState('');
  const [cashError, setCashError] = useState('');
  const received = parseMoneyInput(receivedRaw) ?? 0;
  const change = Math.max(0, received - totals.total);

  const quickAmounts = useMemo(() => {
    const rounded = Math.ceil(totals.total / 50000) * 50000;
    return [...new Set([totals.total, rounded, 200000, 500000])]
      .filter((amount) => amount >= totals.total)
      .slice(0, 4);
  }, [totals.total]);

  useEffect(() => {
    if (!open) return;
    setMethod(initialMethod === 'payos' ? 'payos' : 'cash');
  }, [initialMethod, open]);

  useEffect(() => {
    if (open) return;
    setReceivedRaw('');
    setCashError('');
  }, [open]);

  const requestReview = useCallback(() => {
    if (!lines.length) return;
    if (method === 'cash') {
      const parsed = parseMoneyInput(receivedRaw);
      if (parsed == null || !Number.isFinite(parsed) || parsed < 0) {
        setCashError('Enter a valid cash received amount.');
        return;
      }
      if (parsed < totals.total) {
        setCashError('Cash received is less than the amount due.');
        return;
      }
      setCashError('');
      onRequestReview({ method, receivedAmount: parsed, change: parsed - totals.total });
      return;
    }
    onRequestReview({ method, receivedAmount: null, change: null });
  }, [lines.length, method, onRequestReview, receivedRaw, totals.total]);

  useEffect(() => {
    function onKeyDown(event) {
      if (reviewOpen) return;
      if (event.key === 'F4') {
        event.preventDefault();
        if (!lines.length) return;
        if (!open) onOpenChange(true);
        else requestReview();
        return;
      }
      if (!open || isTypingTarget(event.target)) return;
      if (event.key === '1' || event.key === '2') {
        event.preventDefault();
        setMethod(event.key === '2' ? 'payos' : 'cash');
        setCashError('');
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lines.length, onOpenChange, open, requestReview, reviewOpen]);

  return (
    <>
      <button
        type="button"
        disabled={!lines.length}
        onClick={() => onOpenChange(true)}
        className="flex min-h-12 w-full items-center justify-between rounded-xl bg-[var(--admin-brand)] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span>Checkout</span>
        <span>{formatVnd(totals.total)}</span>
      </button>

      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        title="Payment"
        size="lg"
        layer={60}
        footer={(
          <div className="flex w-full flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3 text-sm font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              disabled={method === 'cash' && (!receivedRaw || received < totals.total)}
              onClick={requestReview}
              className="min-h-14 min-w-[16rem] rounded-xl bg-[var(--admin-brand)] px-6 text-lg font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Review payment
            </button>
          </div>
        )}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {METHODS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMethod(item.id);
                  setCashError('');
                }}
                className={`rounded-2xl border px-4 py-4 text-lg font-extrabold transition ${
                  method === item.id
                    ? 'border-[var(--admin-brand)] bg-[var(--admin-brand)] text-white'
                    : 'border-[var(--admin-border)] bg-white text-[var(--admin-text)] hover:border-[#0058be]/40'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={`grid gap-3 ${method === 'cash' ? 'sm:grid-cols-3' : 'grid-cols-1'}`}>
            <AmountCard label="Due" value={formatVnd(totals.total)} emphasis />
            {method === 'cash' ? (
              <>
                <AmountCard label="Received" value={receivedRaw ? formatVnd(received) : '—'} />
                <AmountCard
                  label="Change"
                  value={receivedRaw ? formatVnd(change) : '—'}
                  success={received >= totals.total && Boolean(receivedRaw)}
                />
              </>
            ) : null}
          </div>

          {method === 'cash' ? (
            <>
              <div className="relative">
                <input
                  autoFocus
                  inputMode="numeric"
                  value={receivedRaw}
                  onChange={(event) => {
                    const parsed = parseMoneyInput(event.target.value);
                    setReceivedRaw(parsed == null ? event.target.value.replace(/[^\d]/g, '') : formatMoneyInput(parsed));
                    setCashError('');
                  }}
                  placeholder="Cash received"
                  className="w-full rounded-2xl border border-[var(--admin-border)] bg-white py-4 pl-4 pr-16 text-3xl font-extrabold tabular-nums outline-none focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-[var(--admin-muted)]">
                  VND
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setReceivedRaw(formatMoneyInput(amount));
                      setCashError('');
                    }}
                    className="rounded-xl border border-[var(--admin-border)] bg-white px-3 py-3 text-base font-extrabold text-[var(--admin-text)] transition hover:border-[#0058be]/40 hover:text-[var(--admin-brand)]"
                  >
                    {formatVnd(amount)}
                  </button>
                ))}
              </div>
              {cashError ? <p className="text-base font-semibold text-[var(--admin-danger)]">{cashError}</p> : null}
            </>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

function AmountCard({ label, value, emphasis, success }) {
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white px-4 py-4">
      <p className="text-sm font-bold uppercase tracking-wide text-[var(--admin-subtle)]">{label}</p>
      <p
        className={`mt-1 break-all text-3xl font-extrabold tabular-nums ${
          emphasis ? 'text-[var(--admin-brand)]' : success ? 'text-[var(--admin-success)]' : 'text-[var(--admin-text)]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
