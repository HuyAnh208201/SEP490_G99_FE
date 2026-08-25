import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatVnd } from '../../lib/money.js';
import { usePosCart } from '../../contexts/PosCartContext.jsx';
import { scanBarcode } from '../../api/barcode.js';
import { fetchPosCatalog } from '../../api/products.js';
import { fetchScanEvents, pushScanEvent } from '../../api/posScan.js';
import { toPosProduct } from './posProduct.js';
import { isTypingTarget } from './posHotkeys.js';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import ProductQtyPopup from './components/ProductQtyPopup.jsx';
import BarcodeScannerModal, { CUSTOMER_QR_FORMATS } from './components/BarcodeScannerModal.jsx';
import PosProductEntry from './components/PosProductEntry.jsx';
import PosOrderTable from './components/PosOrderTable.jsx';
import PosOrderSidebar from './components/PosOrderSidebar.jsx';
import PaymentConfirmDialog from './components/PaymentConfirmDialog.jsx';
import { openCustomerDisplay, publishCustomerDisplay } from './customerDisplayChannel.js';
import { openReceiptPdf, reserveReceiptWindow } from '../../lib/posReceiptPdf.js';

const SUCCESS_POPUP_MS = 3000;

export default function PosNewOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    lines,
    customer,
    customerPhone,
    setCustomerPhoneDraft,
    customerLookupError,
    customerBusy,
    pointsToRedeem,
    setPointsToRedeem,
    campaignId,
    applyCampaign,
    clearCampaign,
    loyalty,
    totals,
    paymentOpen,
    setPaymentOpen,
    checkoutBusy,
    addProduct,
    updateQty,
    removeLine,
    clearCart,
    lookupCustomerByPhone,
    clearCustomer,
    completeCashPayment,
  } = usePosCart();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [quantityProduct, setQuantityProduct] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRemoveKey, setConfirmRemoveKey] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [customerScannerOpen, setCustomerScannerOpen] = useState(false);
  const [selectedLineKey, setSelectedLineKey] = useState(null);
  const [scanMessage, setScanMessage] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReview, setPaymentReview] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const searchInputRef = useRef(null);
  const customerPhoneInputRef = useRef(null);
  const searchRequestRef = useRef(0);
  const [relayMode, setRelayMode] = useState(
    () => localStorage.getItem('pos_relay_mode') === '1',
  );

  useEffect(() => {
    localStorage.setItem('pos_relay_mode', relayMode ? '1' : '0');
  }, [relayMode]);

  const dismissPaymentSuccess = useCallback(() => {
    setPaymentSuccess(null);
    setScanMessage('');
  }, []);

  useEffect(() => {
    const completedInvoice = location.state?.completedInvoice;
    const completedOrder = location.state?.completedOrder;
    const shouldOpenPayment = Boolean(location.state?.openPayment);
    if (!completedInvoice && !shouldOpenPayment) return;

    if (completedInvoice) {
      setScanMessage('');
      setPaymentSuccess({
        invoice: completedInvoice,
        change: location.state?.change ?? null,
        order: completedOrder ?? null,
        receiptOpened: false,
      });
      if (completedOrder) {
        openReceiptPdf(completedOrder).then((result) => {
          setPaymentSuccess((prev) =>
            prev && prev.invoice === completedInvoice
              ? { ...prev, receiptOpened: result.opened }
              : prev,
          );
        }).catch(() => {});
      }
    }
    if (shouldOpenPayment && lines.length) {
      setPaymentMethod(location.state?.paymentMethod === 'payos' ? 'payos' : 'cash');
      setPaymentOpen(true);
    }
    navigate('.', { replace: true, state: null });
  }, [lines.length, location.state, navigate, setPaymentOpen]);

  useEffect(() => {
    if (!paymentSuccess?.receiptOpened) return undefined;
    const timer = window.setTimeout(dismissPaymentSuccess, SUCCESS_POPUP_MS);
    return () => window.clearTimeout(timer);
  }, [dismissPaymentSuccess, paymentSuccess]);

  useEffect(() => {
    if (!lines.length) {
      setSelectedLineKey(null);
      setPaymentOpen(false);
      setPaymentReview(null);
      return;
    }
    if (!selectedLineKey || !lines.some((line) => line.key === selectedLineKey)) {
      setSelectedLineKey(lines[0].key);
    }
  }, [lines, selectedLineKey, setPaymentOpen]);

  useEffect(() => {
    const term = query.trim();
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;

    if (term.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError('');
      return undefined;
    }

    setSearchResults([]);
    setSearchLoading(true);
    setSearchError('');
    const timer = window.setTimeout(async () => {
      try {
        const rows = await fetchPosCatalog({ page: 1, size: 20, search: term });
        if (requestId !== searchRequestRef.current) return;
        setSearchResults(rows.map(toPosProduct));
      } catch (error) {
        if (requestId !== searchRequestRef.current) return;
        setSearchError(error.message || 'Could not search products.');
      } finally {
        if (requestId === searchRequestRef.current) setSearchLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'F1') return;
      if (
        customerScannerOpen ||
        scannerOpen ||
        quantityProduct ||
        confirmClear ||
        confirmRemoveKey ||
        paymentSuccess ||
        paymentReview
      ) {
        if (event.key === 'Escape' && !checkoutBusy) {
          event.preventDefault();
          setCustomerScannerOpen(false);
          setScannerOpen(false);
          setQuantityProduct(null);
          setConfirmClear(false);
          setConfirmRemoveKey(null);
          setPaymentReview(null);
          setCheckoutError('');
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
      if (event.key === 'F9') {
        event.preventDefault();
        customerPhoneInputRef.current?.focus();
        customerPhoneInputRef.current?.select?.();
        return;
      }
      if (event.key === 'Escape') {
        setSearchResults([]);
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        return;
      }
      if (isTypingTarget(event.target)) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!lines.length) return;
        event.preventDefault();
        const currentIndex = Math.max(0, lines.findIndex((line) => line.key === selectedLineKey));
        const nextIndex = event.key === 'ArrowDown'
          ? Math.min(lines.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
        setSelectedLineKey(lines[nextIndex].key);
        return;
      }

      const selected = lines.find((line) => line.key === selectedLineKey) || lines[0];
      if (!selected) return;
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        updateQty(selected.key, selected.qty + 1);
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        if (selected.qty <= 1) setConfirmRemoveKey(selected.key);
        else updateQty(selected.key, selected.qty - 1);
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        setConfirmRemoveKey(selected.key);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    checkoutBusy,
    confirmClear,
    confirmRemoveKey,
    customerScannerOpen,
    dismissPaymentSuccess,
    lines,
    paymentReview,
    paymentSuccess,
    quantityProduct,
    scannerOpen,
    selectedLineKey,
    updateQty,
  ]);

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
          if (event.errorMessage || event.success === false) {
            setScanMessage(
              `Phone barcode ${event.barcode}: ${event.errorMessage || 'could not be processed.'}`,
            );
            continue;
          }
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
            setScanMessage(`Phone barcode ${event.barcode}: ${error.message || 'could not be processed.'}`);
          }
        }
        cursor = feed.latestId ?? cursor;
      } catch {
        // A missed poll is retried on the next tick without interrupting the cashier.
      } finally {
        if (active) timer = window.setTimeout(tick, 2000);
      }
    };

    tick();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [addProduct, relayMode]);

  const addBarcode = useCallback(async (barcode, source = 'Barcode') => {
    setScanMessage(`${source} ${barcode}: looking up product...`);
    try {
      if (relayMode) {
        const sent = await pushScanEvent(barcode);
        setScanMessage(`Sent "${sent.name}" to the checkout terminal.`);
        return;
      }
      const product = toPosProduct(await scanBarcode(barcode));
      const result = addProduct(product, 1);
      setScanMessage(
        result.message ||
          (result.ok ? `Added "${product.name}" to the cart.` : `Could not add "${product.name}".`),
      );
    } catch (error) {
      setScanMessage(`${source} ${barcode}: ${error.message || 'could not be processed.'}`);
    }
  }, [addProduct, relayMode]);

  async function handleProductSubmit(event) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    if (/^\d{6,}$/.test(term)) {
      setQuery('');
      setSearchResults([]);
      await addBarcode(term, 'Barcode');
      return;
    }
    const exact = searchResults.find((product) => product.code.toLowerCase() === term.toLowerCase());
    if (exact || searchResults.length === 1) setQuantityProduct(exact || searchResults[0]);
  }

  function selectSearchResult(product) {
    setQuantityProduct(product);
  }

  function confirmProductQuantity(product, quantity) {
    const result = addProduct(product, quantity);
    setScanMessage(
      result.message ||
        (result.ok ? `Added ${quantity} × "${product.name}" to the cart.` : `Could not add "${product.name}".`),
    );
    if (result.ok) {
      setQuery('');
      setSearchResults([]);
      setQuantityProduct(null);
      setSelectedLineKey(String(product.id));
    }
  }

  const handleCameraDetected = useCallback(async (barcode) => {
    try {
      await addBarcode(barcode, 'Scanned barcode');
    } finally {
      setScannerOpen(false);
    }
  }, [addBarcode]);

  const handleCustomerQrDetected = useCallback(async (payload) => {
    try {
      const result = await lookupCustomerByPhone(payload);
      setScanMessage(
        result.ok
          ? `Customer attached: ${result.customer?.fullName || payload}`
          : result.message || 'Customer not found for scanned QR.',
      );
    } finally {
      setCustomerScannerOpen(false);
    }
  }, [lookupCustomerByPhone]);

  function openPayment() {
    if (!lines.length) return;
    setPaymentOpen(true);
    window.setTimeout(() => {
      if (window.innerWidth < 1280) {
        document.getElementById('pos-order-sidebar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }

  const requestPaymentReview = useCallback((review) => {
    setCheckoutError('');
    setPaymentReview(review);
  }, []);

  async function confirmPayment() {
    if (!paymentReview || checkoutBusy) return;
    if (paymentReview.method === 'payos') {
      publishCustomerDisplay({
        status: 'CREATING',
        amount: totals.total,
        itemCount: totals.itemCount,
        discount: totals.promoSavings + totals.codeDiscount + totals.pointsDiscount,
      });
      openCustomerDisplay();
      setPaymentReview(null);
      navigate('/pos/payment/payos');
      return;
    }

    setCheckoutError('');
    const reserved = reserveReceiptWindow();
    const result = await completeCashPayment({
      receivedAmount: paymentReview.receivedAmount,
      paymentMethod: 'CASH',
    });
    if (!result.ok) {
      reserved?.close();
      setCheckoutError(result.message);
      return;
    }
    setPaymentReview(null);
    setPaymentOpen(false);
    setScanMessage('');
    let receiptOpened = false;
    try {
      const pdf = await openReceiptPdf(result.order, reserved);
      receiptOpened = pdf.opened;
    } catch {
      reserved?.close();
    }
    setPaymentSuccess({
      invoice: result.order.invoiceCode,
      change: result.change,
      order: result.order,
      receiptOpened,
    });
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 lg:p-4 xl:overflow-hidden">
        <PosProductEntry
          query={query}
          onQueryChange={setQuery}
          onSubmit={handleProductSubmit}
          results={searchResults}
          loading={searchLoading}
          error={searchError}
          message={scanMessage}
          onSelect={selectSearchResult}
          onScan={() => setScannerOpen(true)}
          relayMode={relayMode}
          onRelayModeChange={setRelayMode}
          inputRef={searchInputRef}
        />

        <div className="mt-3 grid min-h-0 flex-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)] xl:min-h-0">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3">
              <div>
                <h1 className="text-base font-bold text-[var(--admin-text)]">Current order</h1>
                <p className="text-xs text-[var(--admin-subtle)]">{totals.itemCount} items</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-lg font-extrabold text-[var(--admin-brand)]">{formatVnd(totals.total)}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PosOrderTable
                lines={lines}
                editable
                updateQty={updateQty}
                removeLine={removeLine}
                selectedKey={selectedLineKey}
                onSelectLine={setSelectedLineKey}
              />
            </div>
          </section>

          <PosOrderSidebar
            lines={lines}
            totals={totals}
            customer={customer}
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
            campaignId={campaignId}
            onApplyCampaign={applyCampaign}
            onClearCampaign={clearCampaign}
            onClearCart={() => setConfirmClear(true)}
            paymentOpen={paymentOpen}
            onPaymentOpenChange={setPaymentOpen}
            paymentMethod={paymentMethod}
            reviewOpen={Boolean(paymentReview)}
            onRequestReview={requestPaymentReview}
          />
        </div>

        {!paymentOpen && lines.length ? (
          <div className="sticky bottom-0 z-20 -mx-3 mt-3 border-t border-[var(--admin-border)] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
            <button
              type="button"
              onClick={openPayment}
              className="flex min-h-12 w-full items-center justify-between rounded-xl bg-[var(--admin-brand)] px-4 text-sm font-bold text-white"
            >
              <span>Checkout</span>
              <span>{formatVnd(totals.total)}</span>
            </button>
          </div>
        ) : null}
      </div>

      <ProductQtyPopup
        open={Boolean(quantityProduct)}
        product={quantityProduct}
        onClose={() => setQuantityProduct(null)}
        onConfirm={confirmProductQuantity}
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

      <PaymentConfirmDialog
        open={Boolean(paymentReview)}
        review={paymentReview}
        lines={lines}
        totals={totals}
        busy={checkoutBusy}
        error={checkoutError}
        onClose={() => {
          if (checkoutBusy) return;
          setPaymentReview(null);
          setCheckoutError('');
        }}
        onConfirm={confirmPayment}
      />

      <Modal
        open={Boolean(paymentSuccess)}
        onClose={dismissPaymentSuccess}
        title="Payment successful"
        size="sm"
        footer={(
          <div className="flex justify-end gap-2">
            {paymentSuccess?.order ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  openReceiptPdf(paymentSuccess.order).then((result) => {
                    if (result.opened) {
                      setPaymentSuccess((prev) => (prev ? { ...prev, receiptOpened: true } : prev));
                    }
                  }).catch(() => {});
                }}
              >
                Open receipt
              </Button>
            ) : null}
            <Button type="button" onClick={dismissPaymentSuccess}>Close</Button>
          </div>
        )}
      >
        {paymentSuccess ? (
          <div className="space-y-3 text-sm text-[var(--admin-text)]">
            <p>
              Invoice <span className="font-semibold">{paymentSuccess.invoice}</span> completed successfully.
            </p>
            {paymentSuccess.change != null ? (
              <div className="rounded-xl bg-[#0d7a3e]/8 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-success)]">Change to return</p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--admin-success)]">{formatVnd(paymentSuccess.change)}</p>
              </div>
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
        hint={undefined}
      />
    </>
  );
}
