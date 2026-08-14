import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { differenceStatusLabel } from '../../../api/shiftSessions.js';
import { formatDateTime } from '../../../lib/datetime.js';

function formatMoney(value) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('en-US')} VND`;
}

function diffTone(status) {
  if (status === 'BALANCED') return 'success';
  if (status === 'CASH_SHORTAGE') return 'danger';
  if (status === 'CASH_EXCESS') return 'warning';
  return 'default';
}

export default function PreviousShiftReportSection({ report }) {
  if (!report) {
    return (
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-[var(--admin-text)]">Previous shift report</h2>
        <p className="text-sm text-[var(--admin-muted)]">
          No previous shift to review — this is the first shift today.
        </p>
      </Card>
    );
  }

  const hvItems = report.highValueItems || [];
  const inventory = report.inventorySummary;

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--admin-border)] pb-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--admin-text)]">Previous shift report</h2>
          <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
            Handover from Shift #{report.shiftNumber ?? '—'} · {report.employeeName ?? '—'}
            {report.closedAt ? ` · Closed ${formatDateTime(report.closedAt)}` : null}
          </p>
        </div>
        {report.differenceStatus && (
          <Badge tone={diffTone(report.differenceStatus)}>
            {differenceStatusLabel(report.differenceStatus)}
          </Badge>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
          Cash handover
        </h3>
        <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[var(--admin-muted)]">Expected cash</dt>
            <dd className="font-semibold">{formatMoney(report.expectedCash)}</dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Actual cash</dt>
            <dd className="font-semibold text-[var(--admin-brand)]">{formatMoney(report.actualCash)}</dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Difference</dt>
            <dd className="font-semibold">{formatMoney(report.difference)}</dd>
          </div>
        </dl>
        {report.handoverRemark && (
          <p className="mt-2 rounded-lg bg-[#f7f9fb] px-3 py-2 text-sm text-[var(--admin-text)]">
            <span className="font-medium text-[var(--admin-muted)]">Remark: </span>
            {report.handoverRemark}
          </p>
        )}
      </div>

      {inventory && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
            Inventory verification
          </h3>
          <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[var(--admin-muted)]">Total SKU</dt>
              <dd className="font-semibold">{inventory.totalSku ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[var(--admin-muted)]">Low stock SKU</dt>
              <dd className="font-semibold">{inventory.lowStockSku ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[var(--admin-muted)]">Count sessions</dt>
              <dd className="font-semibold">{inventory.countSessionsDuringShift ?? '—'}</dd>
            </div>
          </dl>
        </div>
      )}

      {hvItems.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
            High-value items verified
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 text-right">Expected</th>
                  <th className="px-3 py-2 text-right">Actual</th>
                  <th className="px-3 py-2 text-right">Diff</th>
                </tr>
              </thead>
              <tbody>
                {hvItems.map((item) => (
                  <tr key={item.productId} className="border-t border-[var(--admin-border)]">
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.productName ?? '—'}</p>
                      {item.categoryName && (
                        <p className="text-xs text-[var(--admin-muted)]">{item.categoryName}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.expectedQty ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.actualQty ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.difference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
