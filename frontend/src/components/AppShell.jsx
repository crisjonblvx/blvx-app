import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { FAB } from '@/components/FAB';
import { TrendingWidget } from '@/components/TrendingWidget';
import { Skeleton } from '@/components/ui/skeleton';

export const AppShell = ({ children }) => {
  const { user, loading, isAuthenticated, checkAuth } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const checkedRef = useRef(false);

  const bgClass = isDark ? 'bg-black' : 'bg-white';
  const borderClass = isDark ? 'border-white/10' : 'border-black/10';
  const textMutedClass = isDark ? 'text-white/20' : 'text-black/40';
  const spinnerClass = isDark ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black';

  useEffect(() => {
    // Only redirect if we've finished loading and confirmed not authenticated
    if (!loading && !isAuthenticated && !checkedRef.current) {
      checkedRef.current = true;
      // Double-check auth status before redirecting
      checkAuth().then(() => {
        // checkAuth will handle redirect if needed
      });
    }
  }, [loading, isAuthenticated, checkAuth]);

  // Show loading state while checking auth OR if user data not yet loaded
  if (loading || (isAuthenticated && !user)) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <div className="space-y-4 w-full max-w-md p-6">
          <Skeleton className="h-8 w-24 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  // If not authenticated after loading, show nothing (redirect will happen)
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`w-10 h-10 border-2 ${spinnerClass} rounded-full animate-spin mx-auto`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass}`}>
      {/* Mobile Header */}
      <Header />
      
      {/* Desktop Sidebar - Hidden on mobile */}
      <Sidebar />
      
      {/* Main Content */}
      <main className="main-content pt-14 md:pt-0">
        <div className="flex">
          {/* Feed Container */}
          <div className="feed-container flex-1 px-0 md:px-4 max-w-2xl">
            {children}
          </div>
          
          {/* Right Sidebar - "The Word" Trending Widget (Desktop Only) */}
          <aside className={`hidden lg:block w-72 flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-l ${borderClass} p-4`}>
            <TrendingWidget className="mb-6" />
            
            {/* Footer */}
            <div className={`mt-8 text-[10px] ${textMutedClass} space-y-1`}>
              <p>© 2025 BLVX</p>
              <p>Culture first. Scale second.</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Bonita Online
              </div>
            </div>
          </aside>
        </div>
      </main>
      
      {/* Mobile Bottom Nav - Hidden on desktop */}
      <BottomNav />
      
      {/* Floating Action Button for New Post */}
      <FAB />
    </div>
  );
};
