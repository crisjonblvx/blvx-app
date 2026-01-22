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
  const [theme, setTheme] = useState('light'); // Default to Editorial (light) mode

  // Load saved theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('blvx-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme class to document and body
  useEffect(() => {
    // Remove old classes
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'dark', 'light');
    document.body.classList.remove('theme-dark', 'theme-light', 'light-mode', 'dark-mode');
    
    // Add new classes
    document.documentElement.classList.add(`theme-${theme}`);
    document.documentElement.classList.add(theme);
    document.body.classList.add(`${theme}-mode`);
    document.body.classList.add(`theme-${theme}`);
    
    // Set data attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    
    // Force style updates
    if (theme === 'light') {
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#000000';
    } else {
      document.body.style.backgroundColor = '#000000';
      document.body.style.color = '#ffffff';
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
