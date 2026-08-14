import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDate } from '../../lib/datetime.js';
import {
  SHIPMENT_STATUS_OPTIONS,
  shipmentStatusMeta,
} from '../../constants/inventoryStaff.js';
import { listIncomingOrdersPage } from '../../api/branchReceiving.js';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

const selectClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';
const inputClass = selectClass;

export default function OrderTrackingPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const pageData = useServerPage(listIncomingOrdersPage, { search: debouncedSearch, status: statusFilter });
  const { items: filteredRows, loading, error } = pageData;

  return (
    <div className="w-full">
      <PageHeader
        title="Order Tracking"
        description="View and track assigned dispatch orders and shipment status."
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--admin-border)] px-4 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dispatch Order ID or Request ID"
            className={`${inputClass} w-64`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
          >
            {SHIPMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-[var(--admin-muted)]">
            <strong>{pageData.totalRecords}</strong> orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Dispatch Order ID</th>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Shipment Date</th>
                <th className="px-4 py-3">Desired Receive</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Categories</th>
                <th className="px-4 py-3 text-right">Products</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : filteredRows.map((r) => {
                    const meta = shipmentStatusMeta(r.status);
                    return (
                      <tr
                        key={`${r.dispatchOrderId}-${r.requestId}`}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0058be]">
                          {r.dispatchNumber}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                          {r.requestNumber}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {formatDate(r.shipmentDate)}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {formatDate(r.desiredReceiveDate)}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {r.requestedByName || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(r.categories || []).map((c) => (
                              <Badge key={c} tone="default">
                                {c}
                              </Badge>
                            ))}
                            {(!r.categories || r.categories.length === 0) && (
                              <span className="text-[var(--admin-subtle)]">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.productCount ?? 0}</td>
                        <td className="px-4 py-3">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            {r.canReceive ? (
                              <Button
                                className="!px-3 !py-1 !text-xs"
                                onClick={() =>
                                  navigate(
                                    `/inventory/receive/${r.dispatchOrderId}/${r.requestId}`,
                                  )
                                }
                              >
                                Receive →
                              </Button>
                            ) : (
                              <span className="text-xs text-[var(--admin-subtle)]">
                                {String(r.status).toUpperCase() === 'RECEIVED'
                                  ? 'Received'
                                  : 'Awaiting delivery'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && filteredRows.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-[var(--admin-muted)]">
              No incoming orders for your branch.
            </p>
          )}
        </div>
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
      </Card>
    </div>
  );
}
