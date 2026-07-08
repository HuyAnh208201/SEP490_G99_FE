import { useCallback, useEffect, useMemo, useState } from 'react';

import {

  activateCampaign,

  deactivateCampaignForBranch,

  activateCampaignForBranch,

  deleteCampaign,

  fetchCampaignById,

  fetchCampaigns,

  suspendCampaign,

} from '../../api/campaigns.js';

import { fetchBranches } from '../../api/branches.js';

import { fetchUsers } from '../../api/users.js';

import { useAuth } from '../../contexts/AuthContext.jsx';

import { usePermissions } from '../../contexts/PermissionsContext.jsx';

import { normalizeWebRole } from '../../constants/userRoles.js';

import {

  CAMPAIGN_STATUS_FILTERS,

  CAMPAIGN_STATUS_LABELS,

  CAMPAIGN_STATUS_TONE,

  CREATOR_FILTERS,

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



function isChainLevelRole(role) {

  const r = normalizeWebRole(role);

  return r === 'ADMIN' || r === 'DIRECTOR';

}



function getCreatorTier(campaign, userMap) {

  const creator = userMap[campaign.createdBy];

  if (creator) {

    return isChainLevelRole(creator.role) ? 'chain' : 'branch';

  }

  return campaign.scope === 'BRANCH' ? 'branch' : 'chain';

}



function canEditCampaign(campaign, { webRole, currentUserId, canManage }) {

  if (!canManage) return false;

  if (webRole === 'ADMIN' || webRole === 'DIRECTOR') return true;

  if (webRole === 'BRANCH_MANAGER') {

    return (

      campaign.scope === 'BRANCH' &&

      String(campaign.createdBy) === String(currentUserId)

    );

  }

  return false;

}



function canDeleteCampaign(campaign, ctx) {

  return canEditCampaign(campaign, ctx);

}



function canSuspendOwn(campaign, { webRole, currentUserId, canManage }) {

  if (!canManage || webRole !== 'BRANCH_MANAGER') return false;

  return (

    campaign.scope === 'BRANCH' &&

    String(campaign.createdBy) === String(currentUserId) &&

    campaign.status === 'ACTIVE'

  );

}



function canActivateOwn(campaign, { webRole, currentUserId, canManage }) {

  if (!canManage || webRole !== 'BRANCH_MANAGER') return false;

  return (

    campaign.scope === 'BRANCH' &&

    String(campaign.createdBy) === String(currentUserId) &&

    campaign.status !== 'ACTIVE'

  );

}



export default function PromotionsPage() {

  const { user } = useAuth();

  const { has, role } = usePermissions();

  const webRole = normalizeWebRole(role);

  const currentUserId = user?.id;



  const canManage = has('PROMOTION_MANAGEMENT');

  const canCreate =

    canManage && (webRole === 'ADMIN' || webRole === 'DIRECTOR' || webRole === 'BRANCH_MANAGER');

  const canActivateChain = canManage && (webRole === 'ADMIN' || webRole === 'DIRECTOR');



  const [items, setItems] = useState([]);

  const [branches, setBranches] = useState([]);

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);

  const [editing, setEditing] = useState(null);

  const [actionLoading, setActionLoading] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');

  const [branchFilter, setBranchFilter] = useState('all');

  const [creatorFilter, setCreatorFilter] = useState('all');

  const [query, setQuery] = useState('');



  const branchMap = useMemo(() => {

    const map = {};

    branches.forEach((b) => {

      map[b.id] = b.name;

    });

    return map;

  }, [branches]);



  const userMap = useMemo(() => {

    const map = {};

    users.forEach((u) => {

      map[u.id] = u;

    });

    return map;

  }, [users]);



  const load = useCallback(async () => {

    setLoading(true);

    setError('');

    try {

      const [campaigns, branchList, userList] = await Promise.all([

        fetchCampaigns(),

        fetchBranches().catch(() => []),

        fetchUsers().catch(() => []),

      ]);

      setItems(Array.isArray(campaigns) ? campaigns : []);

      setBranches(Array.isArray(branchList) ? branchList : []);

      setUsers(Array.isArray(userList) ? userList : []);

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



  const filtered = useMemo(() => {

    let list = items;

    if (statusFilter !== 'all') {

      list = list.filter((c) => c.status === statusFilter);

    }

    if (creatorFilter !== 'all') {

      list = list.filter((c) => getCreatorTier(c, userMap) === creatorFilter);

    }

    if (branchFilter !== 'all') {

      const bid = Number(branchFilter);

      list = list.filter((c) => {

        if (c.scope === 'BRANCH') return c.branchIds?.includes(bid);

        if (!c.branchIds?.length) return true;

        return c.branchIds.includes(bid);

      });

    }

    if (query.trim()) {

      const q = query.toLowerCase();

      list = list.filter((c) => c.name?.toLowerCase().includes(q));

    }

    return list;

  }, [items, statusFilter, creatorFilter, branchFilter, query, userMap]);



  const permCtx = useMemo(

    () => ({ webRole, currentUserId, canManage }),

    [webRole, currentUserId, canManage],

  );



  async function openEdit(campaign) {

    if (!canEditCampaign(campaign, permCtx)) return;

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

      else if (action === 'activate-branch') await activateCampaignForBranch(id);

      else if (action === 'delete') {

        if (!window.confirm('Delete this campaign permanently?')) return;

        await deleteCampaign(id);

      }

      await load();

    } catch (err) {

      setError(err.message || 'Action failed');

    } finally {

      setActionLoading(null);

    }

  }



  function formatBranches(campaign) {

    if (campaign.scope === 'BRANCH') {

      const names = (campaign.branchIds || []).map((id) => branchMap[id] || `#${id}`);

      return names.length ? names.join(', ') : 'Branch';

    }

    if (!campaign.branchIds?.length) return 'All branches';

    return campaign.branchIds.map((id) => branchMap[id] || `#${id}`).join(', ');

  }



  function creatorLabel(campaign) {

    const creator = userMap[campaign.createdBy];

    if (!creator) {

      return getCreatorTier(campaign, userMap) === 'chain' ? 'Director / Admin' : 'Branch manager';

    }

    return isChainLevelRole(creator.role) ? 'Director / Admin' : 'Branch manager';

  }



  return (

    <div className="mx-auto max-w-7xl">

      <PageHeader

        title="Promotions & campaigns"

        description="Discount campaigns with chain-wide or branch-specific scope."

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



      {webRole === 'BRANCH_MANAGER' && canManage && (

        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">

          You can create promotions for your branch. Chain-wide campaigns from directors and

          administrators can be deactivated for your branch but not deleted.

        </div>

      )}



      {error && (

        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

          {error}

        </div>

      )}



      <Card className="mb-4 !p-4">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          <input

            type="search"

            value={query}

            onChange={(e) => setQuery(e.target.value)}

            placeholder="Search by campaign name…"

            className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm lg:max-w-xs"

          />

          <div className="flex flex-wrap gap-2">

            <select

              value={statusFilter}

              onChange={(e) => setStatusFilter(e.target.value)}

              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"

            >

              {CAMPAIGN_STATUS_FILTERS.map((f) => (

                <option key={f.id} value={f.id}>

                  {f.label}

                </option>

              ))}

            </select>

            <select

              value={creatorFilter}

              onChange={(e) => setCreatorFilter(e.target.value)}

              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"

            >

              {CREATOR_FILTERS.map((f) => (

                <option key={f.id} value={f.id}>

                  {f.label}

                </option>

              ))}

            </select>

            {branches.length > 0 && (

              <select

                value={branchFilter}

                onChange={(e) => setBranchFilter(e.target.value)}

                className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"

              >

                <option value="all">All branches</option>

                {branches.map((b) => (

                  <option key={b.id} value={b.id}>

                    {b.name}

                  </option>

                ))}

              </select>

            )}

          </div>

        </div>

      </Card>



      <Card className="!p-0 overflow-hidden">

        <div className="border-b border-[var(--admin-border)] px-4 py-3">

          <p className="text-sm text-[var(--admin-muted)]">

            Showing <strong>{filtered.length}</strong> of <strong>{items.length}</strong> campaigns

          </p>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full text-left text-sm">

            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">

              <tr>

                <th className="px-4 py-3">Name</th>

                <th className="px-4 py-3">Type</th>

                <th className="px-4 py-3">Discount</th>

                <th className="px-4 py-3">Created by</th>

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

                : filtered.map((c) => {

                    const editable = canEditCampaign(c, permCtx);

                    const deletable = canDeleteCampaign(c, permCtx);

                    return (

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

                          <Badge tone={getCreatorTier(c, userMap) === 'chain' ? 'brand' : 'default'}>

                            {creatorLabel(c)}

                          </Badge>

                        </td>

                        <td className="max-w-[10rem] truncate px-4 py-3 text-[var(--admin-muted)]">

                          {formatBranches(c)}

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

                            {editable && (

                              <Button

                                variant="ghost"

                                className="!px-2 !py-1"

                                onClick={() => openEdit(c)}

                              >

                                Edit

                              </Button>

                            )}

                            {canActivateChain && c.status !== 'ACTIVE' && (

                              <Button

                                variant="ghost"

                                className="!px-2 !py-1"

                                loading={actionLoading === c.id}

                                onClick={() => runAction(c.id, 'activate')}

                              >

                                Activate

                              </Button>

                            )}

                            {canActivateChain && c.status === 'ACTIVE' && (

                              <Button

                                variant="ghost"

                                className="!px-2 !py-1"

                                loading={actionLoading === c.id}

                                onClick={() => runAction(c.id, 'suspend')}

                              >

                                Deactivate

                              </Button>

                            )}

                            {canActivateOwn(c, permCtx) && (

                              <Button

                                variant="ghost"

                                className="!px-2 !py-1"

                                loading={actionLoading === c.id}

                                onClick={() => runAction(c.id, 'activate')}

                              >

                                Activate

                              </Button>

                            )}

                            {canSuspendOwn(c, permCtx) && (

                              <Button

                                variant="ghost"

                                className="!px-2 !py-1"

                                loading={actionLoading === c.id}

                                onClick={() => runAction(c.id, 'suspend')}

                              >

                                Deactivate

                              </Button>

                            )}

                            {canManage &&

                              webRole === 'BRANCH_MANAGER' &&

                              c.scope === 'CHAIN' &&

                              getCreatorTier(c, userMap) === 'chain' &&

                              !c.deactivatedForBranch &&

                              c.status === 'ACTIVE' && (

                                <Button

                                  variant="ghost"

                                  className="!px-2 !py-1"

                                  loading={actionLoading === c.id}

                                  onClick={() => runAction(c.id, 'deactivate-branch')}

                                >

                                  Deactivate

                                </Button>

                              )}

                            {canManage &&

                              webRole === 'BRANCH_MANAGER' &&

                              c.scope === 'CHAIN' &&

                              getCreatorTier(c, userMap) === 'chain' &&

                              c.deactivatedForBranch && (

                                <Button

                                  variant="ghost"

                                  className="!px-2 !py-1"

                                  loading={actionLoading === c.id}

                                  onClick={() => runAction(c.id, 'activate-branch')}

                                >

                                  Activate

                                </Button>

                              )}

                            {deletable && (

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

                    );

                  })}

            </tbody>

          </table>

          {!loading && filtered.length === 0 && (

            <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">

              {items.length === 0

                ? 'No campaigns yet. Create your first promotion to get started.'

                : 'No campaigns match your filters.'}

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


