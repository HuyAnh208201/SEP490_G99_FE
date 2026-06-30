import Badge from './Badge.jsx';

export default function ModulePlaceholder({
  title,
  description,
  moduleData,
  apiMessage,
  children,
}) {
  const isPlaceholder = moduleData?.status === 'placeholder';

  return (
    <div className="space-y-4">
      {isPlaceholder && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="soon">In development</Badge>
            <span>
              {apiMessage || 'Module in development — permissions are already enforced.'}
            </span>
          </div>
        </div>
      )}

      {children}

      {moduleData && (
        <details className="rounded-xl border border-[var(--admin-border)] bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[var(--admin-muted)]">
            View API payload (debug)
          </summary>
          <pre className="overflow-x-auto border-t border-[var(--admin-border)] bg-[#f7f9fb] p-4 text-xs text-[var(--admin-text)]">
            {JSON.stringify(moduleData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
