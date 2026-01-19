import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { FAB } from '@/components/FAB';
import { Skeleton } from '@/components/ui/skeleton';

export const AppShell = ({ children }) => {
  const { user, loading, isAuthenticated, checkAuth } = useAuth();
  const navigate = useNavigate();
  const checkedRef = useRef(false);

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

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile Header */}
      <Header />
      
      {/* Desktop Sidebar - Hidden on mobile */}
      <Sidebar />
      
      {/* Main Content */}
      <main className="main-content pt-14 md:pt-0">
        <div className="feed-container px-0 md:px-4">
          {children}
        </div>
      </main>
      
      {/* Mobile Bottom Nav - Hidden on desktop */}
      <BottomNav />
      
      {/* Floating Action Button for New Post */}
      <FAB />
    </div>
  );
};
