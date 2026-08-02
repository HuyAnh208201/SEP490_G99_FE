import { Navigate } from 'react-router-dom';

/** Legacy route — unified Payment screen owns Cash + PayOS. */
export default function PayOSPaymentPage() {
  return <Navigate to="/pos/payment?method=payos" replace />;
}
