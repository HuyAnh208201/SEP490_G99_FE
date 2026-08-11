import { useCallback, useEffect, useState } from 'react';
import { fetchRedeemableVouchers, redeemVoucher } from '../../../api/cashier.js';
import { formatVnd } from '../../../lib/money.js';

/**
 * Đổi điểm tích luỹ của khách lấy một mã giảm giá dùng cho lần mua sau.
 * Cố ý tách khỏi ô "Redeem points" của đơn hiện tại: đó là quy đổi điểm thành tiền
 * ngay trên hoá đơn này, còn đây là phát một mã riêng khách mang về.
 */
export default function RedeemVoucherBox({ customer, onRedeemed }) {
  const [options, setOptions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState(null);
  const [open, setOpen] = useState(false);

  const loadOptions = useCallback(async () => {
    try {
      setOptions(await fetchRedeemableVouchers());
    } catch {
      // Không mở được danh sách thì chỉ ẩn tính năng, không chặn bán hàng.
      setOptions([]);
    }
  }, []);

  useEffect(() => {
    if (open && options.length === 0) loadOptions();
  }, [open, options.length, loadOptions]);

  // Đổi khách thì kết quả của khách trước không còn đúng nữa.
  useEffect(() => {
    setIssued(null);
    setError('');
    setSelectedId('');
  }, [customer?.customerId, customer?.phone]);

  const points = Number(customer?.points ?? 0);

  async function handleRedeem() {
    if (!selectedId) return;
    setBusy(true);
    setError('');
    setIssued(null);
    try {
      const voucher = await redeemVoucher({
        customerPhone: customer.phone,
        voucherCatalogId: Number(selectedId),
      });
      setIssued(voucher);
      setSelectedId('');
      onRedeemed?.(voucher);
    } catch (err) {
      setError(err?.message || 'Could not redeem this discount code.');
    } finally {
      setBusy(false);
    }
  }

  if (!customer?.phone) return null;

  return (
    <div className="mt-3 border-t border-[#0058be]/15 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-semibold text-[var(--admin-brand)] hover:underline"
      >
        {open ? 'Hide' : 'Redeem points for a code'}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {options.length === 0 ? (
            <p className="text-[11px] text-[var(--admin-muted)]">
              No discount codes are open for redemption yet.
            </p>
          ) : (
            <>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-xs outline-none"
              >
                <option value="">Select a code…</option>
                {options.map((option) => (
                  <option
                    key={option.voucherCatalogId}
                    value={option.voucherCatalogId}
                    disabled={points < option.pointsRequired}
                  >
                    {option.name} —{' '}
                    {option.discountType === 'PERCENT'
                      ? `${Number(option.discountValue)}%`
                      : formatVnd(Number(option.discountValue))}{' '}
                    · {option.pointsRequired} pts
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !selectedId}
                onClick={handleRedeem}
                className="w-full rounded-lg border border-[var(--admin-brand)] px-3 py-2 text-xs font-semibold text-[var(--admin-brand)] transition hover:bg-[#0058be]/8 disabled:opacity-40"
              >
                {busy ? 'Redeeming…' : 'Redeem'}
              </button>
            </>
          )}

          {error && <p className="text-[11px] text-[var(--admin-danger)]">{error}</p>}
          {issued && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
              <p className="font-mono text-sm font-semibold text-emerald-900">{issued.code}</p>
              <p className="text-[11px] text-emerald-700">
                {issued.pointsSpent} pts spent · {issued.pointsRemaining} pts left
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
