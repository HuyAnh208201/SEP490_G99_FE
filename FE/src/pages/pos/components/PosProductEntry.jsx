import { formatVnd } from '../../../lib/money.js';

export default function PosProductEntry({
  query,
  onQueryChange,
  onSubmit,
  results,
  loading,
  error,
  message,
  onSelect,
  onScan,
  relayMode,
  onRelayModeChange,
  inputRef,
}) {
  const hasQuery = query.trim().length >= 2;

  return (
    <section className="relative z-20 shrink-0 rounded-2xl border border-[var(--admin-border)] bg-white p-3 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <form onSubmit={onSubmit} className="relative min-w-0 flex-1">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-subtle)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Scan or search by product name, SKU, or barcode"
            role="combobox"
            aria-expanded={hasQuery}
            aria-controls="pos-product-results"
            aria-autocomplete="list"
            className="w-full rounded-xl border border-[var(--admin-border)] bg-[#fbfcfe] py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--admin-brand)] focus:bg-white focus:ring-2 focus:ring-[#0058be]/15"
          />

          {hasQuery ? (
            <div
              id="pos-product-results"
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-80 overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-white p-1.5 shadow-[var(--shadow-elevated)]"
            >
              {loading ? (
                <p className="px-3 py-4 text-sm text-[var(--admin-subtle)]">Searching products...</p>
              ) : error ? (
                <p className="rounded-lg bg-[var(--admin-danger-bg)] px-3 py-3 text-sm text-[var(--admin-danger)]">
                  {error}
                </p>
              ) : results.length ? (
                results.map((product) => {
                  const soldOut = Number(product.stock) <= 0;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      role="option"
                      aria-selected="false"
                      disabled={soldOut}
                      onClick={() => onSelect(product)}
                      className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition hover:bg-[#f0f4f8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[var(--admin-text)]">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[var(--admin-subtle)]">
                          {product.code} · {product.barcode || 'No barcode'} · Stock {product.stock}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-[var(--admin-brand)]">
                        {formatVnd(product.promoPrice ?? product.price)}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-sm text-[var(--admin-subtle)]">No matching products.</p>
              )}
            </div>
          ) : null}
        </form>

        <button
          type="button"
          onClick={onScan}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--admin-brand)] px-4 text-sm font-bold text-white transition hover:bg-[var(--admin-brand-hover)]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 7V5a1 1 0 0 1 1-1h2M21 7V5a1 1 0 0 0-1-1h-2M3 17v2a1 1 0 0 0 1 1h2M21 17v2a1 1 0 0 1-1 1h-2M7 8v8M11 8v8M15 8v8M18 8v8" strokeLinecap="round" />
          </svg>
          Scan
        </button>

        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--admin-border)] px-3 text-xs font-semibold text-[var(--admin-muted)]">
          <input
            type="checkbox"
            checked={relayMode}
            onChange={(event) => onRelayModeChange(event.target.checked)}
            className="h-4 w-4 accent-[var(--admin-brand)]"
          />
          Phone scanner relay
        </label>
      </div>

      {message ? (
        <p
          aria-live="polite"
          className={`mt-3 rounded-xl px-4 py-3 text-base font-bold leading-snug ${
            /not found|could not|unable|invalid|error|fail/i.test(message)
              ? 'border border-red-200 bg-red-50 text-red-800'
              : 'border border-[#0058be]/25 bg-[#e8f1fb] text-[#0058be]'
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
