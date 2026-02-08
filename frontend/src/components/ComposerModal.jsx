import { useState, useEffect } from 'react';
import { X, Sparkles, RefreshCw, Send, Lock, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useBonitaChat } from '@/hooks/useBonitaChat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MediaToolbar } from '@/components/MediaToolbar';
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

export const ComposerModal = ({ 
  open, 
  onOpenChange, 
  replyTo = null, 
  quotedPost = null 
}) => {
  const { user } = useAuth();
  const { createPost, loading: postLoading } = usePosts();
  const { askBonita, loading: bonitaLoading } = useBonitaChat();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('block');
  const [showBonita, setShowBonita] = useState(false);
  const [bonitaSuggestions, setBonitaSuggestions] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const isDark = useTheme();

  // Theme-aware classes
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/50' : 'text-gray-500';
  const textVeryMutedClass = isDark ? 'text-white/40' : 'text-gray-400';
  const bgActiveClass = isDark ? 'bg-white/10' : 'bg-gray-100';
  const avatarFallbackClass = isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700';

  const charCount = content.length;
  const isOverLimit = charCount > 500;

  const handleSubmit = async () => {
    // Allow posting if there's either content OR media
    const hasContent = content.trim().length > 0;
    const hasMedia = selectedMedia !== null;
    
    if ((!hasContent && !hasMedia) || isOverLimit || postLoading) return;

    try {
      const postData = {
        content: content.trim(),
        post_type: replyTo ? 'reply' : quotedPost ? 'quote' : 'original',
        parent_post_id: replyTo?.post_id || null,
        quote_post_id: quotedPost?.post_id || null,
        visibility: visibility,
        media_url: selectedMedia?.url || null,
        media_type: selectedMedia?.type || null,
        gif_metadata: selectedMedia?.type === 'gif' ? {
          alt: selectedMedia.alt,
          width: selectedMedia.width,
          height: selectedMedia.height,
        } : null,
      };

      const result = await createPost(postData);
      console.log('[Composer] Post created:', result);
      
      setContent('');
      setBonitaSuggestions(null);
      setShowBonita(false);
      setSelectedMedia(null);
      onOpenChange(false);
      toast.success('Posted!');
    } catch (error) {
      console.error('[Composer] Post failed:', error);
      toast.error('Failed to post');
    }
  };

  const handleBonitaRefine = async () => {
    if (!content.trim() || bonitaLoading) return;
    
    try {
      const response = await askBonita(content, 'tone_rewrite', visibility);
      if (response) {
        setBonitaSuggestions(response);
      }
    } catch (error) {
      toast.error('Bonita is unavailable');
    }
  };

  const applyBonitaSuggestion = (text) => {
    // Extract just the option text
    const match = text.match(/\[([^\]]+)\]/);
    if (match) {
      setContent(match[1]);
    } else {
      setContent(text);
    }
    setBonitaSuggestions(null);
    setShowBonita(false);
  };

  const handleMediaSelect = (media) => {
    setSelectedMedia(media);
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border border-border sm:max-w-[500px] p-0">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-sm tracking-widest uppercase">
              {replyTo ? 'Reply' : quotedPost ? 'Quote' : 'New Post'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-4">
          {/* Reply context */}
          {replyTo && (
            <div className="mb-4 p-3 bg-muted border border-border">
              <p className={cn("text-[10px] mb-1 uppercase tracking-wider", textVeryMutedClass)}>Replying to @{replyTo.user?.username}</p>
              <p className={cn("text-sm line-clamp-2", textMutedClass)}>{replyTo.content}</p>
            </div>
          )}

          {/* Composer */}
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 border border-border flex-shrink-0">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className={cn(avatarFallbackClass, "text-sm")}>
                {user?.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={replyTo ? "Write your reply..." : "What's happening?"}
                className={cn("min-h-[120px] resize-none bg-transparent border-none focus:ring-0 p-0 text-[15px]", textClass, isDark ? "placeholder:text-white/30" : "placeholder:text-gray-400")}
                autoFocus
                data-testid="composer-textarea"
              />
              
              {/* Media Toolbar - The Receipts Bar */}
              <div className="mt-2 pt-2 border-t border-border">
                <MediaToolbar
                  onMediaSelect={handleMediaSelect}
                  selectedMedia={selectedMedia}
                  onRemoveMedia={handleRemoveMedia}
                />
              </div>
              
              {/* Quoted post */}
              {quotedPost && (
                <div className="mt-3 p-3 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={quotedPost.user?.picture} />
                      <AvatarFallback className="text-[10px]">
                        {quotedPost.user?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn("text-xs", textMutedClass)}>@{quotedPost.user?.username}</span>
                  </div>
                  <p className={cn("text-sm line-clamp-3", textMutedClass)}>{quotedPost.content}</p>
                </div>
              )}
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibility('block')}
              className={cn(
                "text-xs gap-2",
                visibility === 'block' ? cn(textClass, bgActiveClass) : cn(textVeryMutedClass, isDark ? "hover:text-white" : "hover:text-gray-900")
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              The Block
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibility('cookout')}
              className={cn(
                "text-xs gap-2",
                visibility === 'cookout' ? cn(textClass, bgActiveClass) : cn(textVeryMutedClass, isDark ? "hover:text-white" : "hover:text-gray-900")
              )}
            >
              <Lock className="h-3.5 w-3.5" />
              The Cookout
            </Button>
          </div>

          {/* Bonita Tone Lab */}
          {showBonita && (
            <div className="mt-4 p-4 bg-muted border border-border animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className={cn("h-4 w-4", textClass)} />
                <span className={cn("text-xs font-display tracking-wider uppercase", textClass)}>Bonita's Tone Lab</span>
              </div>
              
              <Button
                onClick={handleBonitaRefine}
                disabled={bonitaLoading || !content.trim()}
                className={cn("w-full mb-3 text-xs", isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900")}
                size="sm"
              >
                {bonitaLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-2" />
                )}
                Get Rewrites
              </Button>
              
              {bonitaSuggestions && (
                <div className="space-y-2 text-xs">
                  <p className={cn("mb-2", textVeryMutedClass)}>Bonita's options:</p>
                  <pre className={cn("whitespace-pre-wrap p-2 bg-muted rounded-sm", isDark ? "text-white/70" : "text-gray-700")}>{bonitaSuggestions}</pre>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBonita(!showBonita)}
                className={cn(
                  "text-xs",
                  showBonita ? cn(textClass, bgActiveClass) : cn(textVeryMutedClass, isDark ? "hover:text-white" : "hover:text-gray-900")
                )}
                data-testid="composer-bonita-toggle"
              >
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                Bonita
              </Button>
              
              <span className={cn(
                "text-xs font-mono",
                isOverLimit ? "text-red-500" : charCount > 400 ? "text-yellow-500" : textVeryMutedClass
              )}>
                {charCount}/500
              </span>
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={(!content.trim() && !selectedMedia) || isOverLimit || postLoading}
              className={cn("rounded-none px-6 text-xs font-display tracking-wider", isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")}
              data-testid="composer-submit"
            >
              {postLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
