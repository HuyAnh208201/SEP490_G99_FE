import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatVnd } from '../../lib/money.js';
import { usePosCart } from '../../contexts/PosCartContext.jsx';
import { scanBarcode } from '../../api/barcode.js';
import { fetchPosCatalog } from '../../api/products.js';
import { fetchScanEvents, pushScanEvent } from '../../api/posScan.js';
import { toPosProduct } from './posProduct.js';
import { ALL_PRODUCTS_ID, categoryAccent, categoryInitials } from './categoryAccent.js';
import { isTypingTarget } from './posHotkeys.js';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import ProductInfoPopup from './components/ProductInfoPopup.jsx';
import BarcodeScannerModal, {
  CUSTOMER_QR_FORMATS,
} from './components/BarcodeScannerModal.jsx';
import PosProductImage from './components/PosProductImage.jsx';
import PosCartPanel from './components/PosCartPanel.jsx';

// Cảnh báo sắp hết hàng cho thu ngân, không phải ngưỡng đặt hàng lại của kho.
const LOW_STOCK_THRESHOLD = 5;
const SUCCESS_POPUP_MS = 3000;

export default function PosNewOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const {
    lines,
    customer,
    customerPhone,
    setCustomerPhone,
    setCustomerPhoneDraft,
    customerLookupError,
    customerBusy,
    pointsToRedeem,
    setPointsToRedeem,
    loyalty,
    discountCodeInput,
    setDiscountCodeInput,
    appliedVoucher,
    discountCodeError,
    discountCodeBusy,
    totals,
    addProduct,
    updateQty,
    removeLine,
    clearCart,
    lookupCustomerByPhone,
    clearCustomer,
    applyDiscountCode,
    clearDiscountCode,
  } = usePosCart();

  const [query, setQuery] = useState('');
  const [popupProduct, setPopupProduct] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRemoveKey, setConfirmRemoveKey] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [customerScannerOpen, setCustomerScannerOpen] = useState(false);
  const [selectedLineKey, setSelectedLineKey] = useState(null);
  const searchInputRef = useRef(null);
  const customerPhoneInputRef = useRef(null);
  const [scanMessage, setScanMessage] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const catalogRequestRef = useRef(0);
  const [activeCategory, setActiveCategory] = useState(ALL_PRODUCTS_ID);
  // Bật trên điện thoại: quét xong GỬI mã sang máy bán hàng thay vì thêm vào giỏ máy này.
  // Nhớ vào localStorage để điện thoại không phải bật lại mỗi lần mở trang.
  const [relayMode, setRelayMode] = useState(
    () => localStorage.getItem('pos_relay_mode') === '1',
  );

  useEffect(() => {
    localStorage.setItem('pos_relay_mode', relayMode ? '1' : '0');
  }, [relayMode]);

  const dismissPaymentSuccess = useCallback(() => {
    setPaymentSuccess(null);
  }, []);

  // After cash/PayOS success: show popup on /pos, then clear location.state so refresh does not re-open.
  useEffect(() => {
    const invoice = location.state?.completedInvoice;
    if (!invoice) return;
    setPaymentSuccess({
      invoice,
      change: location.state?.change,
    });
    navigate('.', { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    if (!paymentSuccess) return undefined;
    const timer = setTimeout(dismissPaymentSuccess, SUCCESS_POPUP_MS);
    return () => clearTimeout(timer);
  }, [paymentSuccess, dismissPaymentSuccess]);

  // Keep cart selection valid when lines change.
  useEffect(() => {
    if (!selectedLineKey) return;
    if (!lines.some((line) => line.key === selectedLineKey)) {
      setSelectedLineKey(lines[0]?.key ?? null);
    }
  }, [lines, selectedLineKey]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'F1') return; // handled in PosLayout help
      if (
        customerScannerOpen ||
        scannerOpen ||
        popupProduct ||
        confirmClear ||
        confirmRemoveKey ||
        paymentSuccess
      ) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setCustomerScannerOpen(false);
          setScannerOpen(false);
          setPopupProduct(null);
          setConfirmClear(false);
          setConfirmRemoveKey(null);
          dismissPaymentSuccess();
        }
        return;
      }

      if (event.key === 'F2') {
        event.preventDefault();
        setScannerOpen(true);
        return;
      }
      if (event.key === 'F3') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select?.();
        return;
      }
      if (event.key === 'F4') {
        event.preventDefault();
        if (lines.length) navigate('/pos/payment');
        return;
      }
      if (event.key === 'F9') {
        event.preventDefault();
        customerPhoneInputRef.current?.focus();
        customerPhoneInputRef.current?.select?.();
        return;
      }
      if (event.key === 'Escape') {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!lines.length) return;
        event.preventDefault();
        const index = Math.max(0, lines.findIndex((line) => line.key === selectedLineKey));
        const next =
          event.key === 'ArrowDown'
            ? lines[Math.min(lines.length - 1, (index < 0 ? -1 : index) + 1)]
            : lines[Math.max(0, (index < 0 ? 0 : index) - 1)];
        if (next) setSelectedLineKey(next.key);
        return;
      }

      const selected = lines.find((line) => line.key === selectedLineKey) || lines[0];
      if (!selected) return;

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        if (!selectedLineKey) setSelectedLineKey(selected.key);
        updateQty(selected.key, selected.qty + 1);
        return;
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        if (!selectedLineKey) setSelectedLineKey(selected.key);
        if (selected.qty <= 1) setConfirmRemoveKey(selected.key);
        else updateQty(selected.key, selected.qty - 1);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (!selectedLineKey) setSelectedLineKey(selected.key);
        setConfirmRemoveKey(selected.key);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    confirmClear,
    confirmRemoveKey,
    customerScannerOpen,
    dismissPaymentSuccess,
    lines,
    navigate,
    paymentSuccess,
    popupProduct,
    scannerOpen,
    selectedLineKey,
    updateQty,
  ]);

  const loadCatalog = useCallback(async ({ silent = false } = {}) => {
    // Nhịp tải nền (focus/đổi tab) có thể về sau nhịp mới hơn — chỉ nhận kết quả
    // của lần gọi cuối cùng để danh sách không bị nhảy về dữ liệu cũ.
    const requestId = catalogRequestRef.current + 1;
    catalogRequestRef.current = requestId;
    if (!silent) setCatalogLoading(true);
    try {
      const rows = await fetchPosCatalog();
      if (requestId !== catalogRequestRef.current) return false;
      setCatalog(rows.map(toPosProduct));
      setCatalogError('');
      return true;
    } catch (error) {
      if (requestId !== catalogRequestRef.current) return false;
      // Giữ nguyên catalog đang hiển thị: một nhịp tải nền hỏng không được làm
      // trắng quầy hàng khi thu ngân đang bán dở.
      const message =
        error.code === 'ECONNABORTED' || /timeout/i.test(String(error.message || ''))
          ? 'Product catalog took too long to load. Tap Retry.'
          : error.message || 'connection error';
      setCatalogError(message);
      return false;
    } finally {
      if (requestId === catalogRequestRef.current) setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer;

    const softRefresh = () => {
      if (!cancelled) loadCatalog({ silent: true });
    };
    const onVisible = () => {
      if (!document.hidden) softRefresh();
    };

    (async () => {
      const ok = await loadCatalog({ silent: false });
      if (cancelled || ok) return;
      // One quick retry only — avoid multi-minute skeleton loops.
      await new Promise((resolve) => {
        retryTimer = window.setTimeout(resolve, 800);
      });
      if (!cancelled) await loadCatalog({ silent: false });
    })();

    window.addEventListener('focus', softRefresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.removeEventListener('focus', softRefresh);
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
            const result = addProduct(product, 1);
            setScanMessage(
              result.message ||
                (result.ok
                  ? `Added "${product.name}" from the phone scanner.`
                  : `Phone barcode ${event.barcode}: could not add to cart.`),
            );
          } catch (error) {
            setScanMessage(
              `Phone barcode ${event.barcode}: ${error.message || 'could not be processed.'}`,
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

  const categories = useMemo(() => {
    const counts = new Map();
    for (const product of catalog) {
      const name = product.category || 'Uncategorized';
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ id: name, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog]);

  const visibleProducts = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();
    return catalog.filter((product) => {
      const categoryMatches =
        activeCategory === ALL_PRODUCTS_ID || product.category === activeCategory;
      const searchMatches =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm) ||
        product.code.toLowerCase().includes(searchTerm) ||
        (product.barcode ?? '').includes(searchTerm) ||
        (product.category ?? '').toLowerCase().includes(searchTerm);
      return categoryMatches && searchMatches;
    });
  }, [activeCategory, catalog, query]);

  const activeAccent = categoryAccent(activeCategory);

  async function lookupProduct() {
    const term = query.trim();
    if (!term) return;

    if (/^\d{6,}$/.test(term)) {
      setScanMessage(`Looking up barcode ${term}…`);
      try {
        if (relayMode) {
          const sent = await pushScanEvent(term);
          setScanMessage(`Sent "${sent.name}" to the checkout terminal.`);
          setQuery('');
          return;
        }
        const product = toPosProduct(await scanBarcode(term));
        const result = addProduct(product, 1);
        setQuery('');
        setScanMessage(
          result.message ||
            (result.ok
              ? `Added "${product.name}" to the cart.`
              : 'Could not add product to the cart.'),
        );
      } catch (error) {
        setScanMessage(error.message || 'Product not found.');
      }
      return;
    }

    const exact = catalog.find(
      (product) => product.code.toLowerCase() === term.toLowerCase(),
    );
    if (exact) {
      setPopupProduct(exact);
    }
  }

  function handleProductSearch(event) {
    event.preventDefault();
    lookupProduct();
  }

  const handleCameraDetected = useCallback(async (barcode) => {
    try {
      if (relayMode) {
        const sent = await pushScanEvent(barcode);
        setScanMessage(`Scanned ${barcode} and sent "${sent.name}" to the checkout terminal.`);
        return;
      }
      const product = toPosProduct(await scanBarcode(barcode));
      const result = addProduct(product, 1);
      setScanMessage(
        result.message ||
          (result.ok
            ? `Scanned ${barcode} and added "${product.name}" to the cart.`
            : `Barcode ${barcode}: could not add to cart.`),
      );
    } catch (error) {
      setScanMessage(`Barcode ${barcode}: ${error.message || 'could not be processed.'}`);
    } finally {
      setScannerOpen(false);
    }
  }, [addProduct, relayMode]);

  const handleCustomerQrDetected = useCallback(async (payload) => {
    try {
      const result = await lookupCustomerByPhone(payload);
      if (result.ok) {
        setScanMessage(`Customer attached: ${result.customer?.fullName || payload}`);
      } else {
        setScanMessage(result.message || 'Customer not found for scanned QR.');
      }
    } finally {
      setCustomerScannerOpen(false);
    }
  }, [lookupCustomerByPhone]);

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 lg:p-4">
        <div className="grid items-start gap-3 xl:grid-cols-[240px_minmax(0,1fr)_360px] 2xl:grid-cols-[260px_minmax(0,1fr)_390px]">
          <aside className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)] xl:sticky xl:top-3">
            <div className="border-b border-[var(--admin-border)] px-4 py-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">Categories</h2>
              <p className="mt-0.5 text-xs text-[var(--admin-subtle)]">{catalog.length} products</p>
            </div>
            {/* Dưới xl xếp thành chip tự xuống dòng để không phải kéo ngang. */}
            <nav className="flex flex-wrap gap-1.5 p-2 xl:max-h-[calc(100vh-152px)] xl:flex-nowrap xl:flex-col xl:overflow-y-auto">
              {[
                { id: ALL_PRODUCTS_ID, name: 'All products', count: catalog.length },
                ...categories,
              ].map((category) => {
                const accent = categoryAccent(category.id);
                const selected = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    style={
                      selected
                        ? { backgroundColor: accent.bg, borderColor: accent.border, color: accent.text }
                        : undefined
                    }
                    className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-sm transition xl:w-full ${
                      selected
                        ? 'font-semibold shadow-sm'
                        : 'border-transparent text-[var(--admin-muted)] hover:bg-[#f0f4f8] hover:text-[var(--admin-text)]'
                    }`}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold"
                      style={{ backgroundColor: accent.bg, color: accent.text }}
                    >
                      {category.id === ALL_PRODUCTS_ID ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 5h6v6H4zM14 5h6v6h-6zM4 13h6v6H4zM14 13h6v6h-6z" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        categoryInitials(category.name)
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate xl:whitespace-normal xl:break-words">
                      {category.name}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: accent.bg, color: accent.text }}
                    >
                      {category.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0">
            <div className="mb-3 rounded-2xl border border-[var(--admin-border)] bg-white p-3 shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-2 sm:flex-row">
                <form onSubmit={handleProductSearch} className="relative min-w-0 flex-1">
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-subtle)]" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16.5 16.5 4 4" strokeLinecap="round" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by product, barcode, or category (F3)"
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[#fbfcfe] py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--admin-brand)] focus:bg-white focus:ring-2 focus:ring-[#0058be]/15"
                  />
                </form>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--admin-brand)] px-4 text-sm font-bold text-white transition hover:bg-[var(--admin-brand-hover)]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 7V5a1 1 0 0 1 1-1h2M21 7V5a1 1 0 0 0-1-1h-2M3 17v2a1 1 0 0 0 1 1h2M21 17v2a1 1 0 0 1-1 1h-2M7 8v8M11 8v8M15 8v8M18 8v8" strokeLinecap="round" />
                  </svg>
                  Scan
                  <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">F2</kbd>
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-8 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: activeAccent.text }}
                  />
                  <div>
                    <h1 className="text-lg font-bold text-[var(--admin-text)]">
                      {activeCategory === ALL_PRODUCTS_ID ? 'All products' : activeCategory}
                    </h1>
                    <p className="text-xs text-[var(--admin-subtle)]">
                      {catalogLoading && !catalog.length
                        ? 'Loading products…'
                        : `${visibleProducts.length} products found`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--admin-muted)]">
                    <input type="checkbox" checked={relayMode} onChange={(event) => setRelayMode(event.target.checked)} className="h-4 w-4 accent-[var(--admin-brand)]" />
                    Phone scanner relay
                  </label>
                  <button
                    type="button"
                    onClick={() => loadCatalog()}
                    disabled={catalogLoading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--admin-border)] px-3 text-xs font-semibold text-[var(--admin-muted)] transition hover:bg-[#f0f4f8] hover:text-[var(--admin-text)] disabled:opacity-40"
                  >
                    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${catalogLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>
              {catalogError && catalog.length > 0 && (
                <p className="mt-2 rounded-lg bg-[var(--admin-danger-bg)] px-3 py-2 text-xs font-medium text-[var(--admin-danger)]">
                  Showing the last loaded list — could not refresh products: {catalogError}
                </p>
              )}
              {scanMessage && <p className="mt-2 rounded-lg bg-[#f0f4f8] px-3 py-2 text-xs text-[var(--admin-muted)]">{scanMessage}</p>}
            </div>

            {catalogLoading && !catalog.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                  <div
                    key={index}
                    className="animate-pulse overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white p-2.5 shadow-[var(--shadow-card)]"
                  >
                    <div className="h-24 w-full rounded-xl bg-[#eef2f6] sm:h-28" />
                    <div className="space-y-2 px-1 pb-1 pt-3">
                      <div className="h-3.5 w-4/5 rounded bg-[#eef2f6]" />
                      <div className="h-3 w-2/5 rounded bg-[#f2f5f8]" />
                      <div className="h-5 w-1/2 rounded-full bg-[#eef2f6]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : catalogError && !catalog.length ? (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--admin-danger)]/35 bg-white p-8 text-center">
                <p className="font-semibold text-[var(--admin-danger)]">Could not load products</p>
                <p className="mt-1 max-w-sm text-sm text-[var(--admin-muted)]">{catalogError}</p>
                <button
                  type="button"
                  onClick={() => loadCatalog()}
                  className="mt-4 rounded-xl bg-[var(--admin-brand)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--admin-brand-hover)]"
                >
                  Retry
                </button>
              </div>
            ) : !catalog.length ? (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--admin-border)] bg-white p-8 text-center">
                <p className="font-semibold text-[var(--admin-text)]">No products at this branch</p>
                <button type="button" onClick={() => loadCatalog()} className="mt-4 rounded-xl bg-[var(--admin-brand)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--admin-brand-hover)]">
                  Refresh
                </button>
              </div>
            ) : visibleProducts.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                {visibleProducts.map((product) => {
                  const soldOut = product.stock <= 0;
                  const lowStock = !soldOut && product.stock <= LOW_STOCK_THRESHOLD;
                  const accent = categoryAccent(product.category);
                  return (
                    <article
                      key={product.id}
                      className={`group relative overflow-hidden rounded-2xl border bg-white p-2.5 shadow-[var(--shadow-card)] transition ${
                        soldOut ? 'border-[var(--admin-border)] opacity-60' : 'border-[var(--admin-border)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]'
                      }`}
                      style={soldOut ? undefined : { borderTopColor: accent.text, borderTopWidth: '3px' }}
                    >
                      <button type="button" disabled={soldOut} onClick={() => setPopupProduct(product)} className="block w-full text-left">
                        <div className="relative">
                          <PosProductImage
                            src={product.imageUrl}
                            name={product.name}
                            accent={accent}
                            className="h-24 w-full rounded-xl sm:h-28"
                          />
                          <span
                            className="absolute left-1.5 top-1.5 max-w-[80%] truncate rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ backgroundColor: accent.bg, color: accent.text }}
                          >
                            {product.category}
                          </span>
                          {soldOut && (
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-[var(--admin-danger-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--admin-danger)]">
                              Sold out
                            </span>
                          )}
                          {lowStock && (
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-[#fdf0dc] px-2 py-0.5 text-[10px] font-bold text-[var(--admin-warning)]">
                              Low stock
                            </span>
                          )}
                        </div>
                        <div className="px-1 pb-1 pt-2">
                          <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[var(--admin-text)]">{product.name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-[var(--admin-subtle)]">
                            {product.barcode || 'No barcode'} · Stock {product.stock}
                          </p>
                          <span
                            className="mt-2 inline-flex rounded-full px-2.5 py-1 text-sm font-extrabold"
                            style={{ backgroundColor: accent.bg, color: accent.text }}
                          >
                            {formatVnd(product.price)}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        disabled={soldOut}
                        onClick={() => {
                          const result = addProduct(product, 1);
                          setScanMessage(
                            result.message ||
                              (result.ok
                                ? `Added "${product.name}" to the cart.`
                                : `Could not add "${product.name}".`),
                          );
                        }}
                        className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--admin-brand)] text-xl font-bold text-white shadow-sm transition hover:bg-[var(--admin-brand-hover)] disabled:bg-[var(--admin-subtle)]"
                        aria-label={`Add ${product.name} to cart`}
                      >
                        +
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--admin-border)] bg-white p-8 text-center">
                <p className="font-semibold text-[var(--admin-text)]">No matching products</p>
                <button type="button" onClick={() => { setQuery(''); setActiveCategory(ALL_PRODUCTS_ID); }} className="mt-4 text-sm font-semibold text-[var(--admin-brand)] hover:underline">
                  Show all products
                </button>
              </div>
            )}
          </section>

          <PosCartPanel
            lines={lines}
            totals={totals}
            customer={customer}
            appliedVoucher={appliedVoucher}
            discountCodeInput={discountCodeInput}
            discountCodeError={discountCodeError}
            discountCodeBusy={discountCodeBusy}
            setDiscountCodeInput={setDiscountCodeInput}
            applyDiscountCode={applyDiscountCode}
            clearDiscountCode={clearDiscountCode}
            updateQty={updateQty}
            removeLine={removeLine}
            customerPhone={customerPhone}
            onCustomerPhoneChange={setCustomerPhoneDraft}
            onLookupCustomer={lookupCustomerByPhone}
            onScanCustomer={() => setCustomerScannerOpen(true)}
            onClearCustomer={clearCustomer}
            customerBusy={customerBusy}
            customerLookupError={customerLookupError}
            customerPhoneInputRef={customerPhoneInputRef}
            pointsToRedeem={pointsToRedeem}
            setPointsToRedeem={setPointsToRedeem}
            loyalty={loyalty}
            onClearCart={() => setConfirmClear(true)}
            onCheckout={() => navigate('/pos/payment')}
            selectedKey={selectedLineKey}
            onSelectLine={setSelectedLineKey}
          />
        </div>
      </div>

      <ProductInfoPopup
        open={Boolean(popupProduct)}
        product={popupProduct}
        onClose={() => setPopupProduct(null)}
      />

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Cancel order"
        message="Clear the entire cart and cancel this order? Customer, discount code, and redeemed points will also be reset."
        confirmLabel="Cancel order"
        danger
        onConfirm={clearCart}
      />

      <ConfirmDialog
        open={Boolean(confirmRemoveKey)}
        onClose={() => setConfirmRemoveKey(null)}
        title="Remove product"
        message={
          confirmRemoveKey
            ? `Remove "${lines.find((line) => line.key === confirmRemoveKey)?.name || 'this item'}" from the cart?`
            : ''
        }
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (confirmRemoveKey) removeLine(confirmRemoveKey);
          setConfirmRemoveKey(null);
        }}
      />

      <Modal
        open={Boolean(paymentSuccess)}
        onClose={dismissPaymentSuccess}
        title="Payment successful"
        size="sm"
        footer={
          <Button type="button" onClick={dismissPaymentSuccess}>
            Close
          </Button>
        }
      >
        {paymentSuccess ? (
          <div className="space-y-3 text-sm text-[var(--admin-text)]">
            <p>
              Invoice{' '}
              <span className="font-semibold">{paymentSuccess.invoice}</span> completed
              successfully.
            </p>
            {paymentSuccess.change != null && Number(paymentSuccess.change) > 0 ? (
              <p className="text-[var(--admin-muted)]">
                Change:{' '}
                <span className="font-semibold text-[var(--admin-text)]">
                  {formatVnd(paymentSuccess.change)}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleCameraDetected}
      />
      <BarcodeScannerModal
        open={customerScannerOpen}
        onClose={() => setCustomerScannerOpen(false)}
        onDetected={handleCustomerQrDetected}
        formats={CUSTOMER_QR_FORMATS}
        title="Scan customer QR"
        hint="Point the camera at the customer app QR code."
      />
    </>
  );
}
