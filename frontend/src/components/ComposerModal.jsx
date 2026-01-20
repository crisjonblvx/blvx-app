import { useState } from 'react';
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
      <DialogContent className="bg-black border border-white/20 sm:max-w-[500px] p-0">
        <DialogHeader className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-sm tracking-widest uppercase">
              {replyTo ? 'Reply' : quotedPost ? 'Quote' : 'New Post'}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="text-white/50 hover:text-white h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4">
          {/* Reply context */}
          {replyTo && (
            <div className="mb-4 p-3 bg-white/5 border border-white/10">
              <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Replying to @{replyTo.user?.username}</p>
              <p className="text-sm text-white/60 line-clamp-2">{replyTo.content}</p>
            </div>
          )}

          {/* Composer */}
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 border border-white/20 flex-shrink-0">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className="bg-white/10 text-white text-sm">
                {user?.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={replyTo ? "Write your reply..." : "What's happening?"}
                className="min-h-[120px] resize-none bg-transparent border-none focus:ring-0 text-white placeholder:text-white/30 p-0 text-[15px]"
                autoFocus
                data-testid="composer-textarea"
              />
              
              {/* Media Toolbar - The Receipts Bar */}
              <div className="mt-2 pt-2 border-t border-white/5">
                <MediaToolbar
                  onMediaSelect={handleMediaSelect}
                  selectedMedia={selectedMedia}
                  onRemoveMedia={handleRemoveMedia}
                />
              </div>
              
              {/* Quoted post */}
              {quotedPost && (
                <div className="mt-3 p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={quotedPost.user?.picture} />
                      <AvatarFallback className="text-[10px]">
                        {quotedPost.user?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-white/50">@{quotedPost.user?.username}</span>
                  </div>
                  <p className="text-sm text-white/60 line-clamp-3">{quotedPost.content}</p>
                </div>
              )}
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibility('block')}
              className={cn(
                "text-xs gap-2",
                visibility === 'block' ? "text-white bg-white/10" : "text-white/40 hover:text-white"
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
                visibility === 'cookout' ? "text-white bg-white/10" : "text-white/40 hover:text-white"
              )}
            >
              <Lock className="h-3.5 w-3.5" />
              The Cookout
            </Button>
          </div>

          {/* Bonita Tone Lab */}
          {showBonita && (
            <div className="mt-4 p-4 bg-white/5 border border-white/10 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-xs font-display tracking-wider uppercase">Bonita's Tone Lab</span>
              </div>
              
              <Button
                onClick={handleBonitaRefine}
                disabled={bonitaLoading || !content.trim()}
                className="w-full bg-white/10 hover:bg-white/20 text-white mb-3 text-xs"
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
                  <p className="text-white/40 mb-2">Bonita's options:</p>
                  <pre className="text-white/70 whitespace-pre-wrap p-2 bg-white/5 rounded-sm">{bonitaSuggestions}</pre>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBonita(!showBonita)}
                className={cn(
                  "text-white/40 hover:text-white text-xs",
                  showBonita && "text-white bg-white/10"
                )}
                data-testid="composer-bonita-toggle"
              >
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                Bonita
              </Button>
              
              <span className={cn(
                "text-xs font-mono",
                isOverLimit ? "text-red-500" : charCount > 400 ? "text-yellow-500" : "text-white/30"
              )}>
                {charCount}/500
              </span>
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={(!content.trim() && !selectedMedia) || isOverLimit || postLoading}
              className="bg-white text-black hover:bg-white/90 rounded-none px-6 text-xs font-display tracking-wider"
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
