/**
 * Horizontal pill/chip status filter bar.
 * Active pill uses brand fill; inactive pills are bordered.
 */
export default function StatusFilterBar({ options, value, onChange, ariaLabel = 'Filter by status' }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap items-center gap-1.5"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value || '__all__'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={[
              'rounded-full px-3 py-1.5 text-xs font-medium transition',
              active
                ? 'bg-[var(--admin-brand)] text-white shadow-sm'
                : 'border border-[var(--admin-border)] bg-white text-[var(--admin-text)] hover:border-[var(--admin-brand)]/40 hover:bg-[#f7f9fb]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
