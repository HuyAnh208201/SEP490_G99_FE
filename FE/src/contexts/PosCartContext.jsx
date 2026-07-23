import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  EARN_VND_PER_POINT,
  MOCK_DISCOUNT_CODES,
  MOCK_ORDER_HISTORY,
  POINT_VALUE_VND,
  findProductByBarcode,
  hasPromo,
  unitPrice,
} from '../pages/pos/data/mockData.js';
import {
  addPoints as apiAddPoints,
  createCustomer as apiCreateCustomer,
  searchCustomers as apiSearchCustomers,
} from '../api/cashier.js';

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

  let codeDiscount = 0;
  if (state.appliedCode) {
    const rule = MOCK_DISCOUNT_CODES[state.appliedCode];
    if (rule?.type === 'percent') {
      codeDiscount = Math.round((afterPromo * rule.value) / 100);
    } else if (rule?.type === 'fixed') {
      codeDiscount = rule.value;
    }
    codeDiscount = Math.min(codeDiscount, afterPromo);
    afterPromo -= codeDiscount;
  }

  const maxPoints = state.customer?.points ?? 0;
  const pointsUsed = Math.min(state.pointsToRedeem, maxPoints);
  const pointsDiscount = pointsUsed * POINT_VALUE_VND;
  const cappedPointsDiscount = Math.min(pointsDiscount, afterPromo);

  const total = Math.max(0, afterPromo - cappedPointsDiscount);
  const pointsEarned =
    state.customer && total > 0
      ? Math.floor(total / EARN_VND_PER_POINT)
      : 0;

  return {
    subtotalOriginal,
    subtotalAfterPromo,
    promoSavings,
    codeDiscount,
    pointsUsed: Math.floor(cappedPointsDiscount / POINT_VALUE_VND),
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
  const [appliedCode, setAppliedCode] = useState(null);
  const [discountCodeError, setDiscountCodeError] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [orderHistory, setOrderHistory] = useState(MOCK_ORDER_HISTORY);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const totals = useMemo(
    () =>
      calcTotals({
        lines,
        appliedCode,
        customer,
        pointsToRedeem,
      }),
    [lines, appliedCode, customer, pointsToRedeem],
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
    (barcode) => {
      const product = findProductByBarcode(barcode);
      if (!product) return { ok: false, message: 'Product not found' };
      addProduct(product, 1);
      return { ok: true, product };
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
    setAppliedCode(null);
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

  const applyDiscountCode = useCallback(() => {
    const code = discountCodeInput.trim().toUpperCase();
    if (!code) {
      setAppliedCode(null);
      setDiscountCodeError('');
      return { ok: true };
    }
    if (!MOCK_DISCOUNT_CODES[code]) {
      setDiscountCodeError('Invalid or expired discount code');
      return { ok: false };
    }
    setAppliedCode(code);
    setDiscountCodeError('');
    return { ok: true };
  }, [discountCodeInput]);

  const clearDiscountCode = useCallback(() => {
    setDiscountCodeInput('');
    setAppliedCode(null);
    setDiscountCodeError('');
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
        // Ghi khách + điểm TRƯỚC khi chốt đơn. Chốt xong mới ghi mà hỏng thì giỏ đã
        // bị xoá, tên khách mất luôn và cashier không còn gì để thử lại.
        let saved = customer;
        if (customer?.pending) {
          try {
            saved = toCustomer(
              await apiCreateCustomer({ fullName: customer.fullName, phone: customer.phone }),
            );
          } catch (error) {
            return { ok: false, message: error.message || 'Could not save the new customer' };
          }
        }

        // BE từ chối hoá đơn dưới 10.000đ vì không đủ 1 điểm — đừng để nó chặn thanh toán.
        let pointsEarned = 0;
        if (saved && totals.pointsEarned > 0) {
          try {
            const data = await apiAddPoints({
              phoneOrEmail: saved.phone || saved.email,
              invoiceAmount: totals.total,
            });
            pointsEarned = data.pointsEarned ?? 0;
          } catch (error) {
            return { ok: false, message: error.message || 'Could not add loyalty points' };
          }
        }

        const nextId = (orderHistory[0]?.id ?? 50) + 1;
        const order = {
          id: nextId,
          invoiceCode: `INV-2026-${String(nextId).padStart(3, '0')}`,
          createdAt: new Date().toISOString(),
          customerName: saved?.fullName ?? 'Retail',
          itemCount: totals.itemCount,
          total: totals.total,
          paymentMethod,
          status: 'COMPLETED',
          lines: [...lines],
          pointsEarned,
          pointsUsed: totals.pointsUsed,
        };

        setOrderHistory((prev) => [order, ...prev]);
        clearCart();
        setPaymentOpen(false);
        return {
          ok: true,
          order,
          change: receivedAmount - totals.total,
        };
      } finally {
        checkoutInFlight.current = false;
        setCheckoutBusy(false);
      }
    },
    [lines, totals, customer, orderHistory, clearCart],
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
      appliedCode,
      discountCodeError,
      pointsToRedeem,
      setPointsToRedeem,
      totals,
      orderHistory,
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
      appliedCode,
      discountCodeError,
      pointsToRedeem,
      totals,
      orderHistory,
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
