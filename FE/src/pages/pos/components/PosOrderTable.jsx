import { useState } from 'react';
import { formatVnd } from '../../../lib/money.js';
import ConfirmDialog from './ConfirmDialog.jsx';

function QuantityControl({ line, onChange }) {
  const atStockLimit = Number(line.stock) > 0 && line.qty >= Number(line.stock);

  return (
    <div
      className="inline-flex h-9 items-center overflow-hidden rounded-lg border border-[var(--admin-border)] bg-white"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onChange(line, line.qty - 1)}
        className="h-full w-9 text-lg text-[var(--admin-muted)] transition hover:bg-[#f0f4f8]"
        aria-label={`Decrease ${line.name}`}
      >
        −
      </button>
      <span className="flex h-full min-w-11 items-center justify-center border-x border-[var(--admin-border)] px-2 text-sm font-bold tabular-nums">
        {line.qty}
      </span>
      <button
        type="button"
        disabled={atStockLimit}
        onClick={() => onChange(line, line.qty + 1)}
        className="h-full w-9 text-lg text-[var(--admin-brand)] transition hover:bg-[#f0f4f8] disabled:cursor-not-allowed disabled:opacity-35"
        aria-label={`Increase ${line.name}`}
      >
        +
      </button>
    </div>
  );
}

export default function PosOrderTable({
  lines,
  editable = false,
  updateQty,
  removeLine,
  selectedKey,
  onSelectLine,
}) {
  const [removeTarget, setRemoveTarget] = useState(null);

  function requestQtyChange(line, nextQty) {
    if (nextQty <= 0) {
      setRemoveTarget(line);
      return;
    }
    updateQty(line.key, nextQty);
  }

  function rowProps(line) {
    if (!editable) return {};
    return {
      role: 'button',
      tabIndex: 0,
      onClick: () => onSelectLine?.(line.key),
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelectLine?.(line.key);
        }
      },
    };
  }

  return (
    <>
      <ul className="divide-y divide-[var(--admin-border)] lg:hidden">
        {lines.map((line, index) => {
          const selected = editable && selectedKey === line.key;
          return (
            <li
              key={line.key}
              {...rowProps(line)}
              className={`px-4 py-3 outline-none transition ${selected ? 'bg-[#0058be]/5 ring-2 ring-inset ring-[var(--admin-brand)]' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--admin-text)]">
                    <span className="text-[var(--admin-subtle)]">{index + 1}. </span>
                    {line.name}
                    {line.hasPromo ? (
                      <span className="ml-2 rounded border border-[var(--admin-brand)]/30 bg-[#0058be]/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--admin-brand)]">Promo</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--admin-subtle)]">{line.barcode || line.code}</p>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">{formatVnd(line.unitPrice)} / {line.unit || 'item'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold">{formatVnd(line.unitPrice * line.qty)}</p>
                  {editable ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setRemoveTarget(line);
                      }}
                      className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--admin-danger)] hover:bg-[var(--admin-danger-bg)]"
                      aria-label={`Remove ${line.name}`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-2">
                {editable ? (
                  <QuantityControl line={line} onChange={requestQtyChange} />
                ) : (
                  <span className="text-xs text-[var(--admin-muted)]">Quantity: {line.qty}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden min-w-0 lg:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-[var(--admin-border)] bg-[#f7f9fb] text-[11px] font-bold uppercase tracking-wide text-[var(--admin-muted)]">
            <tr>
              <th className="w-12 px-3 py-3 text-center">No</th>
              <th className="px-3 py-3">Product</th>
              <th className="w-36 px-3 py-3 text-right">Unit price</th>
              <th className="w-40 px-3 py-3 text-center">Quantity</th>
              <th className="w-36 px-3 py-3 text-right">Line total</th>
              {editable ? <th className="w-14 px-3 py-3 text-center">Del</th> : null}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const selected = editable && selectedKey === line.key;
              return (
                <tr
                  key={line.key}
                  {...rowProps(line)}
                  className={`border-b border-[var(--admin-border)] outline-none transition last:border-0 ${selected ? 'bg-[#0058be]/5 ring-2 ring-inset ring-[var(--admin-brand)]' : 'hover:bg-[#f9fbfd]'}`}
                >
                  <td className="px-3 py-3 text-center text-[var(--admin-subtle)]">{index + 1}</td>
                  <td className="min-w-0 px-3 py-3">
                    <p className="truncate font-semibold text-[var(--admin-text)]">
                      {line.name}
                      {line.hasPromo ? (
                        <span className="ml-2 rounded border border-[var(--admin-brand)]/30 bg-[#0058be]/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--admin-brand)]">Promo</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--admin-subtle)]">
                      {line.barcode || line.code} · {line.unit || 'item'} · Stock {line.stock}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {line.hasPromo ? <div className="text-[11px] text-[var(--admin-subtle)] line-through">{formatVnd(line.unitOriginal)}</div> : null}
                    <span className="font-medium">{formatVnd(line.unitPrice)}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {editable ? <QuantityControl line={line} onChange={requestQtyChange} /> : line.qty}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-[var(--admin-brand)]">{formatVnd(line.unitPrice * line.qty)}</td>
                  {editable ? (
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setRemoveTarget(line);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--admin-danger)] hover:bg-[var(--admin-danger-bg)]"
                        aria-label={`Remove ${line.name}`}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!lines.length ? (
        <div className="flex min-h-60 flex-col items-center justify-center px-4 text-center text-[var(--admin-subtle)]">
          <svg viewBox="0 0 24 24" className="mb-3 h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9.5 5 4h14l2 5.5M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5ZM9 14h6" />
          </svg>
          <p className="font-semibold text-[var(--admin-text)]">No products in cart</p>
          <p className="mt-1 text-xs">Scan a barcode or search above to add products.</p>
        </div>
      ) : null}

      {editable ? (
        <ConfirmDialog
          open={Boolean(removeTarget)}
          onClose={() => setRemoveTarget(null)}
          title="Remove product"
          message={removeTarget ? `Remove "${removeTarget.name}" from the cart?` : ''}
          confirmLabel="Remove"
          danger
          onConfirm={() => {
            if (removeTarget) removeLine(removeTarget.key);
            setRemoveTarget(null);
          }}
        />
      ) : null}
    </>
  );
}
