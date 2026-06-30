import { systemApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import Card from '../../components/ui/Card.jsx';

export default function SystemSettingsPage() {
  const { data, loading, error } = useModuleData(systemApi.settings, []);

  return (
    <ModulePageShell
      title="System settings"
      description="Master data, loyalty rules, and global configuration for the chain."
      loading={loading}
      error={error}
      moduleData={data}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Loyalty rules</h3>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Point conversion (e.g. 10,000 VND = 1 point) and membership tiers.
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold">Audit & monitoring</h3>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            System health and audit log for critical operations.
          </p>
        </Card>
      </div>
    </ModulePageShell>
  );
}
