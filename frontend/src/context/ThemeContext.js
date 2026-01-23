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
  // Initialize theme - ALWAYS dark for BLVX brand identity
  const [theme, setTheme] = useState(() => {
    // Force dark mode - BLVX brand identity
    return 'dark';
  });

  // Apply theme class to document and body - ALWAYS DARK
  useEffect(() => {
    // Remove old classes
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'dark', 'light');
    document.body.classList.remove('theme-dark', 'theme-light', 'light-mode', 'dark-mode');
    
    // Force dark mode classes - BLVX brand identity
    document.documentElement.classList.add('theme-dark');
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark-mode');
    document.body.classList.add('theme-dark');
    
    // Set data attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.setAttribute('data-theme', 'dark');
    
    // Force dark style on ALL elements
    document.documentElement.style.backgroundColor = '#000000';
    document.documentElement.style.color = '#ffffff';
    document.body.style.backgroundColor = '#000000';
    document.body.style.color = '#ffffff';
    
    // Also force on #root
    const root = document.getElementById('root');
    if (root) {
      root.style.backgroundColor = '#000000';
      root.style.color = '#ffffff';
      root.style.minHeight = '100vh';
    }
    
    localStorage.setItem('blvx-theme', 'dark');
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
