const STYLES = {
  default: 'bg-[#f0f4f8] text-[var(--admin-muted)]',
  brand: 'bg-[#0058be]/10 text-[var(--admin-brand)]',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  soon: 'bg-amber-100 text-amber-800',
};

export default function Badge({ children, tone = 'default', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STYLES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
