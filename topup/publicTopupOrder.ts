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
  createdAt: string;
  updatedAt: string;
};
