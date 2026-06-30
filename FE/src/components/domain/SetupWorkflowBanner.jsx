import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { SETUP_WORKFLOW } from '../../config/navigation.js';

export default function SetupWorkflowBanner() {
  return (
    <Card className="!bg-gradient-to-r from-[#0058be]/5 to-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--admin-text)]">
              Luồng khởi tạo hệ thống
            </h2>
            <Badge tone="brand">Theo tracking</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Categories → Products → Suppliers → Branches → Users → Promotions → Purchase → Stock → Shift → Reports
          </p>
        </div>
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {SETUP_WORKFLOW.map((step) => (
          <li key={step.step}>
            <Link
              to={step.path}
              className="flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm transition hover:border-[#0058be]/40 hover:shadow-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--admin-brand)] text-[10px] font-bold text-white">
                {step.step}
              </span>
              <span className="truncate font-medium text-[var(--admin-text)]">{step.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
