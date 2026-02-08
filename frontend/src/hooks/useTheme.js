import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });
  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  
  return isDark;
};

// Common theme-aware class helpers
export const useThemeClasses = () => {
  const isDark = useTheme();
  
  return {
    isDark,
    textClass: isDark ? 'text-white' : 'text-gray-900',
    textMutedClass: isDark ? 'text-white/50' : 'text-gray-500',
    textVeryMutedClass: isDark ? 'text-white/40' : 'text-gray-400',
    textVeryVeryMutedClass: isDark ? 'text-white/30' : 'text-gray-300',
    borderClass: isDark ? 'border-white/10' : 'border-gray-200',
    borderLightClass: isDark ? 'border-white/20' : 'border-gray-300',
    hoverBgClass: isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100',
    bgActiveClass: isDark ? 'bg-white/10' : 'bg-gray-100',
    avatarFallbackClass: isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700',
    hoverTextClass: isDark ? 'hover:text-white' : 'hover:text-gray-900',
  };
};
