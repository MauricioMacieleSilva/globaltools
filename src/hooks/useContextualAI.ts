import { useState } from 'react';

export interface PageContext {
  pageName: string;
  data?: any;
  filters?: Record<string, any>;
  selectedItems?: any[];
  description?: string;
}

export function useContextualAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);

  const openWithContext = (context: PageContext) => {
    setPageContext(context);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    pageContext,
    openWithContext,
    close,
  };
}
