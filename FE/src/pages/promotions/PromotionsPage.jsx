import { promotionApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import Card from '../../components/ui/Card.jsx';

export default function PromotionsPage() {
  const { data, loading, error } = useModuleData(promotionApi.list, []);

  return (
    <ModulePageShell
      title="Promotions & campaigns"
      description="Create discount campaigns, configure scope, and track performance."
      loading={loading}
      error={error}
      moduleData={data}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {['Percentage off', 'Fixed discount', 'Buy X get Y'].map((type) => (
          <Card key={type}>
            <p className="text-sm font-semibold text-[var(--admin-text)]">{type}</p>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">Supported campaign type</p>
          </Card>
        ))}
      </div>
    </ModulePageShell>
  );
}
