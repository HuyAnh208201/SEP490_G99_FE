import { useEffect, useState } from 'react';
import { branchApi } from '../../api/modules.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import { addDraft, listDraft, removeDraft } from '../../lib/setupDraft.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import DraftNotice from '../../components/ui/DraftNotice.jsx';
import ModulePlaceholder from '../../components/ui/ModulePlaceholder.jsx';

const EMPTY = {
  name: '',
  address: '',
  phone: '',
  openHours: '',
  managerName: '',
};

export default function BranchesPage() {
  const { data: moduleData, loading, error } = useModuleData(branchApi.list, []);
  const [drafts, setDrafts] = useState([]);
  const [form, setForm] = useState(EMPTY);

  function refreshDrafts() {
    setDrafts(listDraft('branches'));
  }

  useEffect(() => {
    refreshDrafts();
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    addDraft('branches', {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      openHours: form.openHours.trim(),
      managerName: form.managerName.trim(),
      status: 'active',
    });
    setForm(EMPTY);
    refreshDrafts();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Branches"
        description="Step 4 — create branches, assign managers, and sync active/inactive status across the chain."
      />

      <DraftNotice>
        Branch CRUD API on develop is still a stub. New branches are saved locally until{' '}
        <code className="rounded bg-amber-100 px-1">POST /api/branches</code> is available.
      </DraftNotice>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ModulePlaceholder moduleData={moduleData}>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <h2 className="text-base font-semibold text-[var(--admin-text)]">New branch</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Branch name *
                </span>
                <input
                  required
                  value={form.name}
                  onChange={update('name')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Address
                </span>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={update('address')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Phone
                </span>
                <input
                  value={form.phone}
                  onChange={update('phone')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Opening hours
                </span>
                <input
                  value={form.openHours}
                  onChange={update('openHours')}
                  placeholder="08:00 - 22:00"
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Assigned manager
                </span>
                <input
                  value={form.managerName}
                  onChange={update('managerName')}
                  placeholder="Assign after creating BM account"
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <Button type="submit">Add branch</Button>
            </form>
          </Card>

          <Card className="lg:col-span-2 !p-0 overflow-hidden">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {drafts.map((b) => (
                  <tr key={b.id} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-[var(--admin-muted)]">
                      {b.address || '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-muted)]">{b.phone || '—'}</td>
                    <td className="px-4 py-3 text-[var(--admin-muted)]">{b.managerName || '—'}</td>
                    <td className="px-4 py-3 capitalize">{b.status}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        className="!px-2 !py-1 !text-red-600"
                        onClick={() => {
                          removeDraft('branches', b.id);
                          refreshDrafts();
                        }}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {drafts.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                No branches yet.
              </p>
            )}
          </Card>
        </div>
      </ModulePlaceholder>
    </div>
  );
}
