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
  lookupCustomer as apiLookupCustomer,
} from '../api/cashier.js';
import {
  checkout as apiCheckout,
  fetchApplicablePromotions as apiFetchApplicablePromotions,
  fetchOrders as apiFetchOrders,
  lookupVoucher as apiLookupVoucher,
} from '../api/posOrders.js';
import { scanBarcode as apiScanBarcode } from '../api/barcode.js';
import { normalizePhone, validateVnPhone } from '../lib/validation.js';

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
    tierCode: data.tierCode ?? null,
    tierName: data.tierName ?? null,
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

  // Khuyến mãi cửa hàng áp TỰ ĐỘNG hết, trước voucher, và trừ dần trên số tiền còn
  // lại — phải khớp từng bước với resolveCampaigns bên BE, nếu không tổng trên màn
  // hình khác tổng server ghi vào đơn và tiền thối bị lệch.
  const campaignLines = [];
  for (const campaign of state.availablePromotions ?? []) {
    if (afterPromo <= 0) break;
    const value = Number(campaign.discountValue) || 0;
    const raw = campaign.type === 'PERCENT'
      ? Math.round((afterPromo * value) / 100)
      : value;
    const amount = Math.min(raw, afterPromo);
    if (amount <= 0) continue;
    campaignLines.push({ id: campaign.id, name: campaign.name, amount });
    afterPromo -= amount;
  }
  const campaignDiscount = campaignLines.reduce((sum, line) => sum + line.amount, 0);

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
    campaignLines,
    campaignDiscount,
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
  /** Khuyến mãi đang chạy của chi nhánh — áp hết, quầy không chọn được cái nào. */
  const [availablePromotions, setAvailablePromotions] = useState([]);

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

  // Khuyến mãi áp được do server lọc theo chi nhánh — tải một lần khi mở POS.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await apiFetchApplicablePromotions();
        if (!cancelled) setAvailablePromotions(rows);
      } catch {
        // Không chặn bán hàng: tải hỏng thì coi như chi nhánh không có khuyến mãi nào.
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
        availablePromotions,
        appliedVoucher,
        customer,
        pointsToRedeem,
        loyalty,
      }),
    [lines, availablePromotions, appliedVoucher, customer, pointsToRedeem, loyalty],
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
    setDiscountCodeInput('');
    setAppliedVoucher(null);
    setDiscountCodeError('');
    setPointsToRedeem(0);
    // Thiếu dòng này thì đơn sau thừa hưởng khuyến mãi cashier tick cho đơn trước.
    setSelectedCampaignIds([]);
  }, []);

  /** Gỡ khách khỏi đơn hiện tại (không xóa tài khoản trong DB). */
  const clearCustomer = useCallback(() => {
    setCustomer(null);
    setCustomerPhone('');
    setCustomerLookupError('');
    setPointsToRedeem(0);
  }, []);

  /** Update phone draft; detach loyalty customer if the number no longer matches. */
  const setCustomerPhoneDraft = useCallback((value) => {
    const next = String(value ?? '');
    setCustomerPhone(next);
    setCustomerLookupError('');
    setCustomer((prev) => {
      if (!prev) return null;
      if (normalizePhone(next) === normalizePhone(prev.phone || '')) return prev;
      return null;
    });
  }, []);

  useEffect(() => {
    if (!customer) setPointsToRedeem(0);
  }, [customer]);

  const selectCustomer = useCallback((found) => {
    setCustomer(found);
    setCustomerPhone(found?.phone ?? '');
    setCustomerLookupError('');
    setPointsToRedeem(0);
  }, []);

  /**
   * Exact phone (or email) lookup for loyalty attach — used by typed phone + customer QR.
   * No create-at-counter: unknown phone stays walk-in until a registered account is found.
   */
  const lookupCustomerByPhone = useCallback(async (phoneOrEmail) => {
    const value = normalizePhone(phoneOrEmail);
    setCustomerPhone(value);
    setCustomerLookupError('');
    if (!value) {
      setCustomer(null);
      setPointsToRedeem(0);
      return { ok: true, cleared: true };
    }

    const phoneError = validateVnPhone(value, { required: true, label: 'Phone number' });
    // Allow email-shaped lookups without VN phone validation.
    const looksLikeEmail = value.includes('@');
    if (!looksLikeEmail && phoneError) {
      setCustomer(null);
      setPointsToRedeem(0);
      setCustomerLookupError(phoneError);
      return { ok: false, message: phoneError };
    }

    setCustomerBusy(true);
    try {
      const found = await apiLookupCustomer(value);
      const mapped = toCustomer(found);
      setCustomer(mapped);
      setCustomerPhone(mapped.phone || value);
      setCustomerLookupError('');
      setPointsToRedeem(0);
      return { ok: true, customer: mapped };
    } catch (error) {
      setCustomer(null);
      setPointsToRedeem(0);
      const message = error.message || 'Customer not found';
      setCustomerLookupError(message);
      return { ok: false, notFound: true, message };
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
      const voucher = await apiLookupVoucher(code, customer?.phone);
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
  }, [discountCodeInput, customer?.phone]);

  /**
   * Cashier thường gõ mã trước rồi mới nhập SĐT khách. Mã phát riêng cho một khách
   * chỉ kiểm được khi biết khách là ai, nên phải tra lại mỗi lần khách trên đơn đổi —
   * không thì mã lọt qua bước tra rồi mới hỏng lúc chốt đơn.
   */
  const appliedVoucherCode = appliedVoucher?.code;
  const validatedVoucherPhone = useRef(null);
  useEffect(() => {
    const phone = customer?.phone ?? null;
    if (validatedVoucherPhone.current === phone) return undefined;
    validatedVoucherPhone.current = phone;
    if (!appliedVoucherCode) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const voucher = await apiLookupVoucher(appliedVoucherCode, phone);
        if (!cancelled) setAppliedVoucher(voucher);
      } catch (error) {
        if (cancelled) return;
        setAppliedVoucher(null);
        setDiscountCodeError(error.message || 'Invalid or expired discount code');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer?.phone, appliedVoucherCode]);

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
          customerName: null,
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
        customerName: null,
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
      setCustomerPhone,
      setCustomerPhoneDraft,
      customerLookupError,
      customerBusy,
      checkoutBusy,
      discountCodeInput,
      setDiscountCodeInput,
      appliedVoucher,
      discountCodeError,
      discountCodeBusy,
      availablePromotions,
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
      lookupCustomerByPhone,
      selectCustomer,
      clearCustomer,
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
      customerBusy,
      checkoutBusy,
      discountCodeInput,
      appliedVoucher,
      discountCodeError,
      discountCodeBusy,
      availablePromotions,
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
      lookupCustomerByPhone,
      selectCustomer,
      clearCustomer,
      setCustomerPhoneDraft,
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
