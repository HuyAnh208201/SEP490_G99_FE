import { useMemo, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDate } from '../../lib/datetime.js';
import { listApprovedRequestsPage, createDispatchOrder } from '../../api/dispatch.js';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

const selectClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function DispatchPlanningPage() {
  const [actionError, setActionError] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [shippingId, setShippingId] = useState(null);

  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(listApprovedRequestsPage, { search: debouncedQuery, area: areaFilter, route: routeFilter });
  const { items: rows, loading, reload: load } = pageData;
  const error = actionError || pageData.error;

  const areas = useMemo(
    () => [...new Set(rows.map((r) => r.area).filter(Boolean))],
    [rows],
  );
  const routes = useMemo(
    () => [...new Set(rows.map((r) => r.route).filter(Boolean))],
    [rows],
  );

  async function handleShip(requestId, requestNumber) {
    setShippingId(requestId);
    setActionError('');
    setMessage('');
    try {
      const order = await createDispatchOrder({ requestId });
      setMessage(
        `Dispatch order ${order?.dispatchNumber || ''} created for ${requestNumber || 'request'}.`,
      );
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
        description="Ship approved requests one at a time. Each request creates its own dispatch order."
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
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">All routes</option>
            {routes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search requests…" className={selectClass} />
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
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
                <th className="px-4 py-3">Delivery Area</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Categories</th>
                <th className="px-4 py-3">Date</th>
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
                : rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0058be]">
                        {r.requestNumber}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.branchName}</td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">{r.area || '—'}</td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">{r.route || '—'}</td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">
                        {(r.categories || []).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          className="!px-3 !py-1 !text-xs"
                          loading={shippingId === r.id}
                          onClick={() => handleShip(r.id, r.requestNumber)}
                        >
                          Ship
                        </Button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-[var(--admin-muted)]">
              No approved requests ready to ship. Approved requests only appear here when warehouse
              stock (in base units) covers the approved quantity after packaging conversion. Check
              Incoming Requests for approved items that may still be awaiting stock replenishment.
            </p>
          )}
        </div>
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
      </Card>
    </div>
  );
}
