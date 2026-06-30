export default function Card({ children, className = '', padding = true }) {
  return (
    <div
      className={`rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] ${
        padding ? 'p-5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
