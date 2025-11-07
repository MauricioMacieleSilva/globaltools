import { useState, useEffect, useCallback } from 'react';

interface UseAppUpdateReturn {
  updateAvailable: boolean;
  isUpdating: boolean;
  triggerUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

interface VersionInfo {
  version: string;
  timestamp: string;
}

export const useAppUpdate = (): UseAppUpdateReturn => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  // Memoized version management functions
  const getInstalledVersion = useCallback(() => localStorage.getItem('app-installed-version'), []);
  const getDismissedVersion = useCallback(() => localStorage.getItem('app-dismissed-version'), []);
  const setInstalledVersion = useCallback((version: string) => localStorage.setItem('app-installed-version', version), []);
  const setDismissedVersion = useCallback((version: string) => localStorage.setItem('app-dismissed-version', version), []);

  const checkVersionUpdate = useCallback(async () => {
    try {
      const response = await fetch('/version.json?' + Date.now());
      const versionInfo: VersionInfo = await response.json();
      
      if (!currentVersion) {
        setCurrentVersion(versionInfo.version);
        return;
      }
      
      const installedVersion = getInstalledVersion();
      const dismissedVersion = getDismissedVersion();
      
      // Only show update if version is different from both installed and dismissed
      if (versionInfo.version !== currentVersion && 
          versionInfo.version !== installedVersion && 
          versionInfo.version !== dismissedVersion) {
        console.log('New version detected:', versionInfo.version, 'Current:', currentVersion);
        setUpdateAvailable(true);
      }
    } catch (error) {
      console.error('Error checking version:', error);
    }
  }, [currentVersion, getInstalledVersion, getDismissedVersion]);

  const checkServiceWorkerUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        // Check if there's a waiting service worker
        if (registration.waiting) {
          console.log('Waiting service worker detected');
          setUpdateAvailable(true);
          return;
        }

        // Use MessageChannel for version check
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'UPDATE_AVAILABLE') {
            const installedVersion = getInstalledVersion();
            const dismissedVersion = getDismissedVersion();
            
            // Only show update if not already dismissed
            if (event.data.payload.newVersion !== dismissedVersion) {
              console.log('Update available via SW message:', event.data.payload);
              setUpdateAvailable(true);
            }
          }
        };

        registration.active?.postMessage(
          { type: 'CHECK_UPDATE' }, 
          [messageChannel.port2]
        );
      }
    } catch (error) {
      console.error('Error checking SW updates:', error);
    }
  }, [getInstalledVersion, getDismissedVersion]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const handleSWMessage = (event: MessageEvent) => {
      // Only handle specific update messages, ignore SW_UPDATED
      if (event.data && event.data.type === 'UPDATE_CHECK_RESPONSE') {
        console.log('Update check response:', event.data.payload);
        if (event.data.payload.updateAvailable) {
          setUpdateAvailable(true);
        }
      }
    };

    const initializeVersionCheck = async () => {
      // Get initial version
      try {
        const response = await fetch('/version.json');
        const versionInfo: VersionInfo = await response.json();
        setCurrentVersion(versionInfo.version);
        
        // Mark as installed if not already stored
        if (!getInstalledVersion()) {
          setInstalledVersion(versionInfo.version);
        }
      } catch (error) {
        console.error('Error fetching initial version:', error);
      }
    };

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    // Initialize
    initializeVersionCheck();
    checkServiceWorkerUpdate();

    // Check for updates periodically (every 5 minutes)
    const versionInterval = setInterval(checkVersionUpdate, 5 * 60 * 1000);
    const swInterval = setInterval(checkServiceWorkerUpdate, 10 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      clearInterval(versionInterval);
      clearInterval(swInterval);
    };
  }, [checkVersionUpdate, checkServiceWorkerUpdate, getInstalledVersion, setInstalledVersion]);

  const triggerUpdate = useCallback(async () => {
    setIsUpdating(true);
    
    try {
      // Mark current version as installed before updating
      if (currentVersion) {
        setInstalledVersion(currentVersion);
      }
      
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration && registration.waiting) {
        // Tell the waiting service worker to skip waiting
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Listen for controlling change
        const handleControllerChange = () => {
          window.location.reload();
        };
        
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true });
      } else {
        // Fallback: just reload the page
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating app:', error);
      setIsUpdating(false);
      throw error;
    }
  }, [currentVersion, setInstalledVersion]);

  const dismissUpdate = useCallback(() => {
    // Mark current version as dismissed
    if (currentVersion) {
      setDismissedVersion(currentVersion);
    }
    setUpdateAvailable(false);
  }, [currentVersion, setDismissedVersion]);

  return {
    updateAvailable,
    isUpdating,
    triggerUpdate,
    dismissUpdate
  };
};