import Modal from '../../../components/ui/Modal.jsx';

const STEPS = [
  'Open your assigned shift before selling.',
  'Search, scan, or tap + to add products to the cart.',
  'Optional: type or scan the customer phone QR to redeem or earn loyalty points.',
  'Press Checkout to open the Payment screen (Cash or PayOS).',
  'End shift from the header when you finish.',
];

const SHORTCUTS = [
  { keys: 'F1', action: 'Open this help guide' },
  { keys: 'F2', action: 'Open barcode scanner' },
  { keys: 'F3', action: 'Focus product search' },
  { keys: 'F4', action: 'Checkout / confirm payment' },
  { keys: 'F9', action: 'Focus customer phone / loyalty attach' },
  { keys: 'Esc', action: 'Close dialogs or go back' },
  { keys: '↑ / ↓', action: 'Select cart line' },
  { keys: '+ / −', action: 'Change quantity of selected line' },
  { keys: 'Delete', action: 'Remove selected cart line' },
  { keys: '1 / 2', action: 'Payment: Cash / PayOS tab' },
];

export default function PosHelpDialog({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="POS quick guide"
      description="Short reference for cashiers. Press F1 anytime to open this panel."
      size="md"
    >
      <div className="space-y-5">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
            Sales flow
          </h3>
          <ol className="mt-2 space-y-2">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-[var(--admin-text)]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0058be]/10 text-[11px] font-bold text-[var(--admin-brand)]">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
            Keyboard shortcuts
          </h3>
          <div className="mt-2 overflow-hidden rounded-xl border border-[var(--admin-border)]">
            <div className="grid grid-cols-[110px_minmax(0,1fr)] border-b border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
              <span>Key</span>
              <span>Action</span>
            </div>
            <ul>
              {SHORTCUTS.map((row) => (
                <li
                  key={row.keys}
                  className="grid grid-cols-[110px_minmax(0,1fr)] border-b border-[var(--admin-border)] px-3 py-2.5 text-sm last:border-0"
                >
                  <kbd className="inline-flex h-7 w-fit min-w-[2.5rem] items-center justify-center rounded-md border border-[var(--admin-border)] bg-white px-2 font-mono text-[11px] font-bold text-[var(--admin-brand)]">
                    {row.keys}
                  </kbd>
                  <span className="self-center text-[var(--admin-muted)]">{row.action}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-2 text-xs text-[var(--admin-subtle)]">
            Shortcuts are ignored while you are typing in an input field (except Esc and F1).
          </p>
        </section>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-[var(--admin-brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)]"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}
