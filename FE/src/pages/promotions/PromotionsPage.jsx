import { promotionApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import Card from '../../components/ui/Card.jsx';

export default function PromotionsPage() {
  const { data, loading, error } = useModuleData(promotionApi.list, []);

  return (
    <ModulePageShell
      title="Khuyến mãi & Chiến dịch"
      description="Tạo chiến dịch giảm giá, cấu hình phạm vi áp dụng và theo dõi hiệu quả."
      loading={loading}
      error={error}
      moduleData={data}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {['% Giảm giá', 'Giảm cố định', 'Mua X tặng Y'].map((type) => (
          <Card key={type}>
            <p className="text-sm font-semibold text-[var(--admin-text)]">{type}</p>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">Loại chiến dịch hỗ trợ</p>
          </Card>
        ))}
      </div>
    </ModulePageShell>
  );
}
