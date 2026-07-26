const PAGE_SIZES = [10, 20, 50, 100];

function visiblePages(page, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export default function Pagination({
  page = 1,
  size = 20,
  totalRecords = 0,
  totalPages = 0,
  onPageChange,
  onSizeChange,
  disabled = false,
  className = '',
}) {
  const safeTotalPages = Math.max(0, Number(totalPages) || 0);
  const safePage = safeTotalPages ? Math.min(Math.max(1, page), safeTotalPages) : 1;
  const start = totalRecords ? (safePage - 1) * size + 1 : 0;
  const end = Math.min(safePage * size, totalRecords);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] px-4 py-3 text-sm ${className}`}>
      <div className="flex items-center gap-3 text-[var(--admin-muted)]">
        <span>{start}–{end} of {totalRecords}</span>
        <label className="flex items-center gap-2">
          <span className="hidden sm:inline">Rows</span>
          <select
            value={size}
            disabled={disabled}
            onChange={(event) => onSizeChange?.(Number(event.target.value))}
            className="rounded-lg border border-[var(--admin-border)] bg-white px-2 py-1.5 outline-none focus:border-[var(--admin-brand)]"
          >
            {PAGE_SIZES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange?.(safePage - 1)}
          className="h-8 min-w-8 rounded-lg border border-[var(--admin-border)] px-2 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          ‹
        </button>
        {visiblePages(safePage, safeTotalPages).map((number) => (
          <button
            key={number}
            type="button"
            disabled={disabled}
            onClick={() => onPageChange?.(number)}
            aria-current={number === safePage ? 'page' : undefined}
            className={`h-8 min-w-8 rounded-lg px-2 font-semibold ${
              number === safePage
                ? 'bg-[var(--admin-brand)] text-white'
                : 'border border-[var(--admin-border)] bg-white text-[var(--admin-muted)]'
            }`}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled || safeTotalPages === 0 || safePage >= safeTotalPages}
          onClick={() => onPageChange?.(safePage + 1)}
          className="h-8 min-w-8 rounded-lg border border-[var(--admin-border)] px-2 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          ›
        </button>
      </nav>
    </div>
  );
}
