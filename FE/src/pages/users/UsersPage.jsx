import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { fetchUsers } from '../../api/users.js';
import Button from '../../components/ui/Button.jsx';
import Logo from '../../components/brand/Logo.jsx';

const PAGE_SIZE = 12;

export default function UsersPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchUsers({ limit: PAGE_SIZE, skip: page * PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setUsers(data.users || []);
        setTotal(data.total || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load the user list');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const filtered = users.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Dashboard
          </button>
          <span className="text-sm text-slate-600">
            Hello, <strong>{user?.name || 'Admin'}</strong>
          </span>
          <Button variant="ghost" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              User List
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Data from <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">dummyjson.com/users</code> — {total} users total.
            </p>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, username..."
            className="w-72 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((u) => (
              <article
                key={u.id}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={u.image}
                    alt={`${u.firstName} ${u.lastName}`}
                    className="h-14 w-14 rounded-full border border-slate-200 bg-slate-100 object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500">@{u.username}</p>
                  </div>
                </div>

                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="truncate text-slate-800">{u.email}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Phone</dt>
                    <dd className="truncate text-slate-800">{u.phone}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Age / Gender</dt>
                    <dd className="truncate text-slate-800 capitalize">
                      {u.age} · {u.gender}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">City</dt>
                    <dd className="truncate text-slate-800">
                      {u.address?.city || '—'}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
                No matching users found.
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Page {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              ← Previous
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={page + 1 >= totalPages || loading}
            >
              Next →
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
