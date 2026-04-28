import Link from 'next/link';

export default function CheckoutCancelPage() {
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
      <h1 style={{ fontSize: '1.35rem' }}>Checkout cancelled</h1>
      <p>You left Stripe Checkout before completing payment. No charge was made.</p>
      <p>
        <Link href="/" style={{ color: '#2563eb' }}>
          Back to top-up
        </Link>
      </p>
    </main>
  );
}
