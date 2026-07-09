export default function Modal({ open, onClose, title, description, children, size = 'md', footer }) {
  if (!open) return null;

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-5xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
        className={`relative flex max-h-[min(92vh,900px)] w-full flex-col ${widths[size] || widths.md} rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-elevated)]`}
      >
        <div className="shrink-0 border-b border-[var(--admin-border)] px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-[var(--admin-text)]">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p>
              )}
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
}
