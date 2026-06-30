import { useAuth } from '../../contexts/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Logo from '../../components/brand/Logo.jsx';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <p className="text-sm font-semibold text-slate-900">ChainStore</p>
            <p className="text-xs text-slate-500">Chain Store Management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">
            Hello, <strong>{user?.name || 'Admin'}</strong>
          </span>
          <Button variant="ghost" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Overview
        </h1>
        <p className="mt-2 text-slate-600">
          You have signed in successfully. This is a placeholder for the main dashboard.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <p className="text-sm font-medium text-emerald-600">Module</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              User Management
            </p>
            <p className="mt-2 text-sm text-slate-600">
              View the list of users synced from dummyjson.com.
            </p>
            <span className="mt-4 inline-flex items-center text-sm font-semibold text-emerald-600 group-hover:underline">
              Open list →
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/change-password')}
            className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <p className="text-sm font-medium text-emerald-600">Account</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              Change password
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Update your sign-in password when you know your current password.
            </p>
            <span className="mt-4 inline-flex items-center text-sm font-semibold text-emerald-600 group-hover:underline">
              Open change password page →
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
