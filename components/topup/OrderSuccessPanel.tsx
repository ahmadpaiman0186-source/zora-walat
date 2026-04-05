'use client';

import type { PublicTopupOrder } from '@/topup/publicTopupOrder';
import type { UiLocale, UiMessages } from '@/messages';
import {
  DESTINATION_COUNTRIES,
  ORIGIN_COUNTRIES,
  countryLabel as catalogCountryLabel,
} from '@/topup/catalog';
import type { ProductType } from '@/topup/catalog';

import styles from './OrderSuccessPanel.module.css';

type Props = {
  order: PublicTopupOrder;
  messages: UiMessages;
  locale: UiLocale;
  formatUsd: (cents: number, loc: UiLocale) => string;
  productLabel: (type: ProductType, m: UiMessages) => string;
  onAgain: () => void;
};

function paymentStatusLabel(status: string, m: UiMessages): string {
  switch (status) {
    case 'paid':
      return m.orderReceipt.payPaid;
    case 'pending':
      return m.orderReceipt.payPending;
    case 'failed':
      return m.orderReceipt.payFailed;
    case 'refunded':
      return m.orderReceipt.payRefunded;
    default:
      return status;
  }
}

function fulfillmentStatusLabel(status: string, m: UiMessages): string {
  switch (status) {
    case 'pending':
      return m.orderReceipt.fulPending;
    case 'queued':
      return m.orderReceipt.fulQueued;
    case 'processing':
      return m.orderReceipt.fulProcessing;
    case 'delivered':
      return m.orderReceipt.fulDelivered;
    case 'failed':
      return m.orderReceipt.fulFailed;
    default:
      return status;
  }
}

export function OrderSuccessPanel({
  order,
  messages: m,
  locale,
  formatUsd,
  productLabel,
  onAgain,
}: Props) {
  const from = catalogCountryLabel(order.originCountry, ORIGIN_COUNTRIES);
  const to = catalogCountryLabel(
    order.destinationCountry,
    DESTINATION_COUNTRIES,
  );
  const pt =
    order.productType === 'airtime' ||
    order.productType === 'data' ||
    order.productType === 'calling'
      ? productLabel(order.productType, m)
      : order.productType;

  return (
    <section
      className={styles.wrap}
      aria-live="polite"
      aria-labelledby="order-success-title"
    >
      <div className={styles.icon} aria-hidden>
        ✓
      </div>
      <h2 id="order-success-title" className={styles.title}>
        {m.orderReceipt.title}
      </h2>
      <p className={styles.subtitle}>{m.orderReceipt.subtitle}</p>

      <div className={styles.receipt}>
        <div className={styles.receiptRow}>
          <span className={styles.receiptKey}>{m.orderReceipt.orderId}</span>
          <span className={styles.receiptVal}>{order.id}</span>
        </div>
        <div className={styles.receiptRow}>
          <span className={styles.receiptKey}>{m.orderReceipt.route}</span>
          <span className={styles.receiptVal}>
            {from} → {to}
          </span>
        </div>
        <div className={styles.receiptRow}>
          <span className={styles.receiptKey}>{m.orderReceipt.product}</span>
          <span className={styles.receiptVal}>{pt}</span>
        </div>
        <div className={styles.receiptRow}>
          <span className={styles.receiptKey}>{m.orderReceipt.operator}</span>
          <span className={styles.receiptVal}>{order.operatorLabel}</span>
        </div>
        <div className={styles.receiptRow}>
          <span className={styles.receiptKey}>{m.orderReceipt.recipient}</span>
          <span className={styles.receiptVal}>{order.phoneNumber}</span>
        </div>
        <div className={styles.receiptRow}>
          <span className={styles.receiptKey}>{m.orderReceipt.plan}</span>
          <span className={styles.receiptVal}>
            {order.selectedAmountLabel}
          </span>
        </div>
        <div className={styles.divider} />
        <div className={styles.receiptRow}>
          <span className={styles.receiptKey}>{m.orderReceipt.total}</span>
          <span className={styles.receiptTotal}>
            {formatUsd(order.amountCents, locale)}
          </span>
        </div>
        <div className={styles.receiptRow}>
          <span className={styles.receiptKey}>{m.orderReceipt.payment}</span>
          <span className={styles.receiptVal}>
            {paymentStatusLabel(order.paymentStatus, m)}
          </span>
        </div>
        <div className={styles.receiptRow}>
          <span className={styles.receiptKey}>{m.orderReceipt.fulfillment}</span>
          <span className={styles.receiptVal}>
            {fulfillmentStatusLabel(order.fulfillmentStatus, m)}
          </span>
        </div>
        {order.paymentIntentId ? (
          <div className={styles.receiptRow}>
            <span className={styles.receiptKey}>{m.orderReceipt.paymentRef}</span>
            <span className={styles.receiptMono}>{order.paymentIntentId}</span>
          </div>
        ) : null}
      </div>

      <button type="button" className={styles.ctaGhost} onClick={onAgain}>
        {m.success.again}
      </button>
    </section>
  );
}
