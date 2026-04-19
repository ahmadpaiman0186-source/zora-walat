import Link from 'next/link';

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

function readParam(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0];
  return '';
}

/**
 * Stripe Checkout redirects here with session_id and order_id (from server `buildStripeCheckoutReturnUrls`).
 * Keep query param names aligned with the API PaymentCheckout success_url.
 */
export default function CheckoutSuccessPage({ searchParams }: Props) {
  const sessionId = readParam(searchParams.session_id);
  const orderId = readParam(searchParams.order_id);
  const missingStripeParams = !sessionId || !orderId;

  return (
    <main
      style={{
        maxWidth: '40rem',
        margin: '2rem auto',
        padding: '0 1rem',
        fontFamily: 'system-ui, sans-serif',
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ color: '#0b6e0b', fontSize: '1.35rem' }}>Payment successful</h1>
      {missingStripeParams ? (
        <p
          style={{
            background: '#fff8e6',
            border: '1px solid #e6a800',
            padding: '0.75rem',
            borderRadius: 6,
            fontSize: '0.95rem',
          }}
        >
          <strong>Note:</strong> Expected <code>session_id</code> or <code>order_id</code> from Stripe is missing.
          If you opened this URL manually, that is fine. If you returned from Checkout, confirm the web app origin
          matches <code>Origin</code> when creating the session (local default: port <strong>3000</strong>).
        </p>
      ) : null}
      <p>Stripe Checkout completed. The API will process the payment confirmation via webhook.</p>
      <dl style={{ marginTop: '1.25rem' }}>
        <dt style={{ fontWeight: 600 }}>Checkout session</dt>
        <dd style={{ margin: 0 }}>
          <code style={{ background: '#f0f0f0', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
            {sessionId || '—'}
          </code>
        </dd>
        <dt style={{ fontWeight: 600, marginTop: '0.75rem' }}>Order</dt>
        <dd style={{ margin: 0 }}>
          <code style={{ background: '#f0f0f0', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
            {orderId || '—'}
          </code>
        </dd>
      </dl>
      <p style={{ color: '#555', fontSize: '0.9rem', marginTop: '1.5rem' }}>
        Local Zora-Walat web app — you can close this tab or return home.
      </p>
      <p>
        <Link href="/" style={{ color: '#2563eb' }}>
          Back to top-up
        </Link>
      </p>
    </main>
  );
}
