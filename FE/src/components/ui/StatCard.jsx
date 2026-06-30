import NavIcon from '../layout/NavIcon.jsx';

export default function StatCard({ label, value, hint, icon, trend }) {
  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-elevated)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--admin-subtle)]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-[var(--admin-muted)]">{hint}</p>}
          {trend && (
            <p className={`mt-2 text-xs font-semibold ${trend.positive ? 'text-emerald-600' : 'text-amber-600'}`}>
              {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0058be]/10 text-[var(--admin-brand)]">
            <NavIcon name={icon} className="h-5 w-5 stroke-current" />
          </div>
        )}
      </div>
    </div>
  );
}
