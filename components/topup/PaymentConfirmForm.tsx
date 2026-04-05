'use client';

import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { FormEvent, useState } from 'react';

import styles from './ZoraWalatTopUp.module.css';

type Props = {
  payButtonLabel: string;
  processingLabel: string;
  onSuccess: () => void | Promise<void>;
  onError: (message: string) => void;
};

export function PaymentConfirmForm({
  payButtonLabel,
  processingLabel,
  onSuccess,
  onError,
}: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });
    setSubmitting(false);
    if (error) {
      onError(error.message ?? 'Payment failed');
      return;
    }
    await Promise.resolve(onSuccess());
  };

  const disabled = !stripe || submitting;

  return (
    <form className={styles.stripeForm} onSubmit={handleSubmit}>
      <div className={styles.paymentElementWrap}>
        <PaymentElement />
      </div>
      <button type="submit" disabled={disabled} className={styles.paySubmit}>
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
