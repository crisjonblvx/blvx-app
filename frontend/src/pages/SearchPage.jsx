import { useState, useEffect } from 'react';
import { useThemeClasses } from '@/hooks/useTheme';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUsers } from '@/hooks/useUsers';
import { usePosts } from '@/hooks/usePosts';
import { PostCard } from '@/components/PostCard';
import { TrendingWidget } from '@/components/TrendingWidget';
import { FounderModal } from '@/components/FounderModal';
import { PeopleDiscover, TrendingPeople } from '@/components/community';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState('trending');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [showFounder, setShowFounder] = useState(false);
  const { searchUsers, loading: usersLoading } = useUsers();
  const { searchPosts, loading: postsLoading } = usePosts();
  const { isDark, textClass, textMutedClass, textVeryMutedClass, borderClass, hoverBgClass } = useThemeClasses();

  // Check for founder easter egg
  useEffect(() => {
    const lowerQuery = query.toLowerCase().trim();
    if (lowerQuery === 'cj nurse' || lowerQuery === 'cjnurse' || lowerQuery === 'founder') {
      setShowFounder(true);
    }
  }, [query]);

  // Handle incoming query from URL (e.g., clicking hashtag)
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
      setSearchType('posts');
    }
  }, [searchParams]);

  useEffect(() => {
    const search = async () => {
      if (!query.trim() || searchType === 'trending') {
        setUsers([]);
        setPosts([]);
        return;
      }

      if (searchType === 'users') {
        try {
          const results = await searchUsers(query);
          setUsers(results);
        } catch (e) {
          console.error('Search error:', e);
        }
      } else {
        try {
          const results = await searchPosts(query);
          setPosts(results);
        } catch (e) {
          console.error('Search error:', e);
        }
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, searchType, searchUsers, searchPosts]);

  const loading = searchType === 'users' ? usersLoading : postsLoading;

  return (
    <div className="mb-safe" data-testid="search-page">
      {/* Search Header */}
      <div className={cn("sticky top-14 md:top-0 z-30 glass border-b p-4", borderClass)}>
        <div className="relative">
          <SearchIcon className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5", textVeryMutedClass)} />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim() && searchType === 'trending') {
                setSearchType('posts');
              }
            }}
            placeholder="Search BLVX..."
            className={cn("pl-10 pr-10 rounded-sm", isDark ? "bg-white/5 border-white/20 focus:border-white" : "bg-gray-50 border-gray-300 focus:border-gray-900")}
            data-testid="search-input"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className={cn("absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8", textVeryMutedClass, isDark ? "hover:text-white" : "hover:text-gray-900")}
              onClick={() => {
                setQuery('');
                setSearchType('trending');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Type Tabs */}
      <Tabs value={searchType} onValueChange={setSearchType} className="w-full">
        <TabsList className={cn("w-full bg-transparent border-b rounded-none h-auto p-0", borderClass)}>
          <TabsTrigger 
            value="trending" 
            className={cn("flex-1 rounded-none border-b-2 border-transparent py-3", isDark ? "data-[state=active]:border-white" : "data-[state=active]:border-black", "data-[state=active]:bg-transparent")}
            data-testid="search-trending-tab"
          >
            The Word
          </TabsTrigger>
          <TabsTrigger 
            value="discover" 
            className={cn("flex-1 rounded-none border-b-2 border-transparent py-3", isDark ? "data-[state=active]:border-white" : "data-[state=active]:border-black", "data-[state=active]:bg-transparent")}
            data-testid="search-discover-tab"
          >
            Discover
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className={cn("flex-1 rounded-none border-b-2 border-transparent py-3", isDark ? "data-[state=active]:border-white" : "data-[state=active]:border-black", "data-[state=active]:bg-transparent")}
            data-testid="search-users-tab"
          >
            People
          </TabsTrigger>
          <TabsTrigger 
            value="posts" 
            className={cn("flex-1 rounded-none border-b-2 border-transparent py-3", isDark ? "data-[state=active]:border-white" : "data-[state=active]:border-black", "data-[state=active]:bg-transparent")}
            data-testid="search-posts-tab"
          >
            Posts
          </TabsTrigger>
        </TabsList>

        {/* The Word (Trending) */}
        <TabsContent value="trending" className="mt-0">
          <div className="p-4">
            <TrendingWidget />
          </div>
        </TabsContent>

        {/* Discover - People suggestions and rising voices */}
        <TabsContent value="discover" className="mt-0">
          <div className="p-4 space-y-8">
            <PeopleDiscover limit={9} fullWidth />
            <div className={cn("pt-6 border-t", borderClass)}>
              <TrendingPeople limit={10} />
            </div>
          </div>
        </TabsContent>

        {/* People Search */}
        <TabsContent value="users" className="mt-0">
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : !query.trim() ? (
            // Show suggestions when no search query
            <div className="p-4">
              <PeopleDiscover limit={12} fullWidth />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className={textMutedClass}>No users found</p>
            </div>
          ) : (
            <div className={cn("divide-y", borderClass)}>
              {users.map((user) => (
                <Link
                  key={user.user_id}
                  to={`/profile/${user.username}`}
                  className={cn("flex items-center gap-3 p-4 transition-colors", hoverBgClass)}
                  data-testid={`search-user-${user.username}`}
                >
                  <div className="relative">
                    <Avatar className={cn("h-12 w-12 border", borderClass)}>
                      <AvatarImage src={user.picture} alt={user.name} />
                      <AvatarFallback className={isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-900"}>
                        {user.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Activity status dot */}
                    {user.activity_status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full" />
                    )}
                    {user.activity_status === 'recently' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-500 border-2 border-black rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium", textClass)}>{user.name}</p>
                    <p className={cn("text-sm", textMutedClass)}>@{user.username}</p>
                    {user.bio && (
                      <p className={cn("text-sm line-clamp-1 mt-1", textVeryMutedClass)}>{user.bio}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="mt-0">
          {loading ? (
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
              <p className="text-white/50">
                {query ? 'No posts found' : 'Search for posts'}
              </p>
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <PostCard key={post.post_id} post={post} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Founder Easter Egg Modal */}
      <FounderModal open={showFounder} onOpenChange={setShowFounder} />
    </div>
  );
}
