import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDate } from '../../lib/datetime.js';
import { unitLabel } from '../../constants/productUnits.js';
import { getShipmentDetail, receiveShipment } from '../../api/branchReceiving.js';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';
import {
  countShipmentDifferences,
  formatSignedDifference,
  resolveReceivedQuantity,
  shipmentDifference,
} from '../../lib/inventoryChange.js';

const inputClass =
  'w-24 rounded-lg border border-[var(--admin-border)] bg-white px-2 py-1.5 text-right text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';
const noteClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-2 py-1.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function ReceiveShipmentPage() {
  const { dispatchOrderId, requestId } = useParams();
  const navigate = useNavigate();
  const confirmSave = useSaveConfirmation();
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getShipmentDetail(dispatchOrderId, requestId);
      setDetail(data);
      const initial = {};
      (data.items || []).forEach((it) => {
        initial[it.productId] = { received: '', note: '' };
      });
      setForm(initial);
    } catch (err) {
      setError(err?.message || 'Failed to load shipment');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [dispatchOrderId, requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const items = detail?.items || [];
  const filledCount = useMemo(
    () => items.filter((it) => form[it.productId]?.received !== '').length,
    [items, form],
  );
  const differenceCount = useMemo(
    () => countShipmentDifferences(items, form),
    [items, form],
  );

  function setField(productId, key, value) {
    setForm((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [key]: value },
    }));
  }

  async function submit() {
    setError('');
    const payload = items.map((it) => {
      const entry = form[it.productId] || {};
      const received = resolveReceivedQuantity(it.shippedQuantity, entry.received);
      return {
        productId: it.productId,
        receivedQuantity: Number.isNaN(received) ? 0 : received,
        note: entry.note?.trim() || undefined,
      };
    });
    setSubmitting(true);
    try {
      await receiveShipment(dispatchOrderId, requestId, payload);
      navigate('/inventory/receiving-history', {
        state: { message: 'Shipment received and branch stock updated.' },
      });
    } catch (err) {
      setError(err?.message || 'Failed to receive shipment');
    } finally {
      setSubmitting(false);
    }
  }

  async function requestSubmit() {
    const confirmed = await confirmSave({
      title: 'Confirm shipment receipt',
      message: `You are about to save actual quantities for ${items.length} product(s).\n${differenceCount} product(s) differ from the shipped quantity.`,
      confirmLabel: 'Yes, save receipt',
    });
    if (confirmed) submit();
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Receive Shipment"
        description="Record actual quantities. Saving completes receipt and updates branch stock immediately."
        actions={
          <Button variant="secondary" onClick={() => navigate('/inventory/order-tracking')}>
            Back
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <Card>
          <div className="h-40 animate-pulse rounded bg-[#eceef0]" />
        </Card>
      ) : !detail ? (
        <Card>
          <p className="py-8 text-center text-sm text-[var(--admin-muted)]">Shipment not found.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              Shipment information
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
              <Info label="Dispatch Order ID" value={detail.dispatchNumber} mono />
              <Info label="Request ID" value={detail.requestNumber} mono />
              <Info label="Shipment Date" value={formatDate(detail.shipmentDate)} />
              <Info label="Desired Receive" value={formatDate(detail.desiredReceiveDate)} />
              <Info label="Requested By" value={detail.requestedByName || '—'} />
              <Info label="Store" value={detail.storeName || '—'} />
              <Info label="Source" value={detail.source || '—'} />
              <Info label="Sender" value={contact(detail.senderName, detail.senderPhone)} />
              <Info label="Assigned Receiver" value={contact(detail.assignedReceiverName, detail.assignedReceiverPhone)} />
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--admin-border)] px-4 py-3 text-sm">
              <span className="text-[var(--admin-muted)]">
                <strong>{filledCount}</strong> / {items.length} items filled
              </span>
              <span className="ml-auto text-[var(--admin-subtle)]">
                All products assumed good condition. Use Notes to report any issues.
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                    <th className="px-4 py-3 text-right">Shipped Qty</th>
                    <th className="px-4 py-3 text-right">Received Qty *</th>
                    <th className="px-4 py-3 text-right">Difference</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.productId} className="border-t border-[var(--admin-border)]">
                      <td className="px-4 py-3 text-[var(--admin-subtle)]">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--admin-text)]">{it.productName}</div>
                        <div className="font-mono text-xs text-[var(--admin-subtle)]">
                          {it.productCode}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">{unitLabel(it.unit)}</td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">{it.categoryName || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(it.unitCost)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{it.shippedQuantity}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={form[it.productId]?.received ?? ''}
                          onChange={(e) => setField(it.productId, 'received', e.target.value)}
                          placeholder={String(it.shippedQuantity)}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {(() => {
                          const difference = shipmentDifference(
                            it.shippedQuantity,
                            form[it.productId]?.received,
                          );
                          return (
                            <span
                              className={
                                difference === 0
                                  ? 'text-[var(--admin-muted)]'
                                  : difference > 0
                                    ? 'font-semibold text-emerald-600'
                                    : 'font-semibold text-red-600'
                              }
                            >
                              {formatSignedDifference(difference)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={form[it.productId]?.note ?? ''}
                          onChange={(e) => setField(it.productId, 'note', e.target.value)}
                          placeholder="e.g. 2 packs damaged"
                          className={noteClass}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate('/inventory/order-tracking')}>
              Cancel
            </Button>
            <Button
              loading={submitting}
              disabled={!detail.canReceive || items.length === 0}
              onClick={requestSubmit}
            >
              Confirm receipt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-medium text-[var(--admin-text)] ${mono ? 'font-mono text-[#0058be]' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

function contact(name, phone) {
  return [name, phone].filter(Boolean).join(' · ') || '—';
}

function money(value) {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} ₫`;
}
