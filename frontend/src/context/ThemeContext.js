import { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

// Check if it's "evening" (6 PM - 6 AM)
const isEveningTime = () => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
};

// Get the appropriate theme based on time
const getTimeBasedTheme = () => {
  return isEveningTime() ? 'dark' : 'light';
};

// Get initial theme - prioritize what HTML already set to avoid flash
const getInitialTheme = () => {
  // Check if HTML already determined theme (set by inline script)
  if (typeof window !== 'undefined' && window.__BLVX_INITIAL_THEME__) {
    return window.__BLVX_INITIAL_THEME__;
  }
  
  // Fallback: check localStorage
  if (localStorage.getItem('blvx-theme-manual') === 'true') {
    const saved = localStorage.getItem('blvx-theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  }
  
  // Default: time-based
  return getTimeBasedTheme();
};

export const ThemeProvider = ({ children }) => {
  const [isManualOverride, setIsManualOverride] = useState(() => {
    return localStorage.getItem('blvx-theme-manual') === 'true';
  });
  
  const [theme, setThemeState] = useState(getInitialTheme);

  // Update theme when time changes (check every minute)
  useEffect(() => {
    if (isManualOverride) return;
    
    const checkTime = () => {
      const newTheme = getTimeBasedTheme();
      if (newTheme !== theme) {
        setThemeState(newTheme);
      }
    };
    
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [theme, isManualOverride]);

  // Apply theme to DOM
  useEffect(() => {
    const isDark = theme === 'dark';
    const html = document.documentElement;
    const body = document.body;
    
    // Remove old classes
    html.classList.remove('theme-dark', 'theme-light', 'dark', 'light');
    body.classList.remove('theme-dark', 'theme-light', 'light-mode', 'dark-mode');
    
    // Apply new classes
    html.classList.add(`theme-${theme}`, theme);
    body.classList.add(`${theme}-mode`, `theme-${theme}`);
    
    // Set data attribute
    html.setAttribute('data-theme', theme);
    body.setAttribute('data-theme', theme);
    
    // Apply inline styles (backup for specificity)
    const bgColor = isDark ? '#000000' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#111111';
    
    html.style.backgroundColor = bgColor;
    html.style.color = textColor;
    body.style.backgroundColor = bgColor;
    body.style.color = textColor;
    
    // Also style #root
    const root = document.getElementById('root');
    if (root) {
      root.style.backgroundColor = bgColor;
      root.style.color = textColor;
      root.style.minHeight = '100vh';
    }
    
    // Persist to localStorage
    localStorage.setItem('blvx-theme', theme);
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(newTheme);
    setIsManualOverride(true);
    localStorage.setItem('blvx-theme-manual', 'true');
    localStorage.setItem('blvx-theme', newTheme);
  }, [theme]);

  const resetToAuto = useCallback(() => {
    setIsManualOverride(false);
    localStorage.removeItem('blvx-theme-manual');
    setThemeState(getTimeBasedTheme());
  }, []);

  const assets = ASSETS[theme];

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      resetToAuto,
      isManualOverride,
      isDark: theme === 'dark',
      isLight: theme === 'light',
      assets,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
