import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import { formatVnd } from '../../../lib/money.js';
import { unitPrice } from '../posProduct.js';

function clampQty(value, maxStock) {
  const n = Number.parseInt(String(value).replace(/\D/g, ''), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  if (maxStock > 0) return Math.min(n, maxStock);
  return n;
}

export default function ProductQtyPopup({ open, product, onClose, onConfirm }) {
  const [qty, setQty] = useState(1);
  const [qtyText, setQtyText] = useState('1');

  useEffect(() => {
    if (open) {
      setQty(1);
      setQtyText('1');
    }
  }, [open, product?.id]);

  if (!product) return null;

  const price = unitPrice(product);
  const stock = Number(product.stock);
  const maxStock = Number.isFinite(stock) && stock > 0 ? stock : 0;
  const canConfirm = maxStock > 0 && qty >= 1 && qty <= maxStock;
  const subtotal = price * qty;

  function applyQty(next) {
    const clamped = clampQty(next, maxStock);
    setQty(clamped);
    setQtyText(String(clamped));
  }

  return (
    <Modal open={open} onClose={onClose} title={product.name} size="sm">
      <p className="text-sm text-[var(--admin-muted)]">
        {product.code} · {product.category}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-3 text-sm">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
            Unit price
          </p>
          {product.promoPrice != null && (
            <p className="text-xs text-[var(--admin-subtle)] line-through">
              {formatVnd(product.price)}
            </p>
          )}
          <p className="font-semibold text-[var(--admin-brand)]">{formatVnd(price)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
            In stock
          </p>
          <p className="font-semibold">{product.stock}</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
          Quantity
        </p>
        <div className="inline-flex items-center overflow-hidden rounded-lg border border-[var(--admin-border)]">
          <button
            type="button"
            onClick={() => applyQty(qty - 1)}
            className="h-11 w-11 bg-[#f7f9fb] text-lg hover:bg-[#eef3f8]"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={qtyText}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, '');
              setQtyText(raw);
              if (raw !== '') {
                setQty(clampQty(raw, maxStock));
              }
            }}
            onBlur={() => applyQty(qtyText === '' ? 1 : qtyText)}
            className="h-11 w-16 border-x border-[var(--admin-border)] bg-white text-center text-lg font-bold outline-none"
            aria-label="Quantity"
          />
          <button
            type="button"
            disabled={maxStock > 0 && qty >= maxStock}
            onClick={() => applyQty(qty + 1)}
            className="h-11 w-11 bg-[#f7f9fb] text-lg hover:bg-[#eef3f8] disabled:opacity-40"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        {maxStock <= 0 && (
          <p className="mt-2 text-xs text-[var(--admin-danger)]">This product is out of stock.</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-[var(--admin-muted)]">Subtotal</span>
        <span className="text-base font-bold text-[var(--admin-text)]">{formatVnd(subtotal)}</span>
      </div>

      <button
        type="button"
        disabled={!canConfirm}
        onClick={() => {
          const finalQty = clampQty(qtyText === '' ? qty : qtyText, maxStock);
          onConfirm?.(product, finalQty);
        }}
        className="mt-5 w-full rounded-lg bg-[var(--admin-brand)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Confirm
      </button>
    </Modal>
  );
}
