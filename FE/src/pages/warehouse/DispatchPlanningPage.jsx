import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDate } from '../../lib/datetime.js';
import { VEHICLE_OPTIONS } from '../../constants/dispatch.js';
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
  const [selected, setSelected] = useState(() => new Set());
  const [vehicle, setVehicle] = useState(VEHICLE_OPTIONS[0]);
  const [creating, setCreating] = useState(false);

  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(listApprovedRequestsPage, { search: debouncedQuery, area: areaFilter, route: routeFilter });
  const { items: rows, loading, reload: load } = pageData;
  const error = actionError || pageData.error;

  useEffect(() => setSelected(new Set()), [rows]);

  const areas = useMemo(
    () => [...new Set(rows.map((r) => r.area).filter(Boolean))],
    [rows],
  );
  const routes = useMemo(
    () => [...new Set(rows.map((r) => r.route).filter(Boolean))],
    [rows],
  );

  const filteredRows = rows;

  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.id));

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (filteredRows.every((r) => prev.has(r.id))) {
        const next = new Set(prev);
        filteredRows.forEach((r) => next.delete(r.id));
        return next;
      }
      const next = new Set(prev);
      filteredRows.forEach((r) => next.add(r.id));
      return next;
    });
  }

  async function handleCreate() {
    const requestIds = [...selected];
    if (!requestIds.length) return;
    setCreating(true);
    setActionError('');
    setMessage('');
    try {
      const order = await createDispatchOrder({ requestIds, vehicle });
      setMessage(
        `Dispatch order ${order?.dispatchNumber || ''} created with ${requestIds.length} request(s).`,
      );
      load();
    } catch (err) {
      setActionError(err?.message || 'Failed to create dispatch order');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Dispatch Planning"
        description="Select approved requests and group them into a dispatch order by delivery area and route."
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
            <strong>{selected.size}</strong> selected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Delivery Area</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Categories</th>
                <th className="px-4 py-3">Date</th>
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
                : filteredRows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                          aria-label={`Select ${r.requestNumber}`}
                        />
                      </td>
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
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && filteredRows.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-[var(--admin-muted)]">
              No approved requests to group.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--admin-border)] px-4 py-3">
          <label className="text-sm text-[var(--admin-muted)]">Vehicle</label>
          <select
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            className={selectClass}
          >
            {VEHICLE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <Button loading={creating} disabled={selected.size === 0} onClick={handleCreate}>
            Create Dispatch Order
          </Button>
        </div>
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
      </Card>
    </div>
  );
}
