import React from 'react';

interface TourProviderProps {
  children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  // O antigo botão "Ajuda e Tutoriais" saiu: os tutoriais agora são abertos
  // pelo Zé ("me mostra como funciona esta tela").
  return <>{children}</>;
};
