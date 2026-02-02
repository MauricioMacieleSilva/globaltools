import React from 'react';
import { TourButton } from './TourButton';

interface TourProviderProps {
  children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  return (
    <>
      {children}
      <TourButton />
    </>
  );
};
