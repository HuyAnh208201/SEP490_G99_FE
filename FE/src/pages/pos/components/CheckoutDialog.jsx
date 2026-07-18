import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/ui/Modal.jsx';
import { formatVnd } from '../../../lib/money.js';
import { usePosCart } from '../../../contexts/PosCartContext.jsx';

const METHODS = [
  {
    id: 'cash',
    title: 'Cash',
    description: 'Physical cash',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7 9h.01M17 15h.01" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'payos',
    title: 'PayOS',
    description: 'QR scan',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-6v-2M14 18h2" />
      </svg>
    ),
  },
];

export default function CheckoutDialog({ open, onClose }) {
  const navigate = useNavigate();
  const { totals, setPaymentOpen } = usePosCart();
  const [method, setMethod] = useState(null);

  function close() {
    setMethod(null);
    onClose();
  }

  function confirm() {
    if (!method) return;
    setPaymentOpen(false);
    navigate(`/pos/payment/${method}`);
  }

  return (
    <Modal open={open} onClose={close} title="Checkout" size="sm">
      <div className="space-y-5">
        <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] px-4 py-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
            Total amount due
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--admin-brand)]">
            {formatVnd(totals.total)}
          </p>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
            Select payment method
          </p>
          <div className="grid grid-cols-2 gap-3">
            {METHODS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMethod(item.id)}
                className={`flex min-h-28 flex-col items-center justify-center rounded-xl border p-4 transition ${
                  method === item.id
                    ? 'border-[var(--admin-brand)] bg-[#0058be]/5 text-[var(--admin-brand)] ring-2 ring-[#0058be]/15'
                    : 'border-[var(--admin-border)] bg-white text-[var(--admin-text)] hover:border-[#0058be]/40 hover:bg-[#f7f9fb]'
                }`}
              >
                {item.icon}
                <span className="mt-2 text-sm font-bold">{item.title}</span>
                <span className="mt-0.5 text-xs text-[var(--admin-subtle)]">{item.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-muted)] transition hover:bg-[#f7f9fb]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!method}
            onClick={confirm}
            className="rounded-lg bg-[var(--admin-brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Confirm Payment
          </button>
        </div>
      </div>
    </Modal>
  );
}
