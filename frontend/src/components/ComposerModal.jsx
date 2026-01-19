import { useState } from 'react';
import { X, Sparkles, RefreshCw, Send } from 'lucide-react';
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
  const [showBonita, setShowBonita] = useState(false);
  const [bonitaSuggestion, setBonitaSuggestion] = useState('');
  const [selectedTone, setSelectedTone] = useState('calm');

  const charCount = content.length;
  const isOverLimit = charCount > 500;

  const toneVariants = [
    { id: 'calm', label: 'Calm' },
    { id: 'sharp', label: 'Sharp' },
    { id: 'humorous', label: 'Humorous' },
    { id: 'respectful', label: 'Respectful' },
  ];

  const handleSubmit = async () => {
    if (!content.trim() || isOverLimit || postLoading) return;

    try {
      const postData = {
        content: content.trim(),
        post_type: replyTo ? 'reply' : quotedPost ? 'quote' : 'original',
        parent_post_id: replyTo?.post_id || null,
        quote_post_id: quotedPost?.post_id || null,
      };

      await createPost(postData);
      setContent('');
      setBonitaSuggestion('');
      setShowBonita(false);
      onOpenChange(false);
      toast.success('Posted!');
    } catch (error) {
      toast.error('Failed to post. Try again.');
    }
  };

  const handleBonitaRefine = async () => {
    if (!content.trim() || bonitaLoading) return;
    
    try {
      const response = await askBonita(content, 'tone_refine', selectedTone);
      if (response) {
        setBonitaSuggestion(response);
      }
    } catch (error) {
      toast.error('Bonita is unavailable right now.');
    }
  };

  const applyBonitaSuggestion = () => {
    if (bonitaSuggestion) {
      setContent(bonitaSuggestion);
      setBonitaSuggestion('');
      setShowBonita(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border border-white/20 sm:max-w-[500px] p-0">
        <DialogHeader className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-lg tracking-wide uppercase">
              {replyTo ? 'Reply' : quotedPost ? 'Quote' : 'New BLVX'}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="text-white/60 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4">
          {/* Reply context */}
          {replyTo && (
            <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-sm">
              <p className="text-xs text-white/50 mb-1">Replying to @{replyTo.user?.username}</p>
              <p className="text-sm text-white/70 line-clamp-2">{replyTo.content}</p>
            </div>
          )}

          {/* Composer */}
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 border border-white/20 flex-shrink-0">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className="bg-white/10 text-white">
                {user?.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={replyTo ? "Write your reply..." : "What's on your mind?"}
                className="min-h-[120px] resize-none bg-transparent border-none focus:ring-0 text-white placeholder:text-white/30 p-0"
                autoFocus
                data-testid="composer-textarea"
              />
              
              {/* Quoted post */}
              {quotedPost && (
                <div className="mt-3 p-3 border border-white/20 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={quotedPost.user?.picture} />
                      <AvatarFallback className="text-[10px]">
                        {quotedPost.user?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-white/60">@{quotedPost.user?.username}</span>
                  </div>
                  <p className="text-sm text-white/70 line-clamp-3">{quotedPost.content}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bonita Tone Refinement */}
          {showBonita && (
            <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-sm animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-sm font-medium">Bonita's Tone Lab</span>
              </div>
              
              <div className="flex gap-2 mb-3">
                {toneVariants.map((tone) => (
                  <Button
                    key={tone.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTone(tone.id)}
                    className={cn(
                      "text-xs",
                      selectedTone === tone.id 
                        ? "bg-white text-black" 
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    {tone.label}
                  </Button>
                ))}
              </div>
              
              <Button
                onClick={handleBonitaRefine}
                disabled={bonitaLoading || !content.trim()}
                className="w-full bg-white/10 hover:bg-white/20 text-white mb-3"
                size="sm"
              >
                {bonitaLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Refine with Bonita
              </Button>
              
              {bonitaSuggestion && (
                <div className="space-y-2">
                  <p className="text-xs text-white/50">Bonita suggests:</p>
                  <p className="text-sm text-white/80 p-2 bg-white/5 rounded-sm">{bonitaSuggestion}</p>
                  <Button
                    onClick={applyBonitaSuggestion}
                    size="sm"
                    className="w-full bg-white text-black hover:bg-white/90"
                  >
                    Use this version
                  </Button>
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
                  "text-white/60 hover:text-white",
                  showBonita && "text-white bg-white/10"
                )}
                data-testid="composer-bonita-toggle"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Bonita
              </Button>
              
              <span className={cn(
                "text-sm font-mono",
                isOverLimit ? "text-red-500" : charCount > 400 ? "text-yellow-500" : "text-white/40"
              )}>
                {charCount}/500
              </span>
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isOverLimit || postLoading}
              className="bg-white text-black hover:bg-white/90 rounded-sm px-6"
              data-testid="composer-submit"
            >
              {postLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
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
