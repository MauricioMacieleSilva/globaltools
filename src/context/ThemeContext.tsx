import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'classic' | 'modern';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isModern: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved === 'modern' || saved === 'classic') ? saved : 'classic';
  });

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    if (theme === 'modern') {
      document.documentElement.classList.add('theme-modern');
    } else {
      document.documentElement.classList.remove('theme-modern');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'classic' ? 'modern' : 'classic');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isModern: theme === 'modern' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
