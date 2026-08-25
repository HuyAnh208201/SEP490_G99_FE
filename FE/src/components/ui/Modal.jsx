import { createPortal } from 'react-dom';

const LAYER_CLASS = {
  50: 'z-50',
  60: 'z-[60]',
  70: 'z-[70]',
};

export default function Modal({
  open,
  onClose,
  title,
  description: _description,
  children,
  size = 'md',
  footer,
  layer = 50,
}) {
  if (!open) return null;

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-5xl',
    full: 'max-w-[min(1200px,calc(100vw-2rem))]',
    viewport: 'max-w-[min(1440px,calc(100vw-1.5rem))]',
  };

  const heightClass =
    size === 'viewport'
      ? 'max-h-[min(94vh,960px)]'
      : 'max-h-[min(92vh,900px)]';

  const zClass = LAYER_CLASS[layer] || LAYER_CLASS[50];

  const node = (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#191c1e]/40 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`relative flex ${heightClass} w-full flex-col ${widths[size] || widths.md} rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-elevated)]`}
      >
        <div className="shrink-0 border-b border-[var(--admin-border)] px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-[var(--admin-text)]">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--admin-subtle)] transition hover:bg-[#f7f9fb] hover:text-[var(--admin-text)]"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-[var(--admin-border)] px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
