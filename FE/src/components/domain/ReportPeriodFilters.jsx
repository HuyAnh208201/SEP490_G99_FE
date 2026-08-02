import {
  formatPeriodLabel,
  parseDateInput,
  quarterBounds,
  rangeForPeriod,
  shiftAnchor,
} from '../../lib/reportPeriods.js';

const inputClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

const PERIODS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'custom', label: 'Custom' },
];

/**
 * Shared week / month (prev-next) + custom (incl. quarter presets) filter bar.
 */
export default function ReportPeriodFilters({
  period,
  anchorDate,
  from,
  to,
  onPeriodChange,
  onAnchorChange,
  onFromChange,
  onToChange,
  onApply,
  branchId,
  onBranchChange,
  branches,
  isChainScope,
  extraFilters,
  applyLabel = 'Apply',
}) {
  const label = formatPeriodLabel(period, from, to, anchorDate);

  function selectPeriod(next) {
    onPeriodChange(next);
    if (next === 'week' || next === 'month') {
      const anchor = anchorDate || new Date();
      const range = rangeForPeriod(next, anchor);
      if (range) {
        onFromChange(range.from);
        onToChange(range.to);
        onApply?.(range.from, range.to);
      }
    }
  }

  function step(delta) {
    if (period !== 'week' && period !== 'month') return;
    const nextAnchor = shiftAnchor(period, anchorDate || parseDateInput(from), delta);
    onAnchorChange?.(nextAnchor);
    const range = rangeForPeriod(period, nextAnchor);
    if (range) {
      onFromChange(range.from);
      onToChange(range.to);
      onApply?.(range.from, range.to);
    }
  }

  function applyQuarter(q) {
    const year = (anchorDate || new Date()).getFullYear();
    const bounds = quarterBounds(year, q);
    onPeriodChange('custom');
    onFromChange(bounds.from);
    onToChange(bounds.to);
    onApply?.(bounds.from, bounds.to);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => selectPeriod(p.key)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                period === p.key
                  ? 'border-[var(--admin-brand)] bg-[var(--admin-brand)] text-white'
                  : 'border-[var(--admin-border)] bg-white text-[var(--admin-muted)] hover:bg-[#f0f4f8]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {(period === 'week' || period === 'month') && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold text-[var(--admin-muted)] hover:bg-[#f0f4f8]"
              aria-label={`Previous ${period}`}
            >
              ← Prev
            </button>
            <span className="min-w-[160px] text-center text-sm font-semibold text-[var(--admin-text)]">
              {label}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold text-[var(--admin-muted)] hover:bg-[#f0f4f8]"
              aria-label={`Next ${period}`}
            >
              Next →
            </button>
          </div>
        )}

        {period === 'custom' && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--admin-muted)]">From</span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => onFromChange(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--admin-muted)]">To</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => onToChange(e.target.value)}
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => applyQuarter(q)}
                  className="rounded-lg border border-[var(--admin-border)] px-2.5 py-2 text-xs font-semibold text-[var(--admin-muted)] hover:bg-[#f0f4f8]"
                >
                  Q{q} {(anchorDate || new Date()).getFullYear()}
                </button>
              ))}
            </div>
          </>
        )}

        {isChainScope && onBranchChange && (
          <label className="flex min-w-[180px] flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--admin-muted)]">Branch</span>
            <select
              value={branchId || ''}
              onChange={(e) => onBranchChange(e.target.value ? Number(e.target.value) : '')}
              className={inputClass}
            >
              <option value="">All branches</option>
              {(branches || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {extraFilters}

        <button
          type="button"
          onClick={() => onApply?.(from, to)}
          className="rounded-lg bg-[var(--admin-text)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {applyLabel}
        </button>

        <p className="ml-auto text-xs text-[var(--admin-muted)]">{label}</p>
      </div>
    </div>
  );
}

export { rangeForPeriod };
