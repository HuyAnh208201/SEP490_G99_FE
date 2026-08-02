import Modal from '../../../components/ui/Modal.jsx';
import PosProductImage from './PosProductImage.jsx';
import { categoryAccent } from '../categoryAccent.js';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** Info-only product sheet — add-to-cart stays on the card "+" button. */
export default function ProductInfoPopup({ open, product, onClose }) {
  if (!product) return null;

  const accent = categoryAccent(product.category);
  const rows = [
    { label: 'Barcode', value: product.barcode || '—' },
    { label: 'Category', value: product.category || '—' },
    { label: 'Unit', value: product.unit || '—' },
    { label: 'Stock', value: String(product.stock ?? 0) },
    { label: 'MFG (NSX)', value: formatDate(product.manufacturedAt) },
    { label: 'EXP (HSD)', value: formatDate(product.expiryDate) },
  ];

  return (
    <Modal open={open} onClose={onClose} title={product.name} size="sm">
      <div className="space-y-4">
        <PosProductImage
          src={product.imageUrl}
          name={product.name}
          accent={accent}
          className="h-36 w-full rounded-xl border border-[var(--admin-border)]"
        />

        <dl className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
                {row.label}
              </dt>
              <dd className="mt-0.5 truncate font-semibold text-[var(--admin-text)]">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
            Description
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--admin-muted)]">
            {product.description?.trim() || 'No description available.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-[var(--admin-brand)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)]"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
