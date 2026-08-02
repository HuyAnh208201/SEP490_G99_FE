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
import {
  normalizePhone,
  validateEmail,
  validateRequiredName,
  validateVnPhone,
  NAME_MAX_LENGTH,
} from '../lib/validation.js';

/** Fallback khi chưa tải được cấu hình từ server; server vẫn là nguồn sự thật khi chốt đơn. */
const DEFAULT_LOYALTY = { vndPerPoint: 10000, pointValueVnd: 1000 };
const MAX_LINE_QTY = 10000;

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
    const requested = Math.floor(Number(qty) || 0);
    if (!product || requested < 1) {
      return { ok: false, message: 'Quantity must be at least 1.' };
    }
    const stock = Number(product.stock);
    if (Number.isFinite(stock) && stock <= 0) {
      return { ok: false, message: `"${product.name}" is out of stock.` };
    }

    const hardCap = Number.isFinite(stock) && stock > 0
      ? Math.min(stock, MAX_LINE_QTY)
      : MAX_LINE_QTY;

    let outcome = { ok: true };
    setLines((prev) => {
      const key = lineKey(product.id);
      const existing = prev.find((l) => l.key === key);
      const currentQty = existing?.qty ?? 0;
      const nextQty = Math.min(currentQty + requested, hardCap);
      if (nextQty <= currentQty) {
        outcome = {
          ok: false,
          message: `Only ${hardCap} in stock for "${product.name}".`,
        };
        return prev;
      }
      if (nextQty < currentQty + requested) {
        outcome = {
          ok: true,
          capped: true,
          message: `Added up to stock limit (${hardCap}) for "${product.name}".`,
        };
      }
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: nextQty, stock: product.stock } : l));
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
          imageUrl: product.imageUrl ?? null,
          unit: product.unit,
          unitOriginal: product.price,
          unitPrice: unitPrice(product),
          hasPromo: hasPromo(product),
          qty: nextQty,
          stock: product.stock,
        },
      ];
    });
    return outcome;
  }, []);

  const addByBarcode = useCallback(
    async (barcode) => {
      const code = String(barcode ?? '').trim();
      if (!code) return { ok: false, message: 'Empty barcode' };
      if (code.length > 64) return { ok: false, message: 'Barcode is too long' };
      try {
        const product = toPosProduct(await apiScanBarcode(code));
        return addProduct(product, 1);
      } catch (error) {
        return { ok: false, message: error.message || 'Product not found' };
      }
    },
    [addProduct],
  );

  const updateQty = useCallback((key, qty) => {
    const requested = Math.floor(Number(qty) || 0);
    let outcome = { ok: true };
    setLines((prev) => {
      const line = prev.find((l) => l.key === key);
      if (!line) {
        outcome = { ok: false, message: 'Cart line not found.' };
        return prev;
      }
      if (requested <= 0) return prev.filter((l) => l.key !== key);

      const stock = Number(line.stock);
      if (Number.isFinite(stock) && stock <= 0) {
        outcome = { ok: false, message: `"${line.name}" is out of stock.` };
        return prev;
      }
      const hardCap = Number.isFinite(stock) && stock > 0
        ? Math.min(stock, MAX_LINE_QTY)
        : MAX_LINE_QTY;
      const capped = Math.min(requested, hardCap);
      if (capped < requested) {
        outcome = {
          ok: true,
          capped: true,
          message: `Only ${hardCap} in stock for "${line.name}".`,
        };
      }
      return prev.map((l) => (l.key === key ? { ...l, qty: capped } : l));
    });
    return outcome;
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

  /**
   * Gắn khách mới vào đơn nhưng CHƯA ghi DB — chỉ giữ tên + SĐT trong giỏ.
   * Khách chỉ được tạo thật khi thanh toán thành công, xem completeCashPayment.
   */
  const stageNewCustomer = useCallback(({ fullName, phone, email = null }) => {
    const nameError = validateRequiredName(fullName, {
      label: 'Customer name',
      max: NAME_MAX_LENGTH,
    });
    if (nameError) {
      setCustomerLookupError(nameError);
      return { ok: false, message: nameError };
    }
    const phoneError = validateVnPhone(phone, { required: true, label: 'Phone number' });
    if (phoneError) {
      setCustomerLookupError(phoneError);
      return { ok: false, message: phoneError };
    }
    const number = normalizePhone(phone);
    const name = String(fullName ?? '').trim();
    const mail = email == null || String(email).trim() === '' ? null : String(email).trim();
    if (mail) {
      const emailError = validateEmail(mail);
      if (emailError) {
        setCustomerLookupError(emailError);
        return { ok: false, message: emailError };
      }
    }
    setCustomer({
      id: null,
      fullName: name,
      email: mail,
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

  /** Gỡ khách khỏi đơn hiện tại (không xóa tài khoản trong DB). */
  const clearCustomer = useCallback(() => {
    setCustomer(null);
    setCustomerPhone('');
    setCustomerResults([]);
    setCustomerNotFound(false);
    setCustomerLookupError('');
    setPointsToRedeem(0);
  }, []);

  const selectCustomer = useCallback((found) => {
    setCustomer(found);
    setCustomerResults([]);
    setCustomerNotFound(false);
    setCustomerLookupError('');
    setPointsToRedeem(0);
  }, []);

  /** Tra theo một phần SĐT / tên. Luôn hiện danh sách để cashier chọn, tránh chọn nhầm khi trùng tên. */
  const lookupCustomer = useCallback(async (keyword) => {
    const value = String(keyword ?? '').trim();
    setCustomerPhone(value);
    setCustomerResults([]);
    setCustomerNotFound(false);
    if (!value) {
      setCustomerResults([]);
      setCustomerNotFound(false);
      setCustomerLookupError('');
      return { ok: true, retail: true };
    }
    setCustomerBusy(true);
    try {
      const matches = await apiSearchCustomers(value);
      if (matches.length === 0) {
        setCustomerNotFound(true);
        setCustomerLookupError('');
        return { ok: false, notFound: true };
      }
      setCustomerResults(matches.map(toCustomer));
      setCustomerLookupError('');
      return { ok: true, multiple: matches.length > 1, count: matches.length };
    } catch (error) {
      setCustomerLookupError(error.message || 'Customer lookup failed');
      return { ok: false };
    } finally {
      setCustomerBusy(false);
    }
  }, []);

  const applyDiscountCode = useCallback(async () => {
    const code = discountCodeInput.trim().toUpperCase();
    if (!code) {
      setAppliedVoucher(null);
      setDiscountCodeError('');
      return { ok: true };
    }
    if (!/^[A-Z0-9_-]{1,64}$/.test(code)) {
      setAppliedVoucher(null);
      setDiscountCodeError('Discount code format is invalid.');
      return { ok: false };
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
      const cash = Number(receivedAmount);
      if (paymentMethod === 'CASH' && (!Number.isFinite(cash) || cash < totals.total)) {
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
          customerPhone: customer?.phone ? normalizePhone(customer.phone) : null,
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
      clearCustomer,
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
      clearCustomer,
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
