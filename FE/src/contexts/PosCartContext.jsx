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
  findCustomerByPhone,
  findProductByBarcode,
  hasPromo,
  unitPrice,
} from '../pages/pos/data/mockData.js';

const PosCartContext = createContext(null);

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
    setDiscountCodeInput('');
    setAppliedCode(null);
    setDiscountCodeError('');
    setPointsToRedeem(0);
  }, []);

  const lookupCustomer = useCallback((phone) => {
    const value = String(phone ?? '').trim();
    setCustomerPhone(value);
    if (!value) {
      setCustomer(null);
      setCustomerLookupError('');
      setPointsToRedeem(0);
      return { ok: true, retail: true };
    }
    const found = findCustomerByPhone(value);
    if (!found) {
      setCustomer(null);
      setCustomerLookupError('Phone not found in membership system');
      setPointsToRedeem(0);
      return { ok: false };
    }
    setCustomer(found);
    setCustomerLookupError('');
    return { ok: true, customer: found };
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
      applyDiscountCode,
      clearDiscountCode,
      completeCashPayment,
    }),
    [
      lines,
      customer,
      customerPhone,
      customerLookupError,
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
