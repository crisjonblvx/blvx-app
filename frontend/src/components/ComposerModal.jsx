import { useState, useEffect } from 'react';
import { X, Sparkles, RefreshCw, Send, Lock, Globe, BarChart3, Plus, Minus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useBonitaChat } from '@/hooks/useBonitaChat';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MediaToolbar } from '@/components/MediaToolbar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const ENERGIES = [
  { key: 'hot_take', label: 'Hot Take', icon: '\u{1F525}' },
  { key: 'real_talk', label: 'Real Talk', icon: '\u{1F9E0}' },
  { key: 'confession', label: 'Confession', icon: '\u{1F48C}' },
  { key: 'question', label: 'Question', icon: '\u{2753}' },
  { key: 'w', label: 'W', icon: '\u{1F389}' },
  { key: 'l', label: 'L', icon: '\u{1F62E}\u{200D}\u{1F4A8}' },
  { key: 'event', label: 'Event', icon: '\u{1F4CD}' },
  { key: 'the_plug', label: 'The Plug', icon: '\u{1F6CD}\u{FE0F}' },
  { key: 'psa', label: 'PSA', icon: '\u{1F4E2}' },
];

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
  const [energy, setEnergy] = useState(null);
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const isDark = useTheme();

  // Theme-aware classes
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/50' : 'text-gray-500';
  const textVeryMutedClass = isDark ? 'text-white/40' : 'text-gray-400';
  const bgActiveClass = isDark ? 'bg-white/10' : 'bg-gray-100';
  const avatarFallbackClass = isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700';

  const charCount = content.length;
  const isOverLimit = charCount > 500;

  const validPollOptions = pollOptions.filter(o => o.trim());
  const isPollValid = !showPollBuilder || validPollOptions.length >= 2;

  const handleSubmit = async () => {
    const hasContent = content.trim().length > 0;
    const hasMedia = selectedMedia !== null;
    const hasPoll = showPollBuilder && validPollOptions.length >= 2;

    if ((!hasContent && !hasMedia && !hasPoll) || isOverLimit || postLoading) return;
    if (showPollBuilder && !isPollValid) {
      toast.error('Polls need at least 2 options');
      return;
    }

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
        energy: energy,
        poll_options: hasPoll ? validPollOptions : null,
      };

      const result = await createPost(postData);
      console.log('[Composer] Post created:', result);

      setContent('');
      setBonitaSuggestions(null);
      setShowBonita(false);
      setSelectedMedia(null);
      setEnergy(null);
      setShowPollBuilder(false);
      setPollOptions(['', '']);
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

  const updatePollOption = (index, value) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("border border-border sm:max-w-[500px] p-0 gap-0 max-h-[90vh] overflow-y-auto", isDark ? "bg-[#111]" : "bg-white")}>
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-sm tracking-widest uppercase">
              {replyTo ? 'Reply' : quotedPost ? 'Quote' : 'New Post'}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Create a new post on BLVX
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          {/* Reply context */}
          {replyTo && (
            <div className="mb-4 p-3 bg-muted border border-border">
              <p className={cn("text-[10px] mb-1 uppercase tracking-wider", textVeryMutedClass)}>Replying to @{replyTo.user?.username}</p>
              <p className={cn("text-sm line-clamp-2", textMutedClass)}>{replyTo.content}</p>
            </div>
          )}

          {/* Energy Selector */}
          {!replyTo && (
            <div className="mb-3">
              <p className={cn("text-[10px] font-display tracking-widest uppercase mb-2", textVeryMutedClass)}>
                What's the energy?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ENERGIES.map((e) => (
                  <button
                    key={e.key}
                    onClick={() => setEnergy(energy === e.key ? null : e.key)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 text-[11px] border transition-colors",
                      energy === e.key
                        ? isDark
                          ? "bg-white/15 border-white/30 text-white"
                          : "bg-gray-900/10 border-gray-900/30 text-gray-900"
                        : isDark
                          ? "bg-transparent border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                          : "bg-transparent border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"
                    )}
                  >
                    <span>{e.icon}</span>
                    <span>{e.label}</span>
                  </button>
                ))}
              </div>
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
                placeholder={replyTo ? "Write your reply..." : showPollBuilder ? "Ask a question..." : "What's happening?"}
                className={cn("min-h-[120px] resize-none bg-transparent border-none focus:ring-0 p-0 text-[15px]", textClass, isDark ? "placeholder:text-white/30" : "placeholder:text-gray-400")}
                autoFocus
                data-testid="composer-textarea"
              />

              {/* Poll Builder */}
              {showPollBuilder && (
                <div className={cn("mt-3 p-3 border space-y-2", isDark ? "border-white/10" : "border-gray-200")}>
                  <p className={cn("text-[10px] font-display tracking-widest uppercase", textVeryMutedClass)}>Poll Options</p>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updatePollOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        maxLength={80}
                        className={cn(
                          "flex-1 px-3 py-2 text-sm bg-transparent border outline-none",
                          isDark
                            ? "border-white/10 text-white placeholder:text-white/20 focus:border-white/30"
                            : "border-gray-200 text-gray-900 placeholder:text-gray-300 focus:border-gray-400"
                        )}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          onClick={() => removePollOption(index)}
                          className={cn("p-1", textVeryMutedClass, isDark ? "hover:text-white" : "hover:text-gray-900")}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 4 && (
                    <button
                      onClick={addPollOption}
                      className={cn("flex items-center gap-1 text-[11px] px-2 py-1", textMutedClass, isDark ? "hover:text-white" : "hover:text-gray-900")}
                    >
                      <Plus className="h-3 w-3" />
                      Add option
                    </button>
                  )}
                </div>
              )}

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

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPollBuilder(!showPollBuilder)}
                className={cn(
                  "text-xs",
                  showPollBuilder ? cn(textClass, bgActiveClass) : cn(textVeryMutedClass, isDark ? "hover:text-white" : "hover:text-gray-900")
                )}
                data-testid="composer-poll-toggle"
              >
                <BarChart3 className="h-3.5 w-3.5 mr-2" />
                Poll
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
              disabled={(!content.trim() && !selectedMedia && !(showPollBuilder && isPollValid)) || isOverLimit || postLoading}
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
