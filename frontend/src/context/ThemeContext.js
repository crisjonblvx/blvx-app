import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Asset mapping based on theme
const ASSETS = {
  dark: {
    logo: '/assets/logo-white.png',
    icon: '/assets/icon-white.png',
  },
  light: {
    logo: '/assets/logo-dark.png',
    icon: '/assets/icon-dark.png',
  }
};

export const ThemeProvider = ({ children }) => {
  // Initialize theme - default to light, respect user preference
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('blvx-theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Default to light
    return 'light';
  });

  // Apply theme class to document and body
  useEffect(() => {
    const isDark = theme === 'dark';
    
    // Remove old classes
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'dark', 'light');
    document.body.classList.remove('theme-dark', 'theme-light', 'light-mode', 'dark-mode');
    
    // Apply theme classes
    document.documentElement.classList.add(`theme-${theme}`);
    document.documentElement.classList.add(theme);
    document.body.classList.add(`${theme}-mode`);
    document.body.classList.add(`theme-${theme}`);
    
    // Set data attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    
    // Apply theme colors
    if (isDark) {
      document.documentElement.style.backgroundColor = '#000000';
      document.documentElement.style.color = '#ffffff';
      document.body.style.backgroundColor = '#000000';
      document.body.style.color = '#ffffff';
    } else {
      document.documentElement.style.backgroundColor = '#ffffff';
      document.documentElement.style.color = '#111111';
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#111111';
    }
    
    // Also apply to #root
    const root = document.getElementById('root');
    if (root) {
      root.style.backgroundColor = isDark ? '#000000' : '#ffffff';
      root.style.color = isDark ? '#ffffff' : '#111111';
      root.style.minHeight = '100vh';
    }
    
    localStorage.setItem('blvx-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const assets = ASSETS[theme];

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    assets,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
