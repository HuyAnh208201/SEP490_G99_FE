import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDateTime } from '../../lib/datetime.js';
import { listApprovedRequestsPage, createDispatchOrder } from '../../api/dispatch.js';
import { getRequest } from '../../api/purchaseRequests.js';
import { fetchSuppliers } from '../../api/suppliers.js';
import IncomingRequestDetailModal from './components/IncomingRequestDetailModal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';

const selectClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function DispatchPlanningPage() {
  const confirmSave = useSaveConfirmation();
  const [actionError, setActionError] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [shippingId, setShippingId] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  /** @type {Record<string, number[]>} */
  const [selectedSuppliersByRequest, setSelectedSuppliersByRequest] = useState({});
  /** @type {Record<string, { name: string, phone: string }>} */
  const [shipperByRequest, setShipperByRequest] = useState({});

  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(listApprovedRequestsPage, {
    search: debouncedQuery,
  });
  const { items: rows, loading, reload: load } = pageData;
  const error = actionError || pageData.error;

  useEffect(() => {
    fetchSuppliers()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSuppliers(list.filter((s) => String(s.status || '').toLowerCase() !== 'inactive'));
      })
      .catch(() => setSuppliers([]));
  }, []);

  function toggleSupplier(requestId, supplierId) {
    setSelectedSuppliersByRequest((prev) => {
      const current = prev[requestId] || [];
      const next = current.includes(supplierId)
        ? current.filter((id) => id !== supplierId)
        : [...current, supplierId];
      return { ...prev, [requestId]: next };
    });
  }

  function updateShipper(requestId, patch) {
    setShipperByRequest((prev) => ({
      ...prev,
      [requestId]: { name: '', phone: '', ...prev[requestId], ...patch },
    }));
  }

  async function openDetail(request) {
    setOpeningId(request.id);
    setActionError('');
    try {
      const full = await getRequest(request.id);
      setDetail(full);
    } catch (err) {
      setActionError(err?.message || 'Failed to load request details');
    } finally {
      setOpeningId(null);
    }
  }

  async function handleShip(request, requestNumber) {
    const requestId = request.id;
    const needsSuppliers = Boolean(request.hasShortDateCategories);
    const supplierIds = selectedSuppliersByRequest[requestId] || [];
    const shipper = shipperByRequest[requestId] || { name: '', phone: '' };
    if (!shipper.name.trim() || !shipper.phone.trim()) {
      setActionError('Enter the shipper name and phone before shipping.');
      return;
    }
    if (needsSuppliers && supplierIds.length === 0) {
      setActionError('Select at least one supplier for short-date categories before shipping.');
      return;
    }

    const confirmed = await confirmSave({
      title: 'Confirm dispatch order',
      message: `Create a dispatch order for ${requestNumber || 'this request'}${needsSuppliers ? ` using ${supplierIds.length} selected supplier(s)` : ''}?`,
      confirmLabel: 'Yes, create dispatch',
    });
    if (!confirmed) return;

    setShippingId(requestId);
    setActionError('');
    setMessage('');
    try {
      const order = await createDispatchOrder({
        requestId,
        supplierIds: needsSuppliers ? supplierIds : undefined,
        shipperName: shipper.name.trim(),
        shipperPhone: shipper.phone.trim(),
      });
      setMessage(
        `Dispatch order ${order?.dispatchNumber || ''} created for ${requestNumber || 'request'}.`,
      );
      setSelectedSuppliersByRequest((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      setShipperByRequest((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      load();
    } catch (err) {
      setActionError(err?.message || 'Failed to create dispatch order');
    } finally {
      setShippingId(null);
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Ship Orders"
        description="Ship approved requests one at a time. Short-date categories require supplier selection (direct delivery)."
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--admin-border)] px-4 py-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requests…"
            className={selectClass}
          />
          <span className="ml-auto text-sm text-[var(--admin-muted)]">
            <strong>{rows.length}</strong> ready to ship
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Categories</th>
                <th className="px-4 py-3">Suppliers</th>
                <th className="px-4 py-3">Requested date</th>
                <th className="px-4 py-3">Shipper</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : rows.map((r) => {
                    const needsSuppliers = Boolean(r.hasShortDateCategories);
                    const selected = selectedSuppliersByRequest[r.id] || [];
                    return (
                      <tr
                        key={r.id}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0058be]">
                          {r.requestNumber}
                        </td>
                        <td className="px-4 py-3 font-medium">{r.branchName}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {(r.categories || []).join(', ') || '—'}
                          {needsSuppliers ? (
                            <div className="mt-1 text-xs text-amber-700">
                              Short-date: {(r.shortDateCategories || []).join(', ')}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {needsSuppliers ? (
                            <div className="max-h-28 min-w-[11rem] space-y-1 overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-white p-2">
                              {suppliers.length === 0 ? (
                                <p className="text-xs text-[var(--admin-muted)]">No suppliers</p>
                              ) : (
                                suppliers.map((s) => (
                                  <label
                                    key={s.id}
                                    className="flex cursor-pointer items-start gap-2 text-xs text-[var(--admin-text)]"
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-0.5"
                                      checked={selected.includes(s.id)}
                                      onChange={() => toggleSupplier(r.id, s.id)}
                                    />
                                    <span>{s.name}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          ) : (
                            <span className="text-[var(--admin-muted)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {formatDateTime(r.submittedAt || r.createdAt)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex min-w-[12rem] flex-col gap-1">
                            <input
                              value={shipperByRequest[r.id]?.name || ''}
                              onChange={(e) => updateShipper(r.id, { name: e.target.value })}
                              placeholder="Shipper name"
                              className={selectClass}
                            />
                            <input
                              value={shipperByRequest[r.id]?.phone || ''}
                              onChange={(e) => updateShipper(r.id, { phone: e.target.value })}
                              placeholder="Shipper phone"
                              className={selectClass}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              className="!px-3 !py-1 !text-xs"
                              loading={openingId === r.id}
                              onClick={() => openDetail(r)}
                            >
                              View details
                            </Button>
                            <Button
                              className="!px-3 !py-1 !text-xs"
                              loading={shippingId === r.id}
                              disabled={needsSuppliers && selected.length === 0}
                              onClick={() => handleShip(r, r.requestNumber)}
                            >
                              Ship
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-[var(--admin-muted)]">
              No approved requests ready to ship. Approved requests only appear here when warehouse
              stock covers non–short-date lines (short-date goods ship via selected suppliers).
            </p>
          )}
        </div>
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
      </Card>

      <IncomingRequestDetailModal
        open={Boolean(detail)}
        request={detail}
        onClose={() => setDetail(null)}
        onChanged={load}
      />
    </div>
  );
}
