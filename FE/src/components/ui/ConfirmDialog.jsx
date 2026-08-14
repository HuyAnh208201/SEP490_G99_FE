import Modal from './Modal.jsx';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  layer = 60,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" layer={layer}>
      <p className="text-sm text-[var(--admin-muted)] whitespace-pre-line">{message}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-muted)] transition hover:bg-[#f7f9fb]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm?.();
            onClose?.();
          }}
          className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${
            danger
              ? 'bg-[var(--admin-danger)] hover:opacity-90'
              : 'bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-hover)]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
