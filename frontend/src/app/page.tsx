import { Suspense } from 'react';
import { DiscoveryScreen } from '../features/discovery';
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <p
          className="p-5"
          role="status"
        >
          در حال بارگذاری…
        </p>
      }
    >
      <DiscoveryScreen />
    </Suspense>
  );
}
