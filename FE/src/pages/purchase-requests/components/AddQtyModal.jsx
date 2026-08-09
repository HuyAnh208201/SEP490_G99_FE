import { useEffect, useRef, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import { purchaseUnitLabel } from '../../../constants/productUnits.js';

/**
 * Compact confirmation popup shown when adding a product to a purchase
 * request. Requires the user to confirm a quantity (default 1) instead of
 * silently adding — quantity is expressed in the product's TOP / import
 * packaging unit (e.g. "Case of 24"), never the base retail unit.
 */
export default function AddQtyModal({ open, product, defaultQty = 1, onConfirm, onCancel }) {
  const [qty, setQty] = useState(String(defaultQty));
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQty(String(defaultQty || 1));
      // Focus + select so the user can just type a new number immediately.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, defaultQty, product]);

  if (!open || !product) return null;

  const topLabel = product.topPackagingLabel || purchaseUnitLabel(product.importUnit || product.unit);
  const numericQty = Number(qty);
  const isValid = Number.isFinite(numericQty) && numericQty > 0 && Number.isInteger(numericQty);

  function confirm() {
    if (!isValid) return;
    onConfirm?.(numericQty);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirm();
    }
  }

  return (
    <Modal open={open} onClose={onCancel} title="Add to request" size="sm" layer={60}>
      <div className="space-y-4">
        <div>
          <p className="font-medium text-[var(--admin-text)]">{product.name}</p>
          {product.code && (
            <p className="font-mono text-xs text-[var(--admin-subtle)]">{product.code}</p>
          )}
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Quantity ({topLabel})
          </span>
          <input
            ref={inputRef}
            type="number"
            min={1}
            step={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
          />
          {!isValid && (
            <span className="block text-xs text-red-600">Enter a whole number greater than zero.</span>
          )}
        </label>

        <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!isValid} onClick={confirm}>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}
