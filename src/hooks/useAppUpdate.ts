import { useCallback } from 'react';

interface UseAppUpdateReturn {
  updateAvailable: boolean;
  isUpdating: boolean;
  triggerUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

// No-op: Service Worker removed in favor of manifest-only PWA install flow.
// Kept as a stub so existing imports (UpdateNotification) keep working.
export const useAppUpdate = (): UseAppUpdateReturn => {
  const triggerUpdate = useCallback(async () => {
    window.location.reload();
  }, []);
  const dismissUpdate = useCallback(() => {}, []);

  return {
    updateAvailable: false,
    isUpdating: false,
    triggerUpdate,
    dismissUpdate,
  };
};