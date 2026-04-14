/** Public top-up order returned by `/api/topup-orders` (matches server JSON). */
export type PublicTopupOrder = {
  id: string;
  sessionKey: string;
  originCountry: string;
  destinationCountry: string;
  productType: string;
  operatorKey: string;
  operatorLabel: string;
  phoneNumber: string;
  productId: string;
  productName: string;
  selectedAmountLabel: string;
  amountUsd: number;
  amountCents: number;
  currency: string;
  paymentIntentId: string | null;
  paymentStatus: string;
  fulfillmentStatus: string;
  /** Present when the order was created with a logged-in account (no raw user id). */
  accountLinked?: boolean;
  /** True when the viewer is the bound account (JWT matches stored binding). */
  viewerIsBoundUser?: boolean;
  createdAt: string;
  updatedAt: string;
};
