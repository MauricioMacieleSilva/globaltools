import { useCallback } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useLocation } from 'react-router-dom';
import { tourStepsByRoute, sidebarSteps } from '@/components/tour/tourSteps';

const TOUR_SEEN_KEY = 'global-aco-tour-seen';

export function useTour() {
  const location = useLocation();
  const currentPath = location.pathname;

  const getSeenTours = useCallback((): Record<string, boolean> => {
    try {
      const stored = localStorage.getItem(TOUR_SEEN_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  const markTourAsSeen = useCallback((path: string) => {
    const seen = getSeenTours();
    seen[path] = true;
    localStorage.setItem(TOUR_SEEN_KEY, JSON.stringify(seen));
  }, [getSeenTours]);

  const hasSeenTour = useCallback((path: string): boolean => {
    const seen = getSeenTours();
    return !!seen[path];
  }, [getSeenTours]);

  const resetAllTours = useCallback(() => {
    localStorage.removeItem(TOUR_SEEN_KEY);
  }, []);

  const createDriver = useCallback((): Driver => {
    return driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Próximo',
      prevBtnText: 'Anterior',
      doneBtnText: 'Concluir',
      progressText: '{{current}} de {{total}}',
      popoverClass: 'global-aco-tour-popover',
      overlayColor: 'rgba(0, 0, 0, 0.75)',
      stagePadding: 8,
      stageRadius: 8,
      animate: true,
      allowClose: true,
      onDestroyed: () => {
        markTourAsSeen(currentPath);
      }
    });
  }, [currentPath, markTourAsSeen]);

  const startPageTour = useCallback(() => {
    const tourConfig = tourStepsByRoute[currentPath];
    
    if (!tourConfig || tourConfig.steps.length === 0) {
      console.log('No tour available for this page:', currentPath);
      return false;
    }

    // Filter steps to only include elements that exist on the page
    const availableSteps = tourConfig.steps.filter(step => {
      if (typeof step.element === 'string') {
        return document.querySelector(step.element) !== null;
      }
      return true;
    });

    if (availableSteps.length === 0) {
      console.log('No tour elements found on page:', currentPath);
      return false;
    }

    const driverObj = createDriver();
    driverObj.setSteps(availableSteps);
    driverObj.drive();
    
    return true;
  }, [currentPath, createDriver]);

  const startSidebarTour = useCallback(() => {
    // Filter steps to only include elements that exist
    const availableSteps = sidebarSteps.filter(step => {
      if (typeof step.element === 'string') {
        return document.querySelector(step.element) !== null;
      }
      return true;
    });

    if (availableSteps.length === 0) {
      console.log('No sidebar tour elements found');
      return false;
    }

    const driverObj = createDriver();
    driverObj.setSteps(availableSteps);
    driverObj.drive();
    
    return true;
  }, [createDriver]);

  const startFullTour = useCallback(() => {
    // Start with sidebar, then page tour
    const tourConfig = tourStepsByRoute[currentPath];
    
    // Filter sidebar steps
    const availableSidebarSteps = sidebarSteps.filter(step => {
      if (typeof step.element === 'string') {
        return document.querySelector(step.element) !== null;
      }
      return true;
    });

    // Filter page steps
    const availablePageSteps = tourConfig?.steps.filter(step => {
      if (typeof step.element === 'string') {
        return document.querySelector(step.element) !== null;
      }
      return true;
    }) || [];

    const allSteps = [...availableSidebarSteps, ...availablePageSteps];

    if (allSteps.length === 0) {
      console.log('No tour elements found');
      return false;
    }

    const driverObj = createDriver();
    driverObj.setSteps(allSteps);
    driverObj.drive();
    
    return true;
  }, [currentPath, createDriver]);

  const getCurrentTourInfo = useCallback(() => {
    const tourConfig = tourStepsByRoute[currentPath];
    return {
      hasPageTour: !!tourConfig && tourConfig.steps.length > 0,
      title: tourConfig?.title || 'Esta página',
      hasSeen: hasSeenTour(currentPath)
    };
  }, [currentPath, hasSeenTour]);

  return {
    startPageTour,
    startSidebarTour,
    startFullTour,
    hasSeenTour,
    markTourAsSeen,
    resetAllTours,
    getCurrentTourInfo,
    currentPath
  };
}
