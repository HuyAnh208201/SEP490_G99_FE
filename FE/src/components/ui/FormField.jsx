export default function FormField({ label, hint, required, error, children, className = '' }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          {label}
          {required && <span className="text-[var(--admin-danger)]"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <p className="text-xs leading-relaxed text-[var(--admin-subtle)]">{hint}</p>}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </label>
  );
}
