import { Navigate, useSearchParams } from 'react-router-dom';

/** Compatibility route: payment now opens beside the cart on /pos. */
export default function PosPaymentPage() {
  const [searchParams] = useSearchParams();
  const paymentMethod = searchParams.get('method') === 'payos' ? 'payos' : 'cash';

  return (
    <Navigate
      to="/pos"
      replace
      state={{ openPayment: true, paymentMethod }}
    />
  );
}
