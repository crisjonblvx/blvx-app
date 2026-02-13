import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, RefreshCw, Zap, MessageSquare, Palette, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBonitaChat } from '@/hooks/useBonitaChat';
import { useThemeClasses } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function BonitaPage() {
  const [input, setInput] = useState('');
  const [selectedMode, setSelectedMode] = useState('conversation');
  const [context, setContext] = useState('block');
  const [voiceMode, setVoiceMode] = useState(false);
  const messagesEndRef = useRef(null);
  const {
    messages,
    loading,
    recording,
    transcribing,
    askBonita,
    askBonitaWithVoice,
    playAudio,
    stopAudio,
    startRecording,
    stopRecording,
    clearMessages
  } = useBonitaChat();
  const { isDark, textClass, textMutedClass, textVeryMutedClass, borderClass, hoverBgClass, hoverTextClass } = useThemeClasses();

  const modes = [
    {
      id: 'conversation',
      label: 'Chat',
      icon: MessageSquare,
      description: 'Natural conversation with Bonita'
    },
    {
      id: 'vibe_check',
      label: 'Vibe Check',
      icon: Zap,
      description: 'Analyze sentiment and emotion'
    },
    {
      id: 'tone_rewrite',
      label: 'Tone Lab',
      icon: Palette,
      description: 'Get rewrites in different styles'
    },
  ];

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput('');

    if (voiceMode) {
      await askBonitaWithVoice(text, selectedMode, context);
    } else {
      await askBonita(text, selectedMode, context);
    }
  };

  const handleMicToggle = async () => {
    if (recording) {
      const text = await stopRecording();
      if (text && text.trim()) {
        if (voiceMode) {
          await askBonitaWithVoice(text.trim(), selectedMode, context);
        } else {
          setInput(text.trim());
        }
      } else if (text === null) {
        toast.error('Could not transcribe audio. Try again.');
      }
    } else {
      try {
        await startRecording();
      } catch {
        toast.error('Microphone access is needed for voice input');
      }
    }
  };

  const handlePlayMessage = (msg) => {
    if (msg.audio) {
      playAudio(msg.audio, msg.audioFormat);
    }
  };

  return (
    <div className="mb-safe flex flex-col min-h-[calc(100vh-8rem)]" data-testid="bonita-page">
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 glass border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted">
              <Sparkles className={cn("h-5 w-5", textClass)} />
            </div>
            <div>
              <h1 className={cn("font-display text-sm tracking-widest uppercase", textClass)}>Bonita</h1>
              <p className={cn("text-[10px]", textVeryMutedClass)}>Your culturally fluent AI companion</p>
            </div>
          </div>
          {/* Voice Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = !voiceMode;
              setVoiceMode(next);
              if (!next) stopAudio();
            }}
            className={cn(
              "rounded-none text-xs gap-1.5",
              voiceMode
                ? "text-amber-500 hover:text-amber-400"
                : cn(textVeryMutedClass, hoverTextClass)
            )}
          >
            {voiceMode ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span className="font-display tracking-wider">{voiceMode ? 'Voice On' : 'Voice Off'}</span>
          </Button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Button
                key={mode.id}
                variant="ghost"
                onClick={() => setSelectedMode(mode.id)}
                className={cn(
                  "flex flex-col items-center gap-2 h-auto py-3 transition-colors rounded-none",
                  selectedMode === mode.id
                    ? (isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")
                    : cn(textMutedClass, hoverTextClass, hoverBgClass)
                )}
                data-testid={`bonita-mode-${mode.id}`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-display tracking-wider">{mode.label}</span>
              </Button>
            );
          })}
        </div>
        <p className={cn("text-[10px] mt-3 text-center", isDark ? "text-white/30" : "text-gray-400")}>
          {modes.find(m => m.id === selectedMode)?.description}
        </p>
      </div>

      {/* Context Toggle */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <span className={cn("text-[10px] uppercase tracking-wider", textVeryMutedClass)}>Context:</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setContext('block')}
          className={cn(
            "text-[10px] h-6 px-2 rounded-none",
            context === 'block' ? cn("bg-muted", textClass) : textVeryMutedClass
          )}
        >
          The Block
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setContext('cookout')}
          className={cn(
            "text-[10px] h-6 px-2 rounded-none",
            context === 'cookout' ? cn("bg-muted", textClass) : textVeryMutedClass
          )}
        >
          The Cookout
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className={cn("w-16 h-16 mx-auto mb-4 flex items-center justify-center", isDark ? "bg-white/5" : "bg-gray-100")}>
              <Sparkles className={cn("h-8 w-8", isDark ? "text-white/30" : "text-gray-400")} />
            </div>
            <h2 className={cn("font-display text-sm tracking-wider mb-2", textClass)}>Hey, I'm Bonita</h2>
            <p className={cn("text-xs max-w-sm mx-auto mb-4", textVeryMutedClass)}>
              I'm here to help you navigate culture, check vibes, and refine your tone.
              Think of me as the auntie who always knows what's really going on.
            </p>
            {voiceMode && (
              <p className={cn("text-xs", "text-amber-500/70")}>
                Voice mode is on — tap the mic to talk to me
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "p-4 animate-fade-in",
                  msg.role === 'user'
                    ? cn("bg-muted ml-8", isDark ? "text-white/80" : "text-gray-700")
                    : cn("border border-border mr-8", isDark ? "bg-white/5 text-white" : "bg-gray-50 text-gray-900")
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn("flex items-center gap-2 text-[10px] uppercase tracking-wider", textVeryMutedClass)}>
                      <Sparkles className="h-3 w-3" />
                      <span>Bonita</span>
                    </div>
                    {msg.audio && (
                      <button
                        onClick={() => handlePlayMessage(msg)}
                        className="p-1 transition-colors text-amber-500 hover:text-amber-400"
                        title="Play audio"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            ))}
            {loading && (
              <div className={cn("p-4 border border-border mr-8 animate-pulse", isDark ? "bg-white/5" : "bg-gray-50")}>
                <div className={cn("flex items-center gap-2 text-[10px]", textVeryMutedClass)}>
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  <span>{voiceMode ? 'Bonita is preparing her response...' : 'Bonita is thinking...'}</span>
                </div>
              </div>
            )}
            {transcribing && (
              <div className={cn("p-4 bg-muted ml-8 animate-pulse")}>
                <div className={cn("flex items-center gap-2 text-[10px]", textVeryMutedClass)}>
                  <Mic className="h-3 w-3 animate-pulse" />
                  <span>Transcribing your voice...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border glass">
        {recording && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className={cn("text-xs font-display tracking-wider", "text-red-400")}>
              LISTENING...
            </span>
            <span className={cn("text-[10px]", textVeryMutedClass)}>Tap mic to stop</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={voiceMode ? "Tap the mic or type..." : "Ask Bonita anything..."}
            className={cn("min-h-[80px] resize-none bg-transparent text-sm mb-3 rounded-none", textClass, isDark ? "border-white/20 focus:border-white" : "border-gray-300 focus:border-gray-900")}
            data-testid="bonita-input"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={clearMessages}
              className={cn("rounded-none text-xs", textVeryMutedClass, hoverTextClass, hoverBgClass)}
              data-testid="bonita-clear"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Clear
            </Button>

            {/* Mic Button */}
            <Button
              type="button"
              onClick={handleMicToggle}
              disabled={loading || transcribing}
              className={cn(
                "rounded-none",
                recording
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : isDark
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {recording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className={cn("flex-1 rounded-none font-display tracking-wider text-xs", isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")}
              data-testid="bonita-submit"
            >
              {loading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-2" />
                  Ask Bonita
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
