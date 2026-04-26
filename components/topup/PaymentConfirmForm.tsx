'use client';

import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { FormEvent, useState } from 'react';

import { getStripeEmbeddedPaymentReturnUrl } from '@/lib/stripe/embeddedPaymentReturnUrl';
import styles from './ZoraWalatTopUp.module.css';

type Props = {
  payButtonLabel: string;
  processingLabel: string;
  onSuccess: () => void | Promise<void>;
  onError: (message: string) => void;
};

/**
 * Embedded Payment Element + `confirmPayment`.
 *
 * `useStripe()` / `useElements()` can be non-null before the Payment Element iframe
 * has mounted. Calling `confirmPayment({ elements })` before mount causes:
 * `IntegrationError: ... should have a mounted Payment Element`.
 *
 * We gate on `PaymentElement`'s `onReady` and on `elements.getElement(PaymentElement)`.
 */
export function PaymentConfirmForm({
  payButtonLabel,
  processingLabel,
  onSuccess,
  onError,
}: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  /** True only after Stripe fires `ready` on this Payment Element instance. */
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [paymentElementLoadFailed, setPaymentElementLoadFailed] =
    useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    if (!paymentElementReady) {
      onError('Payment form is still loading. Please wait a moment.');
      return;
    }
    const mounted = elements.getElement(PaymentElement);
    if (!mounted) {
      onError('Payment form is not ready. Please wait or refresh the page.');
      return;
    }

    setSubmitting(true);
    try {
      let returnUrl: string;
      try {
        returnUrl = getStripeEmbeddedPaymentReturnUrl();
      } catch {
        onError(
          'Checkout could not determine a return address. Refresh the page and try again.',
        );
        return;
      }
      if (!returnUrl.startsWith('http://') && !returnUrl.startsWith('https://')) {
        onError('Invalid checkout URL. Use http:// or https:// and try again.');
        return;
      }
      if (process.env.NODE_ENV === 'development') {
        // Safe shape only — never log full URLs with tokens.
        console.info('[stripe] confirmPayment', {
          returnUrlLength: returnUrl.length,
          origin: typeof window !== 'undefined' ? window.location.origin : null,
        });
      }
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      });
      if (error) {
        onError(error.message ?? 'Payment failed');
        return;
      }
      await Promise.resolve(onSuccess());
    } finally {
      setSubmitting(false);
    }
  };

  const payDisabled =
    !stripe || !elements || submitting || !paymentElementReady;

  return (
    <form className={styles.stripeForm} onSubmit={handleSubmit}>
      <div className={styles.paymentElementWrap}>
        <PaymentElement
          onReady={() => setPaymentElementReady(true)}
          onLoadError={(e) => {
            setPaymentElementLoadFailed(true);
            onError(
              e.error?.message ??
                'Payment fields failed to load. Check the browser console and your Stripe keys.',
            );
          }}
        />
      </div>
      {!paymentElementReady && !paymentElementLoadFailed && (
        <p className={styles.paymentElementStatus} role="status" aria-live="polite">
          Loading secure payment fields…
        </p>
      )}
      <button type="submit" disabled={payDisabled} className={styles.paySubmit}>
        {submitting ? (
          <span className={styles.submitInner}>
            <span className={styles.spinner} aria-hidden />
            <span>{processingLabel}</span>
          </span>
        ) : (
          payButtonLabel
        )}
      </button>
    </form>
  );
}
