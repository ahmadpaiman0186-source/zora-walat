import { Suspense } from 'react';

import { CheckoutSuccessReturnPage } from '@/components/topup/CheckoutSuccessReturnPage';

export default function SuccessRoutePage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessReturnPage />
    </Suspense>
  );
}
