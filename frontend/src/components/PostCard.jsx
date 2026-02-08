import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { UtensilsCrossed, MessageCircle, Repeat2, Share, MoreHorizontal, Trash2, Sparkles, Lock, Send, Volume2, VolumeX, Flag } from 'lucide-react';
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
import { ReportModal } from '@/components/ReportModal';
import { LinkPreviewCard } from '@/components/TrendingWidget';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Theme hook
const useTheme = () => {
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

export const PostCard = ({ post, showThread = false, onBonitaContext, onLiveDrop }) => {
  // Safety check FIRST - before any hooks
  // If post is invalid, render a placeholder instead of crashing
  const isValidPost = post && post.post_id;
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { likePost, unlikePost, deletePost, checkLiked } = usePosts();
  const [isPlated, setIsPlated] = useState(false);
  const [plateCount, setPlateCount] = useState(isValidPost ? (post.like_count || 0) : 0);
  const [replyOpen, setReplyOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [checkingLike, setCheckingLike] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const isDark = useTheme();

  // Theme-aware classes
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/50' : 'text-gray-500';
  const textVeryMutedClass = isDark ? 'text-white/30' : 'text-gray-400';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';
  const borderLightClass = isDark ? 'border-white/20' : 'border-gray-300';
  const hoverBgClass = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100';
  const avatarFallbackClass = isDark ? 'bg-white/10' : 'bg-gray-100';

  // Ensure post.user has default values (computed, not a hook)
  const postUser = isValidPost ? {
    name: post.user?.name || 'Anonymous',
    username: post.user?.username || 'user',
    picture: post.user?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${post.user?.name || 'U'}&backgroundColor=1a1a1a&textColor=ffffff`,
    user_id: post.user?.user_id || post.user_id,
    ...post.user
  } : { name: 'Unknown', username: 'user', picture: '', user_id: '' };

  // Auto-play video when visible in viewport
  useEffect(() => {
    if (!isValidPost || post.media_type !== 'video' || !videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {});
            setIsPlaying(true);
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isValidPost, post.media_type]);

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  // Check if post is plated on mount
  useEffect(() => {
    if (!isValidPost) return;
    const check = async () => {
      try {
        const plated = await checkLiked(post.post_id);
        setIsPlated(plated);
      } catch (e) {
        // Ignore
      } finally {
        setCheckingLike(false);
      }
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.post_id]);

  const handlePlate = async (e) => {
    e.stopPropagation();
    if (!isValidPost || checkingLike) return;
    
    try {
      if (isPlated) {
        await unlikePost(post.post_id);
        setPlateCount(prev => prev - 1);
        setIsPlated(false);
      } else {
        await likePost(post.post_id);
        setPlateCount(prev => prev + 1);
        setIsPlated(true);
        toast.success('Plate served! 🍽️');
      }
    } catch (error) {
      toast.error('Action failed');
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
      toast.error('Failed to copy');
    }
  };

  const handleLiveDrop = () => {
    if (onLiveDrop) {
      onLiveDrop(post);
      toast.success('Dropped to The GC!');
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

  const isOwner = user?.user_id === post?.user_id;
  const isCookout = post?.visibility === 'cookout';

  // Now we can safely return null for invalid posts (after all hooks)
  if (!isValidPost) {
    console.warn('PostCard: Invalid post data', post);
    return null;
  }

  return (
    <>
      <article 
        className={cn(
          "post-card border-b p-4 cursor-pointer",
          borderClass,
          (post.is_spark || post.user_id === 'bonita' || postUser.username === 'bonita') && "border-l-2 border-l-purple-500/50"
        )}
        onClick={() => navigate(`/post/${post.post_id}`)}
        data-testid={`post-${post.post_id}`}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <Link 
            to={`/profile/${postUser.username}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          >
            <Avatar className={cn("h-11 w-11 border transition-colors", borderLightClass, isDark ? "hover:border-white/40" : "hover:border-gray-400")}>
              <AvatarImage src={postUser.picture} alt={postUser.name} />
              <AvatarFallback className={cn(avatarFallbackClass, "text-base font-medium")}>
                {postUser.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <Link 
                  to={`/profile/${postUser.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className={cn("font-bold text-[15px] hover:underline truncate flex items-center gap-1.5", textClass)}
                >
                  {postUser.name}
                  {(post.is_spark || post.user_id === 'bonita' || postUser.username === 'bonita') && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-[10px] font-medium text-purple-400 rounded-sm">
                      <Sparkles className="h-2.5 w-2.5" />
                      AI
                    </span>
                  )}
                </Link>
                <Link 
                  to={`/profile/${postUser.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className={cn("text-[15px] truncate", textMutedClass)}
                >
                  @{postUser.username}
                </Link>
                <span className={textVeryMutedClass}>·</span>
                <span className={cn("text-[14px] whitespace-nowrap", textMutedClass)}>
                  {formatTime(post.created_at)}
                </span>
                {isCookout && (
                  <Lock className={cn("h-3.5 w-3.5", textMutedClass)} />
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-8 w-8", textVeryMutedClass, isDark ? "hover:text-white" : "hover:text-gray-900")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border">
                  {onBonitaContext && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onBonitaContext(post.content);
                      }}
                      className={cn("cursor-pointer text-xs", isDark ? "text-white/70 hover:text-white focus:text-white" : "text-gray-600 hover:text-gray-900 focus:text-gray-900")}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-2" />
                      Ask Bonita
                    </DropdownMenuItem>
                  )}
                  {onLiveDrop && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLiveDrop();
                      }}
                      className={cn("cursor-pointer text-xs", isDark ? "text-white/70 hover:text-white focus:text-white" : "text-gray-600 hover:text-gray-900 focus:text-gray-900")}
                    >
                      <Send className="h-3.5 w-3.5 mr-2" />
                      Drop to GC
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                      }}
                      className="text-red-500 hover:text-red-400 focus:text-red-400 cursor-pointer text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                  {!isOwner && user && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setReportOpen(true);
                      }}
                      className={cn("cursor-pointer text-xs", isDark ? "text-white/70 hover:text-white focus:text-white" : "text-gray-600 hover:text-gray-900 focus:text-gray-900")}
                    >
                      <Flag className="h-3.5 w-3.5 mr-2" />
                      Report
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Reply indicator */}
            {post.post_type === 'reply' && post.parent_post && (
              <p className={cn("text-sm mb-2", textMutedClass)}>
                Replying to <span className="text-amber-500">@{post.parent_post.user?.username}</span>
              </p>
            )}

            {/* Post content */}
            <p className={cn("whitespace-pre-wrap break-words mb-3 text-[15px] leading-[1.5]", textClass)}>
              {post.content}
            </p>

            {/* Media */}
            {post.media_url && (
              <div ref={containerRef} className={cn("mb-3 rounded-lg overflow-hidden border relative", borderClass)}>
                {post.media_type === 'video' ? (
                  <div className="relative">
                    <video 
                      ref={videoRef}
                      src={post.media_url} 
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full max-h-[500px] object-contain bg-black cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (videoRef.current?.paused) {
                          videoRef.current.play();
                        } else {
                          videoRef.current?.pause();
                        }
                      }}
                    />
                    {/* POV Badge */}
                    <div className="absolute top-2 left-2 bg-amber-500 px-2 py-1 text-[10px] text-black font-bold font-display tracking-wider rounded">
                      POV
                    </div>
                    {/* Mute/Unmute Button */}
                    <button
                      onClick={toggleMute}
                      className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 p-2 rounded-full transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4 text-white" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-white" />
                      )}
                    </button>
                  </div>
                ) : (
                  <img 
                    src={post.media_url} 
                    alt="" 
                    className="w-full max-h-[500px] object-contain bg-black"
                    loading="lazy"
                  />
                )}
              </div>
            )}

            {/* Rich Link Preview (for Spark posts with reference URLs) */}
            {post.reference_url && (
              <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                <LinkPreviewCard url={post.reference_url} />
              </div>
            )}

            {/* Quoted post */}
            {post.quote_post && (
              <div 
                className={cn("border p-3 mb-3 transition-colors", borderLightClass, hoverBgClass)}
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
                  <span className={cn("text-xs font-medium", isDark ? "text-white/70" : "text-gray-700")}>{post.quote_post.user?.name}</span>
                  <span className={cn("text-[10px]", textVeryMutedClass)}>@{post.quote_post.user?.username}</span>
                </div>
                <p className={cn("text-sm line-clamp-3", isDark ? "text-white/60" : "text-gray-600")}>{post.quote_post.content}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-6 -ml-2">
              {/* Reply */}
              <Button
                variant="ghost"
                size="sm"
                className={cn("gap-2 h-8 px-2", textMutedClass, isDark ? "hover:text-white hover:bg-white/5" : "hover:text-gray-900 hover:bg-gray-100")}
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

              {/* View Replies Link (if there are replies) */}
              {post.reply_count > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-300 text-xs h-8 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/post/${post.post_id}`);
                  }}
                  data-testid={`post-${post.post_id}-view-replies`}
                >
                  View {post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}
                </Button>
              )}

              {/* Repost / Quote */}
              <Button
                variant="ghost"
                size="sm"
                className={cn("gap-2 h-8 px-2", textMutedClass, isDark ? "hover:text-white hover:bg-white/5" : "hover:text-gray-900 hover:bg-gray-100")}
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

              {/* Plate (was Like) */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 h-8 px-2",
                  isDark ? "hover:bg-white/5" : "hover:bg-gray-100",
                  isPlated ? "text-amber-500 hover:text-amber-400" : cn(textMutedClass, isDark ? "hover:text-white" : "hover:text-gray-900")
                )}
                onClick={handlePlate}
                title="Serve a Plate"
                data-testid={`post-${post.post_id}-plate`}
              >
                <UtensilsCrossed className={cn("h-4 w-4", isPlated && "fill-amber-500")} />
                {plateCount > 0 && (
                  <span className="text-xs">{plateCount}</span>
                )}
              </Button>

              {/* Share */}
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 px-2", textMutedClass, isDark ? "hover:text-white hover:bg-white/5" : "hover:text-gray-900 hover:bg-gray-100")}
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

      {/* Report Modal */}
      <ReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="post"
        targetId={post.post_id}
        targetName={`@${postUser.username}'s post`}
      />
    </>
  );
};
