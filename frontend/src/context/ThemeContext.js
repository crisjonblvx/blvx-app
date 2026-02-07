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
  return hour >= 18 || hour < 6; // 6 PM to 6 AM
};

// Get the appropriate theme based on time
const getTimeBasedTheme = () => {
  return isEveningTime() ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  // Check if user has manually set a preference
  const [isManualOverride, setIsManualOverride] = useState(() => {
    return localStorage.getItem('blvx-theme-manual') === 'true';
  });
  
  // Initialize theme
  const [theme, setThemeState] = useState(() => {
    // If user manually set a preference, use it
    if (localStorage.getItem('blvx-theme-manual') === 'true') {
      const saved = localStorage.getItem('blvx-theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    }
    // Otherwise, use time-based auto theme
    return getTimeBasedTheme();
  });

  // Update theme when time changes (check every minute)
  useEffect(() => {
    if (isManualOverride) return; // Don't auto-switch if user set manually
    
    const checkTime = () => {
      const newTheme = getTimeBasedTheme();
      if (newTheme !== theme) {
        setThemeState(newTheme);
      }
    };
    
    // Check every minute
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [theme, isManualOverride]);

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

  // Set theme (used internally)
  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
  }, []);

  // Toggle theme (marks as manual override)
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(newTheme);
    setIsManualOverride(true);
    localStorage.setItem('blvx-theme-manual', 'true');
    localStorage.setItem('blvx-theme', newTheme);
  }, [theme]);

  // Reset to auto mode (time-based)
  const resetToAuto = useCallback(() => {
    setIsManualOverride(false);
    localStorage.removeItem('blvx-theme-manual');
    setThemeState(getTimeBasedTheme());
  }, []);

  const assets = ASSETS[theme];

  const value = {
    theme,
    setTheme,
    toggleTheme,
    resetToAuto,
    isManualOverride,
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
