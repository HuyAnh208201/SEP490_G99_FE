import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { hasPromo, toPosProduct, unitPrice } from '../pages/pos/posProduct.js';
import {
  fetchLoyaltyConfig as apiFetchLoyaltyConfig,
  searchCustomers as apiSearchCustomers,
} from '../api/cashier.js';
import {
  checkout as apiCheckout,
  fetchOrders as apiFetchOrders,
  lookupVoucher as apiLookupVoucher,
} from '../api/posOrders.js';
import { scanBarcode as apiScanBarcode } from '../api/barcode.js';

/** Fallback khi chưa tải được cấu hình từ server; server vẫn là nguồn sự thật khi chốt đơn. */
const DEFAULT_LOYALTY = { vndPerPoint: 10000, pointValueVnd: 1000 };

const PosCartContext = createContext(null);

/** CustomerLookupResponse (BE) → shape dùng trong giỏ hàng. */
function toCustomer(data) {
  return {
    id: data.customerId,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    points: data.totalPoints ?? 0,
  };
}

function lineKey(productId) {
  return String(productId);
}

function calcTotals(state) {
  const lines = state.lines;
  let subtotalOriginal = 0;
  let subtotalAfterPromo = 0;

  for (const line of lines) {
    subtotalOriginal += line.unitOriginal * line.qty;
    subtotalAfterPromo += line.unitPrice * line.qty;
  }

  const promoSavings = subtotalOriginal - subtotalAfterPromo;
  let afterPromo = subtotalAfterPromo;

  // Voucher lấy từ BE (GET /pos/orders/vouchers/{code}); đây chỉ là bản xem trước,
  // server tính lại con số cuối cùng lúc chốt đơn.
  let codeDiscount = 0;
  const voucher = state.appliedVoucher;
  if (voucher) {
    codeDiscount = voucher.discountType === 'PERCENT'
      ? Math.round((afterPromo * Number(voucher.discountValue)) / 100)
      : Number(voucher.discountValue);
    codeDiscount = Math.min(codeDiscount, afterPromo);
    afterPromo -= codeDiscount;
  }

  const { vndPerPoint, pointValueVnd } = state.loyalty ?? DEFAULT_LOYALTY;
  const maxPoints = state.customer?.points ?? 0;
  const pointsUsed = Math.min(state.pointsToRedeem, maxPoints);
  const pointsDiscount = pointsUsed * pointValueVnd;
  const cappedPointsDiscount = Math.min(pointsDiscount, afterPromo);

  const total = Math.max(0, afterPromo - cappedPointsDiscount);
  const pointsEarned =
    state.customer && total > 0 ? Math.floor(total / vndPerPoint) : 0;

  return {
    subtotalOriginal,
    subtotalAfterPromo,
    promoSavings,
    codeDiscount,
    pointsUsed: Math.floor(cappedPointsDiscount / pointValueVnd),
    pointsDiscount: cappedPointsDiscount,
    total,
    pointsEarned,
    itemCount: lines.reduce((n, l) => n + l.qty, 0),
  };
}

