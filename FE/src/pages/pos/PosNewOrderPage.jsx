import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatVnd } from '../../lib/money.js';
import { usePosCart } from '../../contexts/PosCartContext.jsx';
import { scanBarcode } from '../../api/barcode.js';
import { fetchProducts } from '../../api/products.js';
import { fetchScanEvents, pushScanEvent } from '../../api/posScan.js';
import {
  MOCK_DISCOUNT_CODES,
  POINT_VALUE_VND,
} from './data/mockData.js';
import { toPosProduct } from './posProduct.js';
import CheckoutDialog from './components/CheckoutDialog.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import OrderSummary from './components/OrderSummary.jsx';
import PosOrderTable from './components/PosOrderTable.jsx';
import PosPageTitle from './components/PosPageTitle.jsx';
import ProductQtyPopup from './components/ProductQtyPopup.jsx';
import BarcodeScannerModal from './components/BarcodeScannerModal.jsx';

export default function PosNewOrderPage() {
  const {
    lines,
    customer,
    customerLookupError,
    customerResults,
    customerNotFound,
    customerBusy,
    discountCodeInput,
    setDiscountCodeInput,
    appliedCode,
    discountCodeError,
    pointsToRedeem,
    setPointsToRedeem,
    totals,
    addProduct,
    updateQty,
    removeLine,
    clearCart,
    lookupCustomer,
    selectCustomer,
    stageNewCustomer,
    applyDiscountCode,
    clearDiscountCode,
    paymentOpen,
    setPaymentOpen,
  } = usePosCart();

  const [query, setQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  // Bỏ trống thì lấy luôn chuỗi vừa tra — nhưng cashier tra bằng tên thì phải sửa lại được.
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [popupProduct, setPopupProduct] = useState(null);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [pendingQty, setPendingQty] = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [catalog, setCatalog] = useState([]);
  // Bật trên điện thoại: quét xong GỬI mã sang máy bán hàng thay vì thêm vào giỏ máy này.
  // Nhớ vào localStorage để điện thoại không phải bật lại mỗi lần mở trang.
  const [relayMode, setRelayMode] = useState(
    () => localStorage.getItem('pos_relay_mode') === '1',
  );

  useEffect(() => {
    localStorage.setItem('pos_relay_mode', relayMode ? '1' : '0');
  }, [relayMode]);

  const loadCatalog = useCallback(async () => {
    try {
      const rows = await fetchProducts();
      setCatalog(rows.map(toPosProduct));
      if (!rows.length) setScanMessage('Chi nhánh chưa có sản phẩm nào.');
    } catch (error) {
      setCatalog([]);
      setScanMessage(
        `Không tải được sản phẩm từ server: ${error.message || 'lỗi kết nối'}. Kiểm tra backend (cổng 4313) rồi tải lại trang.`,
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (active) loadCatalog();
    };
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    refresh();
    // Sản phẩm vừa tạo ở tab khác sẽ không có trong catalog đã nạp — nạp lại khi
    // quay lại tab/cửa sổ, để thu ngân không phải F5 thủ công.
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadCatalog]);

  // Máy bán hàng (không bật chế độ máy quét) hỏi mã mới từ điện thoại mỗi 2 giây
  // rồi tự thêm vào giỏ. Dùng chuỗi setTimeout thay vì setInterval để 2 nhịp
  // không chồng lên nhau khi mạng chậm.
  useEffect(() => {
    if (relayMode) return undefined;

    let active = true;
    let cursor = null;
    let timer;

    const tick = async () => {
      try {
        const feed = await fetchScanEvents(cursor);
        if (!active) return;
        for (const event of feed.events ?? []) {
          try {
            const product = toPosProduct(await scanBarcode(event.barcode));
            addProduct(product, 1);
            setScanMessage(`Từ điện thoại: đã thêm "${product.name}" vào giỏ.`);
          } catch (error) {
            setScanMessage(
              `Mã ${event.barcode} từ điện thoại: ${error.message || 'không xử lý được.'}`,
            );
          }
        }
        cursor = feed.latestId ?? cursor;
      } catch {
        // Mạng chập chờn thì bỏ nhịp này, nhịp sau hỏi lại — không cần báo lỗi.
      } finally {
        if (active) timer = setTimeout(tick, 2000);
      }
    };

    tick();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [relayMode, addProduct]);

  const searchTerm = pendingProduct ? '' : query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!searchTerm || pendingProduct) return [];
    return catalog
      .filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm) ||
          product.code.toLowerCase().includes(searchTerm) ||
          (product.barcode ?? '').includes(searchTerm) ||
          (product.category ?? '').toLowerCase().includes(searchTerm),
      )
      .slice(0, 8);
  }, [searchTerm, pendingProduct, catalog]);

  function openProductPopup(product) {
    setPopupProduct(product);
    setShowResults(false);
  }

  function confirmPendingProduct(product, qty) {
    setPendingProduct(product);
    setPendingQty(qty);
    setQuery(`${product.name} × ${qty}`);
    setPopupProduct(null);
    setShowResults(false);
  }

  function clearPending() {
    setPendingProduct(null);
    setPendingQty(1);
    setQuery('');
  }

  /** Enter = CHỈ tìm sản phẩm, chưa thêm vào giỏ. Thêm vào giỏ là việc của nút "Add item". */
  async function lookupProduct() {
    if (pendingProduct) return; // đã tìm ra rồi, bấm "Add item" để thêm

    const term = query.trim();
    if (!term) return;

    // Chuỗi toàn số = barcode → tra DB qua API, đưa vào trạng thái chờ thêm.
    if (/^\d{6,}$/.test(term)) {
      setScanMessage(`Đang tra mã ${term}…`);
      try {
        if (relayMode) {
          const sent = await pushScanEvent(term);
          setScanMessage(`Đã gửi "${sent.name}" sang máy bán hàng.`);
          setQuery('');
          setShowResults(false);
          return;
        }
        const product = toPosProduct(await scanBarcode(term));
        confirmPendingProduct(product, 1);
        setScanMessage(`Đã tìm thấy "${product.name}". Bấm "Add item" để thêm vào giỏ.`);
      } catch (error) {
        setScanMessage(error.message || 'Product not found.');
        setShowResults(true);
      }
      return;
    }

    // Gõ đúng mã sản phẩm (SKU) → mở popup chọn số lượng.
    const exact = catalog.find(
      (product) => product.code.toLowerCase() === term.toLowerCase(),
    );
    if (exact) {
      openProductPopup(exact);
      return;
    }

    setShowResults(true);
  }

  /** Nút "Add item" — chỉ thêm sản phẩm đã tìm ra trước đó. */
  function commitPendingToCart() {
    if (!pendingProduct) {
      setScanMessage('Chưa chọn sản phẩm. Gõ mã hoặc tên rồi nhấn Enter để tìm trước.');
      setShowResults(true);
      return;
    }
    addProduct(pendingProduct, pendingQty);
    setScanMessage(`Đã thêm "${pendingProduct.name}" vào giỏ.`);
    clearPending();
  }

  function handleProductSearch(event) {
    event.preventDefault();
    lookupProduct();
  }

  /**
   * Camera đọc được mã → tra DB và THÊM THẲNG vào giỏ (không cần bấm "Add item").
   * Khác với gõ tay + Enter: gõ tay chỉ tìm, phải bấm "Add item" mới thêm.
   */
  async function handleCameraDetected(barcode) {
    try {
      if (relayMode) {
        const sent = await pushScanEvent(barcode);
        setScanMessage(`Đã đọc mã ${barcode} → đã gửi "${sent.name}" sang máy bán hàng.`);
        return;
      }
      const product = toPosProduct(await scanBarcode(barcode));
      addProduct(product, 1);
      setScanMessage(`Đã đọc mã ${barcode} → đã thêm "${product.name}" vào giỏ.`);
    } catch (error) {
      // Luôn kèm mã đọc được để biết camera đọc ra cái gì khi tra không thấy.
      setScanMessage(`Mã ${barcode}: ${error.message || 'không xử lý được.'}`);
    } finally {
      setScannerOpen(false);
    }
  }

  return (
    <>
      <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
        <PosPageTitle title="Product Cart" />

        <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0 space-y-4">
            <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)]">
              <div className="border-b border-[var(--admin-border)] px-4 py-4">
                <form onSubmit={handleProductSearch} className="relative">
                  {/* Bọc riêng icon + input: trên mobile hàng nút nằm trong luồng làm
                      form cao lên, nếu căn icon theo form thì icon bị tụt khỏi ô nhập. */}
                  <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-subtle)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16.5 16.5 4 4" strokeLinecap="round" />
                  </svg>
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (pendingProduct) {
                        clearPending();
                      }
                      setQuery(value);
                      setShowResults(true);
                    }}
                    onFocus={() => {
                      if (!pendingProduct) setShowResults(true);
                    }}
                    placeholder="Scan barcode or search products to add to cart..."
                    className="w-full rounded-lg border border-[var(--admin-border)] bg-white py-3 pl-10 pr-3 text-base outline-none transition placeholder:text-[var(--admin-subtle)] focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15 sm:py-2.5 sm:pr-24 sm:text-sm"
                  />
                  </div>
                  {/* Mobile: 2 nút xuống dòng, to đủ để bấm bằng ngón tay.
                      Từ sm trở lên: nhét lại vào trong ô input như thiết kế gốc. */}
                  <div className="mt-2 flex gap-2 sm:absolute sm:right-1.5 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2 sm:gap-1">
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      title="Scan with camera"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--admin-brand)] py-3 text-sm font-semibold text-[var(--admin-brand)] hover:bg-[#0058be]/5 sm:flex-none sm:rounded-md sm:px-2 sm:py-1.5 sm:text-xs"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M3 7V5a1 1 0 0 1 1-1h2M21 7V5a1 1 0 0 0-1-1h-2M3 17v2a1 1 0 0 0 1 1h2M21 17v2a1 1 0 0 1-1 1h-2M7 8v8M11 8v8M15 8v8M18 8v8" strokeLinecap="round" />
                      </svg>
                      Scan
                    </button>
                    <button
                      type="button"
                      onClick={commitPendingToCart}
                      className="flex-1 rounded-lg bg-[var(--admin-brand)] py-3 text-sm font-semibold text-white hover:bg-[var(--admin-brand-hover)] sm:flex-none sm:rounded-md sm:px-3 sm:py-1.5 sm:text-xs"
                    >
                      Add item
                    </button>
                  </div>
                  {showResults && !pendingProduct && query && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-elevated)]">
                      {results.length ? (
                        results.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => openProductPopup(product)}
                            className="flex w-full items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3 text-left last:border-0 hover:bg-[#f7f9fb]"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{product.name}</span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--admin-subtle)]">
                                <span className="rounded border border-[var(--admin-border)] bg-[#f7f9fb] px-1.5 py-0.5 font-semibold text-[var(--admin-muted)]">
                                  {product.category}
                                </span>
                                <span>{product.code}</span>
                                <span>· Stock {product.stock}</span>
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              {product.promoPrice != null && (
                                <span className="block text-[11px] text-[var(--admin-subtle)] line-through">
                                  {formatVnd(product.price)}
                                </span>
                              )}
                              <span className="text-sm font-semibold text-[var(--admin-brand)]">
                                {formatVnd(product.promoPrice ?? product.price)}
                              </span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-[var(--admin-subtle)]">No product found.</p>
                      )}
                    </div>
                  )}
                </form>
                {pendingProduct && (
                  <p className="mt-2 text-xs text-[var(--admin-muted)]">
                    Đã tìm thấy: <span className="font-semibold text-[var(--admin-text)]">{pendingProduct.name}</span>
                    {' · '}Số lượng {pendingQty}. Bấm <strong>Add item</strong> để thêm vào giỏ.
                  </p>
                )}
                <label
                  className={[
                    'mt-3 flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition',
                    relayMode
                      ? 'border-[var(--admin-brand)]/40 bg-[#0058be]/5'
                      : 'border-[var(--admin-border)] bg-white',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={relayMode}
                    onChange={(event) => setRelayMode(event.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--admin-brand)]"
                  />
                  <span className="text-xs leading-relaxed text-[var(--admin-muted)]">
                    <strong className="block text-sm text-[var(--admin-text)]">Scanner mode</strong>
                    Enable on your <strong>phone</strong>: After scanning, send the code to the vending machine instead of
                    adding it to the cart on this machine. The vending machine is turned <strong>off</strong>.
                  </span>
                </label>

                {relayMode && (
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--admin-brand)] py-4 text-base font-bold text-white shadow-sm transition hover:bg-[var(--admin-brand-hover)]"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 7V5a1 1 0 0 1 1-1h2M21 7V5a1 1 0 0 0-1-1h-2M3 17v2a1 1 0 0 0 1 1h2M21 17v2a1 1 0 0 1-1 1h-2M7 8v8M11 8v8M15 8v8M18 8v8" strokeLinecap="round" />
                    </svg>
                    Quét mã gửi sang máy bán hàng
                  </button>
                )}

                {scanMessage && <p className="mt-2 text-xs text-[var(--admin-muted)]">{scanMessage}</p>}
              </div>

              <PosOrderTable
                lines={lines}
                editable
                updateQty={updateQty}
                removeLine={removeLine}
              />

              <div className="flex items-center justify-between border-t border-[var(--admin-border)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  disabled={!lines.length}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--admin-muted)] transition hover:bg-[#f7f9fb] disabled:opacity-40"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" strokeLinecap="round" />
                  </svg>
                  Clear Entire Cart
                </button>
                <span className="text-xs text-[var(--admin-subtle)]">
                  {totals.itemCount} items in cart
                </span>
              </div>
            </section>

            <OrderSummary totals={totals} appliedCode={appliedCode} />
          </div>

          <aside className="space-y-4 2xl:sticky 2xl:top-0">
            <section className="rounded-xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--shadow-card)]">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
                Campaign discount code
              </h2>
              <input
                value={discountCodeInput}
                onChange={(event) => setDiscountCodeInput(event.target.value.toUpperCase())}
                placeholder="Enter a discount code"
                className="mt-3 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm uppercase outline-none transition focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
              />
              {appliedCode ? (
                <div className="mt-2 rounded-lg border border-[var(--admin-success)]/20 bg-[#0d7a3e]/5 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[var(--admin-success)]">Code applied</p>
                      <p className="text-xs text-[var(--admin-muted)]">
                        {MOCK_DISCOUNT_CODES[appliedCode]?.label}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearDiscountCode}
                      className="text-xs font-semibold text-[var(--admin-brand)] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={applyDiscountCode}
                  className="mt-2 w-full rounded-lg bg-[var(--admin-brand)] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)]"
                >
                  Apply Discount Code
                </button>
              )}
              {discountCodeError && (
                <p className="mt-2 text-xs text-[var(--admin-danger)]">{discountCodeError}</p>
              )}
            </section>

            <section className="rounded-xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--shadow-card)]">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
                Customer
              </h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') lookupCustomer(phone);
                  }}
                  placeholder="Phone, name or email"
                  className="min-w-0 flex-1 rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
                />
                <button
                  type="button"
                  disabled={customerBusy}
                  onClick={() => lookupCustomer(phone)}
                  className="rounded-lg border border-[var(--admin-brand)] px-3 py-2.5 text-xs font-semibold text-[var(--admin-brand)] transition hover:bg-[#0058be]/5 disabled:opacity-45"
                >
                  {customerBusy ? 'Searching…' : 'Look Up'}
                </button>
                <button
                  type="button"
                  title="Scan customer QR"
                  className="flex w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-muted)] transition hover:bg-[#f7f9fb]"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-6v-2M14 18h2" />
                  </svg>
                </button>
              </div>
              {customerLookupError && (
                <p className="mt-2 text-xs text-[var(--admin-danger)]">{customerLookupError}</p>
              )}

              {customerResults.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-lg border border-[var(--admin-border)]">
                  <p className="border-b border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                    {customerResults.length} matches · pick one
                  </p>
                  <ul className="max-h-52 overflow-y-auto">
                    {customerResults.map((match) => (
                      <li key={match.id}>
                        <button
                          type="button"
                          onClick={() => {
                            selectCustomer(match);
                            setPhone(match.phone || '');
                          }}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-[#0058be]/5"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {match.fullName}
                            </span>
                            <span className="block truncate text-xs text-[var(--admin-muted)]">
                              {match.phone}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-bold text-[var(--admin-brand)]">
                            {match.points} pts
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {customerNotFound && !customer && (
                <div className="mt-3 rounded-lg border border-dashed border-[var(--admin-border)] bg-[#f7f9fb] p-3">
                  <p className="text-xs font-semibold text-[var(--admin-text)]">
                    No customer matches &ldquo;{phone}&rdquo;
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                    Add their name to this order. They are saved to the system once payment
                    completes.
                  </p>
                  <input
                    value={newCustomerName}
                    onChange={(event) => setNewCustomerName(event.target.value)}
                    placeholder="Customer name"
                    className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
                  />
                  <input
                    value={newCustomerPhone || phone}
                    onChange={(event) => setNewCustomerPhone(event.target.value)}
                    placeholder="Phone number"
                    inputMode="tel"
                    className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
                  />
                  <button
                    type="button"
                    disabled={!newCustomerName.trim() || !(newCustomerPhone || phone).trim()}
                    onClick={() => {
                      const result = stageNewCustomer({
                        fullName: newCustomerName,
                        phone: newCustomerPhone || phone,
                      });
                      if (result.ok) {
                        setNewCustomerName('');
                        setNewCustomerPhone('');
                      }
                    }}
                    className="mt-2 w-full rounded-lg bg-[var(--admin-brand)] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Add customer to order
                  </button>
                </div>
              )}

              {customer ? (
                <div className="mt-3 rounded-lg border border-[#0058be]/15 bg-[#0058be]/5 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{customer.fullName}</p>
                      <p className="text-xs text-[var(--admin-muted)]">
                        {customer.phone}
                        {customer.email ? ` · ${customer.email}` : ''}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-[var(--admin-brand)]">
                      {customer.pending ? 'New' : `${customer.points} pts`}
                    </span>
                  </div>
                  {/* Khách chưa lưu thì chưa có điểm nào để đổi. */}
                  {!customer.pending && (
                    <>
                      <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
                        Redeem points · 1 point = {formatVnd(POINT_VALUE_VND)}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={customer.points}
                        value={pointsToRedeem}
                        onChange={(event) =>
                          setPointsToRedeem(
                            Math.max(0, Math.min(customer.points, Number(event.target.value) || 0)),
                          )
                        }
                        className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--admin-brand)]"
                      />
                    </>
                  )}
                  {totals.pointsEarned > 0 && (
                    <p className="mt-2 text-xs font-medium text-[var(--admin-success)]">
                      Customer will earn +{totals.pointsEarned} points.
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-[var(--admin-subtle)]">
                    {customer.pending
                      ? 'This customer and their points are saved once payment completes.'
                      : 'Points are added once payment completes.'}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--admin-subtle)]">Retail customer · no points</p>
              )}
            </section>

            <button
              type="button"
              disabled={!lines.length}
              onClick={() => setPaymentOpen(true)}
              className="flex w-full items-center justify-between rounded-lg bg-[var(--admin-brand)] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span>Proceed to Payment</span>
              <span>{formatVnd(totals.total)}</span>
            </button>
          </aside>
        </div>
      </main>

      <ProductQtyPopup
        open={Boolean(popupProduct)}
        product={popupProduct}
        onClose={() => setPopupProduct(null)}
        onConfirm={confirmPendingProduct}
      />

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear entire cart"
        message="Remove all products from the cart? This cannot be undone."
        confirmLabel="Clear cart"
        danger
        onConfirm={clearCart}
      />

      <CheckoutDialog open={paymentOpen} onClose={() => setPaymentOpen(false)} />
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleCameraDetected}
      />
    </>
  );
}
