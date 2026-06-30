import { useEffect, useState } from 'react';
import { updateProfile, fetchMe } from '../../api/users.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';

export default function ProfilePage() {
  const { user, signIn } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    birthDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (cancelled) return;
        setForm({
          firstName: me.firstName || '',
          lastName: me.lastName || '',
          email: me.email || '',
          phone: me.phone || '',
          gender: me.gender || '',
          birthDate: me.birthDate ? String(me.birthDate).slice(0, 10) : '',
        });
      })
      .catch(() => {
        if (!cancelled && user) {
          setForm({
            firstName: user.firstName || user.name?.split(' ')[0] || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
            gender: user.gender || '',
            birthDate: '',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        gender: form.gender || undefined,
        birthDate: form.birthDate || undefined,
      };
      await updateProfile(payload);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Unable to update profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Profile"
        description="View and edit your account information."
        badge={
          user?.role ? (
            <Badge tone="brand">{ROLE_LABELS[user.role] || user.role}</Badge>
          ) : null
        }
      />

      <Card>
        {fetching ? (
          <div className="h-40 animate-pulse rounded-lg bg-[#f0f4f8]" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  First name *
                </span>
                <input
                  required
                  value={form.firstName}
                  onChange={update('firstName')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Last name
                </span>
                <input
                  value={form.lastName}
                  onChange={update('lastName')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Email *
                </span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={update('email')}
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
                  Gender
                </span>
                <select
                  value={form.gender}
                  onChange={update('gender')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                >
                  <option value="">—</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Date of birth
                </span>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={update('birthDate')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {success}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                Save changes
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
