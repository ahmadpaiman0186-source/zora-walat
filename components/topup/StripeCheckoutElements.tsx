'use client';

import { Elements } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { memo, useMemo } from 'react';

import { PaymentConfirmForm } from './PaymentConfirmForm';

export type StripeCheckoutElementsProps = {
  stripe: Stripe;
  clientSecret: string;
  payButtonLabel: string;
  processingLabel: string;
  onSuccess: () => void | Promise<void>;
  onError: (message: string) => void;
};

/**
 * Isolated Stripe Elements tree so parent re-renders (phone, country, summary)
 * do not pass a new `options` object every frame — that churn triggers Stripe.js
 * DOM teardown (`removeChild`) while React is reconciling and can crash.
 */
function StripeCheckoutElementsInner({
  stripe,
  clientSecret,
  payButtonLabel,
  processingLabel,
  onSuccess,
  onError,
}: StripeCheckoutElementsProps) {
  const elementsOptions = useMemo((): StripeElementsOptions => {
    return {
      clientSecret,
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#10b981',
          borderRadius: '10px',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
        },
      },
    };
  }, [clientSecret]);

  return (
    <Elements
      key={clientSecret}
      stripe={stripe}
      options={elementsOptions}
    >
      <PaymentConfirmForm
        payButtonLabel={payButtonLabel}
        processingLabel={processingLabel}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}

export const StripeCheckoutElements = memo(StripeCheckoutElementsInner);
