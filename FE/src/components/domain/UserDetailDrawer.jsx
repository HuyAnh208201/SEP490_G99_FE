import { useEffect, useState } from 'react';
import { fetchUserById } from '../../api/users.js';
import { ROLE_LABELS } from '../../config/navigation.js';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';

export default function UserDetailDrawer({ userId, branchMap, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchUserById(userId)
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load member');
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--admin-border)] bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-[var(--admin-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Member details</h2>
            <p className="text-sm text-[var(--admin-muted)]">Account information from the backend.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--admin-subtle)] hover:bg-[#f7f9fb]"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-[#eceef0]" />
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {user && !loading && (
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Name
                </dt>
                <dd className="mt-1 font-medium text-[var(--admin-text)]">{user.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Username
                </dt>
                <dd className="mt-1 font-mono">{user.username || user.userName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Email
                </dt>
                <dd className="mt-1">{user.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Phone
                </dt>
                <dd className="mt-1">{user.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Role
                </dt>
                <dd className="mt-1">
                  <Badge tone="brand">{ROLE_LABELS[user.role] || user.role}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Branch
                </dt>
                <dd className="mt-1">
                  {user.branchId ? branchMap[user.branchId] || `#${user.branchId}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Status
                </dt>
                <dd className="mt-1">
                  <Badge tone={user.isActive !== false ? 'success' : 'danger'}>
                    {user.isActive !== false ? 'Active' : 'Locked'}
                  </Badge>
                </dd>
              </div>
            </dl>
          )}
        </div>

        <div className="border-t border-[var(--admin-border)] px-5 py-4">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </aside>
    </div>
  );
}
