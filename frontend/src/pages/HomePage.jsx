import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { PostCard } from '@/components/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { user } = useAuth();
  const { posts, loading, fetchFeed, fetchExploreFeed } = usePosts();
  const [feedType, setFeedType] = useState('block'); // block (following) or explore

  useEffect(() => {
    if (feedType === 'block') {
      fetchFeed();
    } else {
      fetchExploreFeed();
    }
  }, [feedType, fetchFeed, fetchExploreFeed]);

  const handleRefresh = () => {
    if (feedType === 'block') {
      fetchFeed();
    } else {
      fetchExploreFeed();
    }
  };

  return (
    <div className="mb-safe" data-testid="home-page">
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
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-white" />
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
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-white" />
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
          disabled={loading}
          className="text-white/40 hover:text-white text-xs"
          data-testid="feed-refresh"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Posts */}
      {loading && posts.length === 0 ? (
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
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-white/50 text-base mb-2 font-display tracking-wide">
            {feedType === 'block' 
              ? "The Block is quiet" 
              : "Nothing to explore yet"}
          </p>
          <p className="text-white/30 text-sm">
            {feedType === 'block'
              ? "Follow some people or post something"
              : "Be the first to start the conversation"}
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post, index) => (
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
