import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  activateCampaign,
  deactivateCampaignForBranch,
  deleteCampaign,
  fetchCampaignById,
  fetchCampaigns,
  suspendCampaign,
} from '../../api/campaigns.js';
import { fetchBranches } from '../../api/branches.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_TONE,
  formatCampaignType,
  formatDiscount,
} from '../../constants/campaigns.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import CampaignFormModal from '../../components/domain/CampaignFormModal.jsx';

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function PromotionsPage() {
  const { has, role } = usePermissions();
  const webRole =
    role === 'MANAGER' ? 'BRANCH_MANAGER' : role === 'OWNER' ? 'DIRECTOR' : role;

  const canManage = has('PROMOTION_MANAGEMENT');
  const canCreate =
    canManage && (webRole === 'DIRECTOR' || webRole === 'BRANCH_MANAGER');
  const canActivate = canManage && webRole === 'DIRECTOR';

  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const branchMap = useMemo(() => {
    const map = {};
    branches.forEach((b) => {
      map[b.id] = b.name;
    });
    return map;
  }, [branches]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [campaigns, branchList] = await Promise.all([
        fetchCampaigns(),
        fetchBranches().catch(() => []),
      ]);
      setItems(Array.isArray(campaigns) ? campaigns : []);
      setBranches(Array.isArray(branchList) ? branchList : []);
    } catch (err) {
      setError(err.message || 'Failed to load campaigns');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openEdit(campaign) {
    try {
      const detail = await fetchCampaignById(campaign.id);
      setEditing(detail);
      setModalOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to load campaign details');
    }
  }

  async function runAction(id, action) {
    setActionLoading(id);
    setError('');
    try {
      if (action === 'activate') await activateCampaign(id);
      else if (action === 'suspend') await suspendCampaign(id);
      else if (action === 'deactivate-branch') await deactivateCampaignForBranch(id);
      else if (action === 'delete') {
        if (!window.confirm('Delete this campaign?')) return;
        await deleteCampaign(id);
      }
      await load();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  function formatBranches(branchIds) {
    if (!branchIds?.length) return 'All branches';
    return branchIds.map((id) => branchMap[id] || `#${id}`).join(', ');
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Promotions & campaigns"
        description="Step 6 of admin setup — discount campaigns with chain or branch scope."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              + New campaign
            </Button>
          ) : null
        }
      />

      {webRole === 'ADMIN' && canManage && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Admin can view campaigns. Create and activate are handled by Directors; branch managers
          can create branch-scoped promotions.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-[var(--admin-border)] px-4 py-3">
          <p className="text-sm text-[var(--admin-muted)]">
            Total <strong>{items.length}</strong> campaigns
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Branches</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : items.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                    >
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">
                        {formatCampaignType(c.type)}
                      </td>
                      <td className="px-4 py-3">{formatDiscount(c)}</td>
                      <td className="px-4 py-3">
                        <Badge tone="brand">{c.scope || '—'}</Badge>
                      </td>
                      <td className="max-w-[10rem] truncate px-4 py-3 text-[var(--admin-muted)]">
                        {formatBranches(c.branchIds)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={CAMPAIGN_STATUS_TONE[c.status] || 'default'}>
                          {CAMPAIGN_STATUS_LABELS[c.status] || c.status}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--admin-muted)]">
                        {formatDateTime(c.startAt)}
                        <br />
                        {formatDateTime(c.endAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {canManage && (
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1"
                              onClick={() => openEdit(c)}
                            >
                              Edit
                            </Button>
                          )}
                          {canActivate && c.status !== 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1"
                              loading={actionLoading === c.id}
                              onClick={() => runAction(c.id, 'activate')}
                            >
                              Activate
                            </Button>
                          )}
                          {canActivate && c.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1"
                              loading={actionLoading === c.id}
                              onClick={() => runAction(c.id, 'suspend')}
                            >
                              Suspend
                            </Button>
                          )}
                          {canManage && webRole === 'BRANCH_MANAGER' && c.scope === 'CHAIN' && (
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1"
                              loading={actionLoading === c.id}
                              onClick={() => runAction(c.id, 'deactivate-branch')}
                            >
                              Opt out
                            </Button>
                          )}
                          {canManage && c.status === 'DRAFT' && (
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1 !text-red-600"
                              loading={actionLoading === c.id}
                              onClick={() => runAction(c.id, 'delete')}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && items.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
              No campaigns yet. Directors and branch managers can create promotions.
            </p>
          )}
        </div>
      </Card>

      <CampaignFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
}
