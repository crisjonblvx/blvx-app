import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { PostCard } from '@/components/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { user } = useAuth();
  const { posts, loading, fetchFeed, fetchExploreFeed } = usePosts();
  const [feedType, setFeedType] = useState('following');

  useEffect(() => {
    if (feedType === 'following') {
      fetchFeed();
    } else {
      fetchExploreFeed();
    }
  }, [feedType, fetchFeed, fetchExploreFeed]);

  const handleRefresh = () => {
    if (feedType === 'following') {
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
            onClick={() => setFeedType('following')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
              feedType === 'following' ? 'text-white' : 'text-white/50 hover:text-white/80'
            }`}
            data-testid="feed-following-tab"
          >
            Following
            {feedType === 'following' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-white" />
            )}
          </button>
          <button
            onClick={() => setFeedType('explore')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
              feedType === 'explore' ? 'text-white' : 'text-white/50 hover:text-white/80'
            }`}
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
          className="text-white/50 hover:text-white"
          data-testid="feed-refresh"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
          <p className="text-white/50 text-lg mb-2">
            {feedType === 'following' 
              ? "Your timeline is empty" 
              : "No posts yet"}
          </p>
          <p className="text-white/30 text-sm">
            {feedType === 'following'
              ? "Follow some people to see their posts here"
              : "Be the first to post something"}
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
