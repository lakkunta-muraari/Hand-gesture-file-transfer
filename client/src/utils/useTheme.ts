import { useState, useEffect } from 'react';
import { getInitialTheme, applyTheme, toggleTheme as toggle, type Theme } from './theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);

    const handleThemeChange = (e: CustomEvent<Theme>) => {
      setTheme(e.detail);
    };

    window.addEventListener('theme-change', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('theme-change', handleThemeChange as EventListener);
    };
  }, [theme]);

  const toggleTheme = () => {
    const next = toggle();
    setTheme(next);
  };

  return { theme, isDark: theme === 'dark', toggleTheme };
}
