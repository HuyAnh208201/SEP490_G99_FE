import { useEffect, useState } from 'react';
import { addDraft, listDraft, removeDraft } from '../../lib/setupDraft.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import DraftNotice from '../../components/ui/DraftNotice.jsx';

const EMPTY = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  terms: '',
  productsSupplied: '',
};

export default function SuppliersPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);

  function refresh() {
    setItems(listDraft('suppliers'));
  }

  useEffect(() => {
    refresh();
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    addDraft('suppliers', {
      name: form.name.trim(),
      contactName: form.contactName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      terms: form.terms.trim(),
      productsSupplied: form.productsSupplied.trim(),
    });
    setForm(EMPTY);
    refresh();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Suppliers"
        description="Step 3 — centralized supplier list for the whole chain, used when purchasing stock."
      />

      <DraftNotice>
        Supplier CRUD API is not on develop yet. Records are stored locally until the backend module
        ships.
      </DraftNotice>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="text-base font-semibold text-[var(--admin-text)]">New supplier</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Supplier name *
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
                Contact person
              </span>
              <input
                value={form.contactName}
                onChange={update('contactName')}
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
                Email
              </span>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Payment terms
              </span>
              <input
                value={form.terms}
                onChange={update('terms')}
                placeholder="Net 30, COD..."
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Products supplied
              </span>
              <textarea
                rows={2}
                value={form.productsSupplied}
                onChange={update('productsSupplied')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>
            <Button type="submit">Add supplier</Button>
          </form>
        </Card>

        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Terms</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-[var(--admin-border)]">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">{s.contactName || '—'}</td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">{s.phone || '—'}</td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">{s.terms || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      className="!px-2 !py-1 !text-red-600"
                      onClick={() => {
                        removeDraft('suppliers', s.id);
                        refresh();
                      }}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
              No suppliers yet.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
