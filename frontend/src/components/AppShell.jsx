import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { BonitaPanel } from '@/components/BonitaPanel';
import { Header } from '@/components/Header';
import { FAB } from '@/components/FAB';
import { Skeleton } from '@/components/ui/skeleton';

export const AppShell = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-6">
          <Skeleton className="h-12 w-32 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile Header */}
      <Header />
      
      {/* Desktop Sidebar - Hidden on mobile */}
      <Sidebar />
      
      {/* Main Content */}
      <main className="main-content pt-14 md:pt-0">
        <div className="feed-container px-0 md:px-4 py-4">
          {children}
        </div>
      </main>
      
      {/* Desktop Bonita Panel - Hidden on mobile/tablet */}
      <BonitaPanel />
      
      {/* Mobile Bottom Nav - Hidden on desktop */}
      <BottomNav />
      
      {/* Floating Action Button for New Post */}
      <FAB />
    </div>
  );
};
