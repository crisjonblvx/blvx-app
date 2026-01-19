import { useState } from 'react';
import { Sparkles, Send, RefreshCw, Zap, MessageSquare, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBonitaChat } from '@/hooks/useBonitaChat';
import { cn } from '@/lib/utils';

export default function BonitaPage() {
  const [input, setInput] = useState('');
  const [selectedType, setSelectedType] = useState('cultural_context');
  const [selectedTone, setSelectedTone] = useState('calm');
  const { messages, loading, askBonita, clearMessages } = useBonitaChat();

  const promptTypes = [
    { 
      id: 'cultural_context', 
      label: 'Context', 
      icon: MessageSquare,
      description: 'Explain cultural references, slang, memes, and coded language' 
    },
    { 
      id: 'thread_decompress', 
      label: 'Decompress', 
      icon: Zap,
      description: 'Break down heated or complex threads' 
    },
    { 
      id: 'tone_refine', 
      label: 'Tone Lab', 
      icon: Palette,
      description: 'Polish your message in different styles' 
    },
  ];

  const toneVariants = [
    { id: 'calm', label: 'Calm' },
    { id: 'sharp', label: 'Sharp' },
    { id: 'humorous', label: 'Humorous' },
    { id: 'respectful', label: 'Respectful' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const toneVariant = selectedType === 'tone_refine' ? selectedTone : null;
    await askBonita(input.trim(), selectedType, toneVariant);
    setInput('');
  };

  return (
    <div className="mb-safe flex flex-col min-h-[calc(100vh-8rem)]" data-testid="bonita-page">
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 glass border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-sm bonita-glow">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-wide uppercase">Bonita</h1>
            <p className="text-xs text-white/50">Your cultural AI companion</p>
          </div>
        </div>
      </div>

      {/* Type Selector */}
      <div className="p-4 border-b border-white/10">
        <div className="grid grid-cols-3 gap-2">
          {promptTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Button
                key={type.id}
                variant="ghost"
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "flex flex-col items-center gap-2 h-auto py-3 transition-colors",
                  selectedType === type.id 
                    ? "bg-white text-black hover:bg-white/90" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
                data-testid={`bonita-type-${type.id}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{type.label}</span>
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-white/40 mt-3 text-center">
          {promptTypes.find(t => t.id === selectedType)?.description}
        </p>
      </div>

      {/* Tone Selector (only for tone_refine) */}
      {selectedType === 'tone_refine' && (
        <div className="p-4 border-b border-white/10 animate-fade-in">
          <p className="text-xs text-white/50 mb-2">Select tone:</p>
          <div className="flex gap-2">
            {toneVariants.map((tone) => (
              <Button
                key={tone.id}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTone(tone.id)}
                className={cn(
                  "flex-1 text-xs",
                  selectedTone === tone.id 
                    ? "bg-white text-black hover:bg-white/90" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                {tone.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-white/5 flex items-center justify-center bonita-glow">
              <Sparkles className="h-8 w-8 text-white/40" />
            </div>
            <h2 className="font-display text-lg mb-2">Hey, I'm Bonita</h2>
            <p className="text-white/40 text-sm max-w-sm mx-auto">
              I'm here to help you navigate culture, decompress heated discussions, and refine your tone. 
              Paste some text and let's talk.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "p-4 rounded-sm animate-fade-in",
                  msg.role === 'user' 
                    ? "bg-white/10 text-white/80 ml-8" 
                    : "bg-white/5 text-white border border-white/10 mr-8"
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-white/50">
                    <Sparkles className="h-3 w-3" />
                    <span className="uppercase tracking-wide font-medium">Bonita</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            ))}
            {loading && (
              <div className="p-4 bg-white/5 rounded-sm border border-white/10 mr-8 animate-pulse">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Sparkles className="h-3 w-3 animate-pulse-slow" />
                  <span>Bonita is thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-white/10 glass">
        <form onSubmit={handleSubmit}>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste text here..."
            className="min-h-[100px] resize-none bg-transparent border-white/20 focus:border-white text-sm mb-3"
            data-testid="bonita-input"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={clearMessages}
              className="text-white/50 hover:text-white hover:bg-white/10"
              data-testid="bonita-clear"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex-1 bg-white text-black hover:bg-white/90 rounded-sm"
              data-testid="bonita-submit"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
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
