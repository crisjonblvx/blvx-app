import { useEffect, useState } from 'react';
import { useThemeClasses } from '@/hooks/useTheme';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { usePosts } from '@/hooks/usePosts';
import { useBonitaChat } from '@/hooks/useBonitaChat';
import { PostCard } from '@/components/PostCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ThreadPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { fetchThread, loading } = usePosts();
  const { askBonita } = useBonitaChat();
  const [thread, setThread] = useState(null);
  const [bonitaLoading, setBonitaLoading] = useState(false);
  const [bonitaSummary, setBonitaSummary] = useState(null);
  const { isDark, textClass, textMutedClass, textVeryMutedClass, borderClass, hoverBgClass } = useThemeClasses();

  useEffect(() => {
    const loadThread = async () => {
      try {
        const data = await fetchThread(postId);
        setThread(data);
      } catch (error) {
        toast.error('Post not found');
        navigate('/home');
      }
    };

    loadThread();
  }, [postId, fetchThread, navigate]);

  const handleDecompress = async () => {
    if (!thread || bonitaLoading) return;
    
    setBonitaLoading(true);
    try {
      // Combine post and replies for context
      let fullThread = `Original post by @${thread.post.user?.username}:\n"${thread.post.content}"\n\n`;
      
      if (thread.replies.length > 0) {
        fullThread += 'Replies:\n';
        thread.replies.forEach((reply, i) => {
          fullThread += `${i + 1}. @${reply.user?.username}: "${reply.content}"\n`;
        });
      }
      
      const response = await askBonita(fullThread, 'thread_decompress');
      setBonitaSummary(response);
    } catch (error) {
      toast.error('Bonita is unavailable right now');
    } finally {
      setBonitaLoading(false);
    }
  };

  const handleBonitaContext = async (content) => {
    setBonitaLoading(true);
    try {
      const response = await askBonita(content, 'cultural_context');
      setBonitaSummary(response);
    } catch (error) {
      toast.error('Bonita is unavailable right now');
    } finally {
      setBonitaLoading(false);
    }
  };

  if (loading && !thread) {
    return (
      <div className="mb-safe" data-testid="thread-loading">
        <div className="p-4 border-b border-white/10">
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="p-4">
          <div className="flex gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!thread) return null;

  return (
    <div className="mb-safe" data-testid="thread-page">
      {/* Header */}
      <div className={cn("sticky top-14 md:top-0 z-30 glass border-b p-4", borderClass)}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className={cn(isDark ? "text-white/60 hover:text-white" : "text-gray-600 hover:text-gray-900")}
            data-testid="back-btn"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className={cn("font-display text-lg tracking-wide uppercase", textClass)}>Thread</h1>
        </div>
      </div>

      {/* Bonita Decompress Button */}
      {thread.replies.length > 2 && (
        <div className={cn("p-4 border-b", borderClass)}>
          <Button
            onClick={handleDecompress}
            disabled={bonitaLoading}
            variant="outline"
            className={cn("w-full", isDark ? "border-white/20 text-white hover:bg-white/10" : "border-gray-300 text-gray-900 hover:bg-gray-100")}
            data-testid="decompress-btn"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {bonitaLoading ? 'Bonita is thinking...' : 'Want the 30-second breakdown?'}
          </Button>
        </div>
      )}

      {/* Bonita Summary */}
      {bonitaSummary && (
        <div className={cn("p-4 border-b animate-fade-in", borderClass)}>
          <div className={cn("border rounded-sm p-4", isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className={cn("h-4 w-4", textClass)} />
              <span className={cn("text-sm font-display tracking-wide uppercase", isDark ? "text-white/80" : "text-gray-700")}>Bonita's Take</span>
            </div>
            <p className={cn("text-sm whitespace-pre-wrap", isDark ? "text-white/80" : "text-gray-700")}>{bonitaSummary}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBonitaSummary(null)}
              className={cn("mt-3", isDark ? "text-white/40 hover:text-white" : "text-gray-500 hover:text-gray-900")}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Post */}
      <div className={cn("border-b", borderClass)}>
        <PostCard 
          post={thread.post} 
          showThread 
          onBonitaContext={handleBonitaContext}
        />
      </div>

      {/* Replies */}
      {thread.replies.length > 0 && (
        <>
          <div className={cn("px-4 py-3 border-b", borderClass)}>
            <p className={cn("text-sm", textMutedClass)}>
              {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}
            </p>
          </div>
          
          {thread.replies.map((reply, index) => (
            <div 
              key={reply.post_id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <PostCard 
                post={reply} 
                onBonitaContext={handleBonitaContext}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
