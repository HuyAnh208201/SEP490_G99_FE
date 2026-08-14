import { Navigate } from 'react-router-dom';

/** Compatibility route retained for old bookmarks. */
export default function CashPaymentPage() {
  return <Navigate to="/pos" replace state={{ openPayment: true, paymentMethod: 'cash' }} />;
}
