export default function PageHeader({ title, description, actions, badge }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--admin-text)]">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 max-w-3xl text-sm text-[var(--admin-muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
