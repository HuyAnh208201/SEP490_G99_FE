import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMe } from '../../api/users.js';
import { listRequests, receiveRequest } from '../../api/purchaseRequests.js';
import { fetchBranchInventory } from '../../api/inventory.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import RequestDetailModal from '../purchase-requests/components/RequestDetailModal.jsx';
import { PR_STATUS, statusMeta, normalizeStatus } from '../../constants/purchaseRequests.js';
import { formatDateTime } from '../../lib/datetime.js';

const RECEIVABLE = new Set([PR_STATUS.APPROVED, PR_STATUS.IN_TRANSIT]);

export default function BranchReceivePage() {
  const [branchId, setBranchId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError('');
    try {
      const [reqData, stockData] = await Promise.all([
        listRequests({ branchId }),
        fetchBranchInventory(branchId),
      ]);
      setRequests(Array.isArray(reqData) ? reqData : []);
      setInventory(Array.isArray(stockData) ? stockData : []);
    } catch (err) {
      setError(err?.message || 'Failed to load receive queue');
      setRequests([]);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchMe()
      .then((me) => {
        setCurrentUserId(me?.id ?? null);
        setBranchId(me?.branchId ?? me?.branch_id ?? null);
      })
      .catch(() => setError('Could not load your branch profile'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const queue = useMemo(
    () => requests.filter((r) => RECEIVABLE.has(normalizeStatus(r.status))),
    [requests],
  );

  async function quickReceive(request) {
    await receiveRequest(request.id);
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch receive goods"
        description="Inventory staff confirm physical receipt and update branch stock."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--admin-border)] px-4 py-3">
            <h2 className="font-semibold text-[var(--admin-text)]">Pending receipt</h2>
            <p className="text-xs text-[var(--admin-muted)]">
              Approved or in transit to this branch
            </p>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-[var(--admin-muted)]">Loading…</p>
          ) : queue.length === 0 ? (
            <p className="p-4 text-sm text-[var(--admin-muted)]">No requests waiting for receipt.</p>
          ) : (
            <ul className="divide-y divide-[var(--admin-border)]">
              {queue.map((req) => {
                const meta = statusMeta(req.status);
                const isApproved = normalizeStatus(req.status) === PR_STATUS.APPROVED;
                return (
                  <li key={req.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-medium text-[var(--admin-text)]">{req.code}</p>
                      <p className="text-xs text-[var(--admin-muted)]">{formatDateTime(req.createdAt)}</p>
                      <Badge tone={meta.tone} className="mt-1">
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setDetail(req)}>
                        Details
                      </Button>
                      {isApproved && (
                        <Button size="sm" onClick={() => quickReceive(req).catch((e) => setError(e.message))}>
                          Receive
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[var(--admin-border)] px-4 py-3">
            <h2 className="font-semibold text-[var(--admin-text)]">Branch stock</h2>
            <p className="text-xs text-[var(--admin-muted)]">Updates after goods are received</p>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-[var(--admin-muted)]">Loading…</p>
          ) : inventory.length === 0 ? (
            <p className="p-4 text-sm text-[var(--admin-muted)]">No branch stock yet.</p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-[#f7f9fb] text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                  <tr>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((row) => (
                    <tr key={row.inventoryId || row.productId} className="border-t border-[var(--admin-border)]">
                      <td className="px-4 py-2">
                        <span className="font-medium">{row.productName}</span>
                        <span className="ml-2 font-mono text-xs text-[var(--admin-subtle)]">{row.productCode}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">{row.quantity ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <RequestDetailModal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        request={detail}
        currentUserId={currentUserId}
        onChanged={load}
      />
    </div>
  );
}
