import { useEffect, useState } from 'react';
import { formatVnd } from '../../../lib/money.js';
import ConfirmDialog from './ConfirmDialog.jsx';

const unitLabels = {
  bottle: 'Bottle',
  can: 'Can',
  pack: 'Pack',
  box: 'Box',
  piece: 'Piece',
};

function PencilIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 20h4L18 10l-4-4L4 16v4Z" strokeLinejoin="round" />
      <path d="m12 6 4 4" strokeLinecap="round" />
    </svg>
  );
}

export default function PosOrderTable({
  lines,
  editable = false,
  updateQty,
  removeLine,
}) {
  const [editingKey, setEditingKey] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (!editingKey) return undefined;

    function handlePointerDown(event) {
      const onActiveStepper = event.target.closest(`[data-qty-edit="${editingKey}"]`);
      const onAnyPencil = event.target.closest('[data-qty-pencil]');
      if (onActiveStepper || onAnyPencil) return;
      setEditingKey(null);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [editingKey]);

  function requestRemove(line) {
    setConfirm({
      type: 'remove',
      line,
      title: 'Remove product',
      message: `Remove "${line.name}" from the cart?`,
      confirmLabel: 'Remove',
    });
  }

  function requestQtyChange(line, nextQty) {
    if (nextQty <= 0) {
      setConfirm({
        type: 'remove',
        line,
        title: 'Remove product',
        message: `Quantity is 0. Remove "${line.name}" from the cart?`,
        confirmLabel: 'Remove',
      });
      return;
    }
    updateQty(line.key, nextQty);
  }

  return (
    <>
      {/* Mobile: mỗi dòng thành một thẻ — bảng 9 cột không đọc được trên màn nhỏ */}
      <ul className="divide-y divide-[var(--admin-border)] lg:hidden">
        {lines.map((line, index) => (
          <li key={line.key} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--admin-text)]">
                  <span className="text-[var(--admin-subtle)]">{index + 1}. </span>
                  {line.name}
                  {line.hasPromo && (
                    <span className="ml-2 rounded border border-[var(--admin-brand)]/30 bg-[#0058be]/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--admin-brand)]">
                      Promo
                    </span>
                  )}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[var(--admin-subtle)]">
                  {line.barcode}
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {formatVnd(line.unitPrice)} / {unitLabels[line.unit] ?? line.unit}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-[var(--admin-text)]">
                  {formatVnd(line.unitPrice * line.qty)}
                </p>
                {editable && (
                  <button
                    type="button"
                    onClick={() => requestRemove(line)}
                    className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--admin-subtle)] transition hover:bg-[var(--admin-danger-bg)] hover:text-[var(--admin-danger)]"
                    aria-label={`Remove ${line.name}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {editable ? (
              <div className="mt-2 inline-flex items-center overflow-hidden rounded-lg border border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => requestQtyChange(line, line.qty - 1)}
                  className="h-10 w-11 bg-[#f7f9fb] text-lg hover:bg-[#eef3f8]"
                  aria-label={`Decrease ${line.name}`}
                >
                  −
                </button>
                <span className="flex h-10 min-w-12 items-center justify-center border-x border-[var(--admin-border)] bg-white font-semibold">
                  {line.qty}
                </span>
                <button
                  type="button"
                  onClick={() => requestQtyChange(line, line.qty + 1)}
                  className="h-10 w-11 bg-[#f7f9fb] text-lg hover:bg-[#eef3f8]"
                  aria-label={`Increase ${line.name}`}
                >
                  +
                </button>
              </div>
            ) : (
              <p className="mt-1 text-xs text-[var(--admin-muted)]">Số lượng: {line.qty}</p>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-y border-[var(--admin-border)] bg-[#f7f9fb] text-[11px] font-bold uppercase tracking-wide text-[var(--admin-muted)]">
            <tr>
              <th className="w-12 px-3 py-3 text-center">No</th>
              <th className="px-3 py-3">Barcode</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Product name</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3 text-center">Quantity</th>
              <th className="px-3 py-3 text-right">Unit price</th>
              <th className="px-3 py-3 text-right">Total price</th>
              {editable && <th className="w-14 px-3 py-3 text-center">Del</th>}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const isEditing = editable && editingKey === line.key;
              return (
                <tr key={line.key} className="border-b border-[var(--admin-border)] last:border-0">
                  <td className="px-3 py-3 text-center text-[var(--admin-subtle)]">{index + 1}</td>
                  <td className="px-3 py-3 font-mono text-xs text-[var(--admin-subtle)]">
                    {line.barcode}
                  </td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">
                    {line.category || '—'}
                  </td>
                  <td className="min-w-[220px] px-3 py-3 font-medium text-[var(--admin-text)]">
                    <span>{line.name}</span>
                    {line.hasPromo && (
                      <span className="ml-2 rounded border border-[var(--admin-brand)]/30 bg-[#0058be]/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--admin-brand)]">
                        Promo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">
                    {unitLabels[line.unit] ?? line.unit}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {editable ? (
                      isEditing ? (
                        <div
                          data-qty-edit={line.key}
                          className="inline-flex items-center overflow-hidden rounded-lg border border-[var(--admin-border)]"
                        >
                          <button
                            type="button"
                            onClick={() => requestQtyChange(line, line.qty - 1)}
                            className="h-8 w-8 bg-[#f7f9fb] text-base hover:bg-[#eef3f8]"
                            aria-label={`Decrease ${line.name}`}
                          >
                            −
                          </button>
                          <span className="flex h-8 min-w-9 items-center justify-center border-x border-[var(--admin-border)] bg-white font-semibold">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => requestQtyChange(line, line.qty + 1)}
                            className="h-8 w-8 bg-[#f7f9fb] text-base hover:bg-[#eef3f8]"
                            aria-label={`Increase ${line.name}`}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          data-qty-pencil={line.key}
                          onClick={() => setEditingKey(line.key)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-[var(--admin-text)] transition hover:bg-[#f7f9fb]"
                          aria-label={`Edit quantity for ${line.name}`}
                        >
                          {line.qty}
                          <span className="text-[var(--admin-subtle)]">
                            <PencilIcon />
                          </span>
                        </button>
                      )
                    ) : (
                      line.qty
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {line.hasPromo && (
                      <div className="text-[11px] text-[var(--admin-subtle)] line-through">
                        {formatVnd(line.unitOriginal)}
                      </div>
                    )}
                    <span className="font-medium">{formatVnd(line.unitPrice)}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {formatVnd(line.unitPrice * line.qty)}
                  </td>
                  {editable && (
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => requestRemove(line)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--admin-subtle)] transition hover:bg-[var(--admin-danger-bg)] hover:text-[var(--admin-danger)]"
                        aria-label={`Remove ${line.name}`}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ngoài khối bảng để mobile (bảng bị ẩn) vẫn thấy trạng thái giỏ rỗng */}
      {!lines.length && (
        <div className="flex min-h-48 flex-col items-center justify-center px-4 text-center text-[var(--admin-subtle)]">
          <svg viewBox="0 0 24 24" className="mb-3 h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9.5 5 4h14l2 5.5M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5ZM9 14h6" />
          </svg>
          <p className="font-medium">No products in cart</p>
          <p className="mt-1 text-xs">Scan a barcode or search to add products.</p>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger
        onConfirm={() => {
          if (confirm?.type === 'remove' && confirm.line) {
            removeLine(confirm.line.key);
            setEditingKey(null);
          }
        }}
      />
    </>
  );
}
