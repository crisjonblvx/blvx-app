import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, Trash2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ComposerModal } from '@/components/ComposerModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const PostCard = ({ post, showThread = false, onBonitaContext }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { likePost, unlikePost, deletePost, checkLiked } = usePosts();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [replyOpen, setReplyOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [checkingLike, setCheckingLike] = useState(true);

  // Check if post is liked on mount
  useState(() => {
    const check = async () => {
      try {
        const liked = await checkLiked(post.post_id);
        setIsLiked(liked);
      } catch (e) {
        // Ignore
      } finally {
        setCheckingLike(false);
      }
    };
    check();
  }, [post.post_id]);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (checkingLike) return;
    
    try {
      if (isLiked) {
        await unlikePost(post.post_id);
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        await likePost(post.post_id);
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      toast.error('Action failed. Try again.');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost(post.post_id);
      toast.success('Post deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.post_id}`);
      toast.success('Link copied!');
    } catch (e) {
      toast.error('Failed to copy link');
    }
  };

  const formatTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: false });
    } catch {
      return '';
    }
  };

  const isOwner = user?.user_id === post.user_id;

  return (
    <>
      <article 
        className="post-card border-b border-white/10 p-4 cursor-pointer"
        onClick={() => navigate(`/post/${post.post_id}`)}
        data-testid={`post-${post.post_id}`}
      >
        {/* Repost indicator */}
        {post.post_type === 'repost' && post.parent_post && (
          <div className="flex items-center gap-2 text-xs text-white/50 mb-2 ml-12">
            <Repeat2 className="h-3 w-3" />
            <span>Reposted</span>
          </div>
        )}

        <div className="flex gap-3">
          {/* Avatar */}
          <Link 
            to={`/profile/${post.user?.username}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          >
            <Avatar className="h-10 w-10 border border-white/20 hover:border-white/40 transition-colors">
              <AvatarImage src={post.user?.picture} alt={post.user?.name} />
              <AvatarFallback className="bg-white/10 text-white">
                {post.user?.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <Link 
                  to={`/profile/${post.user?.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-white hover:underline truncate"
                >
                  {post.user?.name}
                </Link>
                <Link 
                  to={`/profile/${post.user?.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-white/50 text-sm truncate"
                >
                  @{post.user?.username}
                </Link>
                <span className="text-white/30">·</span>
                <span className="text-white/50 text-sm font-mono whitespace-nowrap">
                  {formatTime(post.created_at)}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white/40 hover:text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black border-white/20">
                  {onBonitaContext && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onBonitaContext(post.content);
                      }}
                      className="text-white/80 hover:text-white focus:text-white cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Ask Bonita for context
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                      }}
                      className="text-red-500 hover:text-red-400 focus:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Reply indicator */}
            {post.post_type === 'reply' && post.parent_post && (
              <p className="text-white/50 text-sm mb-2">
                Replying to <span className="text-white/70">@{post.parent_post.user?.username}</span>
              </p>
            )}

            {/* Post content */}
            <p className="text-white whitespace-pre-wrap break-words mb-3">
              {post.content}
            </p>

            {/* Quoted post */}
            {post.quote_post && (
              <div 
                className="border border-white/20 rounded-sm p-3 mb-3 hover:bg-white/5 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/post/${post.quote_post.post_id}`);
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={post.quote_post.user?.picture} />
                    <AvatarFallback className="text-[10px]">
                      {post.quote_post.user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-white/80">{post.quote_post.user?.name}</span>
                  <span className="text-xs text-white/50">@{post.quote_post.user?.username}</span>
                </div>
                <p className="text-sm text-white/70 line-clamp-3">{post.quote_post.content}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-6 -ml-2">
              {/* Reply */}
              <Button
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white hover:bg-white/10 gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyOpen(true);
                }}
                data-testid={`post-${post.post_id}-reply`}
              >
                <MessageCircle className="h-4 w-4" />
                {post.reply_count > 0 && (
                  <span className="text-xs font-mono">{post.reply_count}</span>
                )}
              </Button>

              {/* Repost / Quote */}
              <Button
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white hover:bg-white/10 gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuoteOpen(true);
                }}
                data-testid={`post-${post.post_id}-repost`}
              >
                <Repeat2 className="h-4 w-4" />
                {post.repost_count > 0 && (
                  <span className="text-xs font-mono">{post.repost_count}</span>
                )}
              </Button>

              {/* Like */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 hover:bg-white/10",
                  isLiked ? "text-red-500 hover:text-red-400" : "text-white/50 hover:text-white"
                )}
                onClick={handleLike}
                data-testid={`post-${post.post_id}-like`}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                {likeCount > 0 && (
                  <span className="text-xs font-mono">{likeCount}</span>
                )}
              </Button>

              {/* Share */}
              <Button
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                data-testid={`post-${post.post_id}-share`}
              >
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </article>

      {/* Reply Modal */}
      <ComposerModal 
        open={replyOpen} 
        onOpenChange={setReplyOpen} 
        replyTo={post}
      />

      {/* Quote Modal */}
      <ComposerModal 
        open={quoteOpen} 
        onOpenChange={setQuoteOpen} 
        quotedPost={post}
      />
    </>
  );
};
