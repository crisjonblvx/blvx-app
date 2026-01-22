import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { PostCard } from '@/components/PostCard';
import { WelcomeModal } from '@/components/WelcomeModal';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Lock, Globe, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function HomePage() {
  const { user } = useAuth();
  const { posts, loading, fetchFeed, fetchExploreFeed, setPosts } = usePosts();
  const [feedType, setFeedType] = useState('block');
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [cookoutPosts, setCookoutPosts] = useState([]);
  const [cookoutLoading, setCookoutLoading] = useState(false);
  const hasGeneratedFreshContent = useRef(false);

  // Show welcome modal for first-time users
  useEffect(() => {
    if (user && !user.has_seen_welcome) {
      setShowWelcome(true);
    }
  }, [user]);

  // Fetch cookout posts
  const fetchCookout = useCallback(async () => {
    if (!user?.is_vouched) return;
    setCookoutLoading(true);
    try {
      const response = await axios.get(`${API}/api/posts/cookout`, { withCredentials: true });
      setCookoutPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch cookout:', error);
      setCookoutPosts([]);
    } finally {
      setCookoutLoading(false);
    }
  }, [user?.is_vouched]);

  // Generate fresh Bonita content on first load
  const generateFreshContent = useCallback(async () => {
    if (hasGeneratedFreshContent.current) return;
    hasGeneratedFreshContent.current = true;
    
    try {
      console.log('[Feed] Generating fresh Bonita content...');
      // Generate 2-3 fresh sparks in parallel
      const promises = [
        axios.post(`${API}/api/spark/drop`, {}, { withCredentials: true }).catch(() => null),
        axios.post(`${API}/api/spark/drop`, {}, { withCredentials: true }).catch(() => null),
      ];
      await Promise.all(promises);
      console.log('[Feed] Fresh content generated!');
    } catch (error) {
      console.log('[Feed] Could not generate fresh content:', error);
    }
  }, []);

  // Load feed function
  const loadFeed = useCallback(async (showToast = false) => {
    try {
      if (feedType === 'block') {
        await fetchFeed();
      } else if (feedType === 'cookout') {
        await fetchCookout();
      } else {
        await fetchExploreFeed();
      }
      setLastFetch(new Date());
      if (showToast) {
        toast.success('Feed refreshed!');
      }
    } catch (error) {
      if (showToast) {
        toast.error('Failed to refresh feed');
      }
    }
  }, [feedType, fetchFeed, fetchExploreFeed, fetchCookout]);

  // Initial load - generate fresh content then load feed
  useEffect(() => {
    const initFeed = async () => {
      await generateFreshContent();
      await loadFeed();
    };
    initFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Reload feed when feed type changes
  useEffect(() => {
    if (lastFetch) { // Only if we've already done initial load
      loadFeed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedType]);

  // Auto-refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!lastFetch || (new Date() - lastFetch) > 30000) {
          console.log('[Feed] Page visible, refreshing...');
          loadFeed();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastFetch, loadFeed]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadFeed();
      }
    }, 120000);

    return () => clearInterval(interval);
  }, [loadFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Also generate fresh content on manual refresh
    await generateFreshContent();
    hasGeneratedFreshContent.current = false; // Allow regeneration next time
    await loadFeed(true);
    setRefreshing(false);
  };

  return (
    <div className="mb-safe" data-testid="home-page">
      {/* Welcome Modal */}
      <WelcomeModal open={showWelcome} onOpenChange={setShowWelcome} />

      {/* Feed Type Tabs */}
      <div className="sticky top-14 md:top-0 z-30 glass border-b border-white/10">
        <div className="flex">
          <button
            onClick={() => setFeedType('block')}
            className={cn(
              "flex-1 py-4 text-xs font-display tracking-widest uppercase transition-colors relative flex items-center justify-center gap-2",
              feedType === 'block' ? "text-white" : "text-white/40 hover:text-white/70"
            )}
            data-testid="feed-block-tab"
          >
            <Globe className="h-3.5 w-3.5" />
            The Block
            {feedType === 'block' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-amber-500" />
            )}
          </button>
          <button
            onClick={() => {
              if (!user?.is_vouched) {
                toast.error('The Cookout is invite only. Earn plates on The Block to get a Vouch.');
                return;
              }
              setFeedType('cookout');
            }}
            className={cn(
              "flex-1 py-4 text-xs font-display tracking-widest uppercase transition-colors relative flex items-center justify-center gap-2",
              feedType === 'cookout' ? "text-amber-500" : "text-white/40 hover:text-white/70"
            )}
            data-testid="feed-cookout-tab"
          >
            {user?.is_vouched ? (
              <UtensilsCrossed className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            The Cookout
            {feedType === 'cookout' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-amber-500" />
            )}
          </button>
          <button
            onClick={() => setFeedType('explore')}
            className={cn(
              "flex-1 py-4 text-xs font-display tracking-widest uppercase transition-colors relative",
              feedType === 'explore' ? "text-white" : "text-white/40 hover:text-white/70"
            )}
            data-testid="feed-explore-tab"
          >
            Explore
            {feedType === 'explore' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-amber-500" />
            )}
          </button>
        </div>
      </div>

      {/* Refresh button */}
      <div className="flex justify-center py-2 border-b border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="text-white/40 hover:text-white text-xs"
          data-testid="feed-refresh"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 mr-2", (loading || refreshing) && "animate-spin")} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Posts */}
      {(loading || cookoutLoading) && posts.length === 0 && cookoutPosts.length === 0 ? (
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : feedType === 'cookout' && !user?.is_vouched ? (
        <div className="text-center py-16 px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Lock className="h-8 w-8 text-amber-500" />
          </div>
          <p className="text-white text-lg mb-2 font-display tracking-wide">
            Invite Only
          </p>
          <p className="text-white/50 text-sm">
            Earn Plates on The Block to get a Vouch.
          </p>
        </div>
      ) : (feedType === 'cookout' ? cookoutPosts : posts).length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-white/50 text-base mb-2 font-display tracking-wide">
            {feedType === 'block' 
              ? "The Block is quiet" 
              : feedType === 'cookout'
              ? "The Cookout is empty"
              : "Nothing to explore yet"}
          </p>
          <p className="text-white/30 text-sm">
            {feedType === 'block'
              ? "Follow some people or post something"
              : feedType === 'cookout'
              ? "Post something for your inner circle"
              : "Be the first to start the conversation"}
          </p>
        </div>
      ) : (
        <div>
          {(feedType === 'cookout' ? cookoutPosts : posts).map((post, index) => (
            <div 
              key={post.post_id} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <PostCard post={post} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
