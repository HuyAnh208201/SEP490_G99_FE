import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchMe } from '../../api/users.js';
import { getRequest } from '../../api/purchaseRequests.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import RequestFormModal from './components/RequestFormModal.jsx';

export default function PurchaseRequestFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const [userBranchId, setUserBranchId] = useState(user?.branchId ?? user?.branch_id ?? null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');

  useEffect(() => {
    if (userBranchId) return;
    fetchMe()
      .then((me) => {
        if (me?.branchId) setUserBranchId(me.branchId);
      })
      .catch(() => {});
  }, [userBranchId]);

  useEffect(() => {
    if (!id) {
      setEditing(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    getRequest(id)
      .then((full) => {
        if (!cancelled) setEditing(full);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load request for editing');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function goBack() {
    navigate('/purchase-requests');
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-[var(--admin-muted)]">Loading request…</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        <button type="button" className="text-sm font-medium text-[#0058be] hover:underline" onClick={goBack}>
          Back to drafts
        </button>
      </div>
    );
  }

  return (
    <RequestFormModal
      editing={editing}
      branchId={userBranchId}
      createdBy={currentUserId}
      onClose={goBack}
      onSaved={goBack}
    />
  );
}
