'use client';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '32rem',
          width: '100%',
          textAlign: 'center',
          padding: '2.5rem',
          borderRadius: '1rem',
          background: 'rgba(26, 34, 44, 0.85)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div
          style={{
            width: '3rem',
            height: '3rem',
            margin: '0 auto 1.25rem',
            borderRadius: '50%',
            border: '2px solid rgba(16, 185, 129, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            fontSize: '1.5rem',
          }}
          aria-hidden
        >
          ⚡
        </div>
        <h1
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: '0.75rem',
          }}
        >
          Zora-Walat
        </h1>
        <p
          style={{
            color: '#94a3b8',
            fontSize: '1.05rem',
            lineHeight: 1.5,
            marginBottom: '1.75rem',
          }}
        >
          Send mobile top-up to Afghanistan
        </p>
        <button
          type="button"
          onClick={() => {
            window.alert(
              'Test Payment: wire this button to your Stripe Checkout or app route when ready.',
            );
          }}
          style={{
            width: '100%',
            padding: '0.875rem 1.25rem',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#020617',
            background: '#10b981',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          Test Payment
        </button>
      </div>
    </main>
  );
}