export function PosCartProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLookupError, setCustomerLookupError] = useState('');
  /** Nhiều khách cùng khớp một phần SĐT → cashier chọn tay. */
  const [customerResults, setCustomerResults] = useState([]);
  /** Tra không ra ai → mở form tạo nhanh. */
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [customerBusy, setCustomerBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  /** Chốt đơn là thao tác ghi DB — ref chặn double-click chắc hơn state. */
  const checkoutInFlight = useRef(false);
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [discountCodeError, setDiscountCodeError] = useState('');
  const [discountCodeBusy, setDiscountCodeBusy] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [orderHistory, setOrderHistory] = useState([]);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [loyalty, setLoyalty] = useState(DEFAULT_LOYALTY);

  // Tỉ lệ điểm do server quyết định — tải một lần khi mở POS.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await apiFetchLoyaltyConfig();
        if (!cancelled && config) setLoyalty(config);
      } catch {
        // Giữ mặc định; chốt đơn vẫn dùng số của server nên không sai tiền.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(
    () =>
      calcTotals({
        lines,
        appliedVoucher,
        customer,
        pointsToRedeem,
        loyalty,
      }),
    [lines, appliedVoucher, customer, pointsToRedeem, loyalty],
  );

  const addProduct = useCallback((product, qty = 1) => {
    if (!product || qty < 1) return false;
    setLines((prev) => {
      const key = lineKey(product.id);
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, qty: l.qty + qty } : l,
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          barcode: product.barcode,
          code: product.code,
          name: product.name,
          category: product.category,
          unit: product.unit,
          unitOriginal: product.price,
          unitPrice: unitPrice(product),
          hasPromo: hasPromo(product),
          qty,
          stock: product.stock,
        },
      ];
    });
    return true;
  }, []);

  const addByBarcode = useCallback(
    async (barcode) => {
      const code = String(barcode ?? '').trim();
      if (!code) return { ok: false, message: 'Empty barcode' };
      try {
        const product = toPosProduct(await apiScanBarcode(code));
        addProduct(product, 1);
        return { ok: true, product };
      } catch (error) {
        return { ok: false, message: error.message || 'Product not found' };
      }
    },
    [addProduct],
  );

  const updateQty = useCallback((key, qty) => {
    setLines((prev) => {
      if (qty <= 0) return prev.filter((l) => l.key !== key);
      return prev.map((l) => (l.key === key ? { ...l, qty } : l));
    });
  }, []);

  const removeLine = useCallback((key) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    setCustomer(null);
    setCustomerPhone('');
    setCustomerLookupError('');
    setCustomerResults([]);
    setCustomerNotFound(false);
    setDiscountCodeInput('');
    setAppliedVoucher(null);
    setDiscountCodeError('');
    setPointsToRedeem(0);
  }, []);

  /** Tra theo một phần SĐT / email / tên. Khớp đúng 1 người thì chọn luôn. */
  const lookupCustomer = useCallback(async (keyword) => {
    const value = String(keyword ?? '').trim();
    setCustomerPhone(value);
    setCustomerResults([]);
    setCustomerNotFound(false);
    if (!value) {
      setCustomer(null);
      setCustomerLookupError('');
      setPointsToRedeem(0);
      return { ok: true, retail: true };
    }
    setCustomerBusy(true);
    try {
      const matches = await apiSearchCustomers(value);
      if (matches.length === 1) {
        const found = toCustomer(matches[0]);
        setCustomer(found);
        setCustomerLookupError('');
        return { ok: true, customer: found };
      }
      setCustomer(null);
      setPointsToRedeem(0);
      if (matches.length > 1) {
        setCustomerResults(matches.map(toCustomer));
        setCustomerLookupError('');
        return { ok: true, multiple: true };
      }
      setCustomerNotFound(true);
      setCustomerLookupError('');
      return { ok: false, notFound: true };
    } catch (error) {
      setCustomer(null);
      setPointsToRedeem(0);
      setCustomerLookupError(error.message || 'Customer lookup failed');
      return { ok: false };
    } finally {
      setCustomerBusy(false);
    }
  }, []);

  const selectCustomer = useCallback((found) => {
    setCustomer(found);
    setCustomerResults([]);
    setCustomerNotFound(false);
    setCustomerLookupError('');
    setPointsToRedeem(0);
  }, []);

  /**
   * Gắn khách mới vào đơn nhưng CHƯA ghi DB — chỉ giữ tên + SĐT trong giỏ.
   * Khách chỉ được tạo thật khi thanh toán thành công, xem completeCashPayment.
   */
  const stageNewCustomer = useCallback(({ fullName, phone }) => {
    const name = String(fullName ?? '').trim();
    const number = String(phone ?? '').trim();
    if (!name || !number) {
      setCustomerLookupError('Enter both a name and a phone number.');
      return { ok: false };
    }
    setCustomer({
      id: null,
      fullName: name,
      email: null,
      phone: number,
      points: 0,
      pending: true,
    });
    setCustomerPhone(number);
    setCustomerResults([]);
    setCustomerNotFound(false);
    setCustomerLookupError('');
    setPointsToRedeem(0);
    return { ok: true };
  }, []);

  const applyDiscountCode = useCallback(async () => {
    const code = discountCodeInput.trim();
    if (!code) {
      setAppliedVoucher(null);
      setDiscountCodeError('');
      return { ok: true };
    }
    setDiscountCodeBusy(true);
    try {
      const voucher = await apiLookupVoucher(code);
      setAppliedVoucher(voucher);
      setDiscountCodeError('');
      return { ok: true, voucher };
    } catch (error) {
      setAppliedVoucher(null);
      setDiscountCodeError(error.message || 'Invalid or expired discount code');
      return { ok: false };
    } finally {
      setDiscountCodeBusy(false);
    }
  }, [discountCodeInput]);

  const clearDiscountCode = useCallback(() => {
    setDiscountCodeInput('');
    setAppliedVoucher(null);
    setDiscountCodeError('');
  }, []);

  const loadOrderHistory = useCallback(async (range) => {
    setOrderHistoryLoading(true);
    try {
      setOrderHistory(await apiFetchOrders(range));
      return { ok: true };
    } catch (error) {
      setOrderHistory([]);
      return { ok: false, message: error.message || 'Could not load order history' };
    } finally {
      setOrderHistoryLoading(false);
    }
  }, []);

  const completeCashPayment = useCallback(
    async ({ receivedAmount, paymentMethod = 'CASH' }) => {
      if (lines.length === 0) {
        return { ok: false, message: 'Cart is empty' };
      }
      if (receivedAmount < totals.total) {
        return { ok: false, message: 'Insufficient cash received' };
      }
      if (checkoutInFlight.current) {
        return { ok: false, message: 'Payment is already being processed' };
      }
      checkoutInFlight.current = true;
      setCheckoutBusy(true);

      try {
        // Một request duy nhất: server ghi đơn, trừ kho, chốt điểm và khoá voucher
        // trong cùng transaction. Hỏng bất kỳ đâu thì không có gì được ghi và giỏ
        // vẫn nguyên để cashier thử lại.
        const order = await apiCheckout({
          lines: lines.map((line) => ({ productId: line.productId, quantity: line.qty })),
          paymentMethod,
          cashReceived: paymentMethod === 'CASH' ? receivedAmount : null,
          customerPhone: customer?.phone ?? null,
          customerName: customer?.pending ? customer.fullName : null,
          voucherCode: appliedVoucher?.code ?? null,
          // pointsUsed đã bị chặn trên theo tổng đơn, không phải số thô cashier gõ.
          pointsToRedeem: totals.pointsUsed,
        });

        setOrderHistory((prev) => [order, ...prev]);
        clearCart();
        setPaymentOpen(false);
        return {
          ok: true,
          order,
          change: Number(order.changeAmount ?? 0),
        };
      } catch (error) {
        return { ok: false, message: error.message || 'Could not complete the order' };
      } finally {
        checkoutInFlight.current = false;
        setCheckoutBusy(false);
      }
    },
    [lines, totals, customer, appliedVoucher, clearCart],
  );

  /**
   * Chốt đơn PayOS. Server ghi đơn ở trạng thái PENDING_PAYMENT (kho đã trừ) rồi
   * mới tạo được link thanh toán từ orderId. Cố ý KHÔNG dọn giỏ ở đây — giỏ chỉ
   * được dọn khi payOS xác nhận đã nhận tiền, xem finishPayOSOrder.
   */
  const createPayOSOrder = useCallback(async () => {
    if (lines.length === 0) {
      return { ok: false, message: 'Cart is empty' };
    }
    if (checkoutInFlight.current) {
      return { ok: false, message: 'Payment is already being processed' };
    }
    checkoutInFlight.current = true;
    setCheckoutBusy(true);

    try {
      const order = await apiCheckout({
        lines: lines.map((line) => ({ productId: line.productId, quantity: line.qty })),
        paymentMethod: 'PAYOS',
        cashReceived: null,
        customerPhone: customer?.phone ?? null,
        customerName: customer?.pending ? customer.fullName : null,
        voucherCode: appliedVoucher?.code ?? null,
        pointsToRedeem: totals.pointsUsed,
      });
      return { ok: true, order };
    } catch (error) {
      return { ok: false, message: error.message || 'Could not create the order' };
    } finally {
      checkoutInFlight.current = false;
      setCheckoutBusy(false);
    }
  }, [lines, totals, customer, appliedVoucher]);

  /** payOS báo PAID → đưa đơn vào lịch sử và dọn giỏ cho khách tiếp theo. */
  const finishPayOSOrder = useCallback(
    (order) => {
      if (order) setOrderHistory((prev) => [order, ...prev]);
      clearCart();
      setPaymentOpen(false);
    },
    [clearCart],
  );

  const value = useMemo(
    () => ({
      lines,
      customer,
      customerPhone,
      customerLookupError,
      customerResults,
      customerNotFound,
      customerBusy,
      checkoutBusy,
      discountCodeInput,
      setDiscountCodeInput,
      appliedVoucher,
      discountCodeError,
      discountCodeBusy,
      pointsToRedeem,
      setPointsToRedeem,
      totals,
      orderHistory,
      orderHistoryLoading,
      loadOrderHistory,
      loyalty,
      paymentOpen,
      setPaymentOpen,
      addProduct,
      addByBarcode,
      updateQty,
      removeLine,
      clearCart,
      lookupCustomer,
      selectCustomer,
      stageNewCustomer,
      applyDiscountCode,
      clearDiscountCode,
      completeCashPayment,
      createPayOSOrder,
      finishPayOSOrder,
    }),
    [
      lines,
      customer,
      customerPhone,
      customerLookupError,
      customerResults,
      customerNotFound,
      customerBusy,
      checkoutBusy,
      discountCodeInput,
      appliedVoucher,
      discountCodeError,
      discountCodeBusy,
      pointsToRedeem,
      totals,
      orderHistory,
      orderHistoryLoading,
      loadOrderHistory,
      loyalty,
      paymentOpen,
      addProduct,
      addByBarcode,
      updateQty,
      removeLine,
      clearCart,
      lookupCustomer,
      selectCustomer,
      stageNewCustomer,
      applyDiscountCode,
      clearDiscountCode,
      completeCashPayment,
      createPayOSOrder,
      finishPayOSOrder,
    ],
  );

  return (
    <PosCartContext.Provider value={value}>{children}</PosCartContext.Provider>
  );
}

export function usePosCart() {
  const ctx = useContext(PosCartContext);
  if (!ctx) {
    throw new Error('usePosCart must be used inside <PosCartProvider>');
  }
  return ctx;
}
