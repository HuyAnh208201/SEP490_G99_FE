export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0058be]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  const variants = {
    primary:
      'bg-[var(--admin-brand)] text-white shadow-sm hover:bg-[var(--admin-brand-hover)]',
    secondary:
      'border border-[var(--admin-border)] bg-white text-[var(--admin-text)] hover:bg-[#f0f4f8]',
    ghost:
      'bg-transparent text-[var(--admin-muted)] hover:bg-[#f0f4f8] hover:text-[var(--admin-text)]',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      {children}
    </button>
  );
}
