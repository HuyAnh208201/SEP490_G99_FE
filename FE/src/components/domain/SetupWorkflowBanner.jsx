import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBranches } from '../../api/branches.js';
import { fetchCampaigns } from '../../api/campaigns.js';
import { fetchSuppliers } from '../../api/suppliers.js';
import { fetchUsers } from '../../api/users.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import { useReferenceData } from '../../contexts/ReferenceDataContext.jsx';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { SETUP_WORKFLOW } from '../../config/navigation.js';

const STEP_CHECKS = {
  1: (counts) => counts.categories > 0,
  2: (counts) => counts.products > 0,
  3: (counts) => counts.suppliers > 0,
  4: (counts) => counts.branches > 0,
  5: (counts) => counts.users > 0,
  6: (counts) => counts.campaigns > 0,
};

/**
 * @param {{ counts?: Record<string, number|string> }} props
 * Pass `counts` from Admin dashboard to avoid a second API wave.
 */
export default function SetupWorkflowBanner({ counts: countsProp } = {}) {
  const { has } = usePermissions();
  const { getCategories, getProductCount, getSuppliers } = useReferenceData();
  const [counts, setCounts] = useState({
    categories: 0,
    products: 0,
    suppliers: 0,
    branches: 0,
    users: 0,
    campaigns: 0,
  });

  useEffect(() => {
    if (countsProp) {
      setCounts({
        categories: Number(countsProp.categories) || 0,
        products: Number(countsProp.products) || 0,
        suppliers: Number(countsProp.suppliers) || 0,
        branches: Number(countsProp.branches) || 0,
        users: Number(countsProp.users) || 0,
        campaigns: Number(countsProp.campaigns) || 0,
      });
      return undefined;
    }

    let cancelled = false;

    async function loadProgress() {
      const tasks = [
        ['categories', getCategories()],
        ['products', getProductCount()],
        ['suppliers', has('SUPPLIER_MANAGEMENT') ? getSuppliers() : Promise.resolve([])],
        ['branches', has('BRANCH_LIST_ADMIN') ? fetchBranches() : Promise.resolve([])],
        ['users', has('USER_MANAGEMENT_LIST') ? fetchUsers() : Promise.resolve([])],
        ['campaigns', has('PROMOTION_LIST') ? fetchCampaigns() : Promise.resolve([])],
      ];

      const results = await Promise.allSettled(tasks.map(([, fn]) => fn));
      const next = {
        categories: 0,
        products: 0,
        suppliers: 0,
        branches: 0,
        users: 0,
        campaigns: 0,
      };
      tasks.forEach(([key], idx) => {
        const result = results[idx];
        if (result.status !== 'fulfilled') {
          next[key] = 0;
          return;
        }
        const value = result.value;
        if (key === 'products') {
          next[key] = Number(value) || 0;
        } else {
          next[key] = Array.isArray(value) ? value.length : 0;
        }
      });
      if (!cancelled) setCounts(next);
    }

    loadProgress();
    return () => {
      cancelled = true;
    };
  }, [has, countsProp, getCategories, getProductCount, getSuppliers]);

  const completedSetupSteps = SETUP_WORKFLOW.filter((step) =>
    STEP_CHECKS[step.step]?.(counts),
  ).length;

  return (
    <Card className="!bg-gradient-to-r from-[#0058be]/5 to-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--admin-text)]">
              System setup workflow
            </h2>
            <Badge tone="brand">Per tracking</Badge>
            {completedSetupSteps >= 6 ? (
              <Badge tone="success">Setup complete</Badge>
            ) : (
              <Badge tone="soon">{completedSetupSteps}/6 core steps</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Categories → Products → Suppliers → Branches → Users → Promotions → Purchase → Stock →
            Shift → Reports
          </p>
        </div>
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {SETUP_WORKFLOW.map((step) => {
          const done = STEP_CHECKS[step.step]?.(counts);
          return (
            <li key={step.step}>
              <Link
                to={step.path}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:shadow-sm ${
                  done
                    ? 'border-emerald-200 bg-emerald-50/80 hover:border-emerald-300'
                    : 'border-[var(--admin-border)] bg-white hover:border-[#0058be]/40'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                    done ? 'bg-emerald-600' : 'bg-[var(--admin-brand)]'
                  }`}
                >
                  {done ? '✓' : step.step}
                </span>
                <span className="truncate font-medium text-[var(--admin-text)]">{step.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
