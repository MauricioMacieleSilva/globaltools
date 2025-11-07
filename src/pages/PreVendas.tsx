import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PreVendasSection } from '@/components/dashboard/PreVendasSection';
import { usePreVendas } from '@/context/PreVendasContext';

export function PreVendas() {
  const { leads } = usePreVendas();

  return (
    <div className="space-y-6">
      <ErrorBoundary>
        <div className="space-y-6">
          <PreVendasSection />
        </div>
      </ErrorBoundary>
    </div>
  );
}