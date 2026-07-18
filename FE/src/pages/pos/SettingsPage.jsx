import PosPageTitle from './components/PosPageTitle.jsx';

export default function SettingsPage() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
      <PosPageTitle title="Account Settings" />
      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[var(--admin-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold">Cashier Profile</h2>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            View account details and change your password.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-[var(--admin-brand)] px-4 py-2 text-sm font-semibold text-[var(--admin-brand)] hover:bg-[#0058be]/5"
          >
            View Profile
          </button>
        </section>
        <section className="rounded-xl border border-[var(--admin-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold">Terminal & Receipt</h2>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Receipt printer and customer display options will be configured here.
          </p>
          <span className="mt-4 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            Coming soon
          </span>
        </section>
      </div>
    </main>
  );
}
