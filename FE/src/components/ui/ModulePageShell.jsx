import PageHeader from '../ui/PageHeader.jsx';
import Card from '../ui/Card.jsx';
import ModulePlaceholder from '../ui/ModulePlaceholder.jsx';
import Badge from '../ui/Badge.jsx';

export default function ModulePageShell({
  title,
  description,
  loading,
  error,
  moduleData,
  comingSoon,
  children,
  actions,
}) {
  return (
    <div className="w-full">
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        badge={comingSoon ? <Badge tone="soon">API coming soon</Badge> : null}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-[var(--admin-border)] bg-white"
            />
          ))}
        </div>
      ) : (
        <ModulePlaceholder moduleData={moduleData}>
          {children || (
            <Card>
              <p className="text-sm text-[var(--admin-muted)]">
                Module UI is ready. Backend will provide live data in upcoming sprints following
                the flow: Categories → Products → Suppliers → Branches → Users.
              </p>
            </Card>
          )}
        </ModulePlaceholder>
      )}
    </div>
  );
}
