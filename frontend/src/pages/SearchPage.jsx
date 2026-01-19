import { useState, useEffect } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUsers } from '@/hooks/useUsers';
import { usePosts } from '@/hooks/usePosts';
import { PostCard } from '@/components/PostCard';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('users');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const { searchUsers, loading: usersLoading } = useUsers();
  const { searchPosts, loading: postsLoading } = usePosts();

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
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
      <div className="sticky top-14 md:top-0 z-30 glass border-b border-white/10 p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search BLVX..."
            className="pl-10 pr-10 bg-white/5 border-white/20 focus:border-white rounded-sm"
            data-testid="search-input"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-white/40 hover:text-white"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Type Tabs */}
      <Tabs value={searchType} onValueChange={setSearchType} className="w-full">
        <TabsList className="w-full bg-transparent border-b border-white/10 rounded-none h-auto p-0">
          <TabsTrigger 
            value="users" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent py-3"
            data-testid="search-users-tab"
          >
            People
          </TabsTrigger>
          <TabsTrigger 
            value="posts" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent py-3"
            data-testid="search-posts-tab"
          >
            Posts
          </TabsTrigger>
        </TabsList>

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
          ) : users.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-white/50">
                {query ? 'No users found' : 'Search for people'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {users.map((user) => (
                <Link
                  key={user.user_id}
                  to={`/profile/${user.username}`}
                  className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                  data-testid={`search-user-${user.username}`}
                >
                  <Avatar className="h-12 w-12 border border-white/20">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback className="bg-white/10 text-white">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-sm text-white/50">@{user.username}</p>
                    {user.bio && (
                      <p className="text-sm text-white/40 line-clamp-1 mt-1">{user.bio}</p>
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
    </div>
  );
}
