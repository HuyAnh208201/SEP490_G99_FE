import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
  /** Số điểm vừa cộng, để hiện xác nhận sau khi bấm Add points. */
  const [pointsAwarded, setPointsAwarded] = useState(null);
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
    setPointsAwarded(null);
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
    setPointsAwarded(null);
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
    setPointsAwarded(null);
    setPointsToRedeem(0);
  }, []);

  /** Tạo nhanh khách mới tại quầy rồi gắn luôn vào đơn. */
  const createCustomer = useCallback(async ({ fullName, phone }) => {
    const name = String(fullName ?? '').trim();
    const number = String(phone ?? '').trim();
    if (!name || !number) {
      setCustomerLookupError('Enter both a name and a phone number.');
      return { ok: false };
    }
    setCustomerBusy(true);
    try {
      const created = toCustomer(await apiCreateCustomer({ fullName: name, phone: number }));
      setCustomer(created);
      setCustomerPhone(created.phone ?? number);
      setCustomerResults([]);
      setCustomerNotFound(false);
      setCustomerLookupError('');
      setPointsAwarded(null);
      setPointsToRedeem(0);
      return { ok: true, customer: created };
    } catch (error) {
      setCustomerLookupError(error.message || 'Could not create customer');
      return { ok: false };
    } finally {
      setCustomerBusy(false);
    }
  }, []);

  /** Cộng điểm cho khách theo tổng tiền đang có trên giỏ (10.000đ = 1 điểm). */
  const awardPoints = useCallback(async () => {
    if (!customer) return { ok: false };
    if (totals.total <= 0) {
      setCustomerLookupError('Add products to the cart before earning points.');
      return { ok: false };
    }
    setCustomerBusy(true);
    try {
      const data = await apiAddPoints({
        phoneOrEmail: customer.phone || customer.email,
        invoiceAmount: totals.total,
      });
      setCustomer((current) =>
        current ? { ...current, points: data.totalPoints ?? current.points } : current,
      );
      setPointsAwarded(data.pointsEarned ?? 0);
      setCustomerLookupError('');
      return { ok: true, data };
    } catch (error) {
      setCustomerLookupError(error.message || 'Could not add points');
      return { ok: false };
    } finally {
      setCustomerBusy(false);
    }
  }, [customer, totals.total]);

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
    ({ receivedAmount, paymentMethod = 'CASH' }) => {
      if (lines.length === 0) {
        return { ok: false, message: 'Cart is empty' };
      }
      if (receivedAmount < totals.total) {
        return { ok: false, message: 'Insufficient cash received' };
      }

      const nextId = (orderHistory[0]?.id ?? 50) + 1;
      const order = {
        id: nextId,
        invoiceCode: `INV-2026-${String(nextId).padStart(3, '0')}`,
        createdAt: new Date().toISOString(),
        customerName: customer?.fullName ?? 'Retail',
        itemCount: totals.itemCount,
        total: totals.total,
        paymentMethod,
        status: 'COMPLETED',
        lines: [...lines],
        pointsEarned: totals.pointsEarned,
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
      pointsAwarded,
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
      createCustomer,
      awardPoints,
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
      pointsAwarded,
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
      createCustomer,
      awardPoints,
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
