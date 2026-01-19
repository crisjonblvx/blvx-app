import { useState } from 'react';
import { Sparkles, Send, RefreshCw, Zap, MessageSquare, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBonitaChat } from '@/hooks/useBonitaChat';
import { cn } from '@/lib/utils';

export default function BonitaPage() {
  const [input, setInput] = useState('');
  const [selectedMode, setSelectedMode] = useState('conversation');
  const [context, setContext] = useState('block');
  const { messages, loading, askBonita, clearMessages } = useBonitaChat();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    await askBonita(input.trim(), selectedMode, context);
    setInput('');
  };

  return (
    <div className="mb-safe flex flex-col min-h-[calc(100vh-8rem)]" data-testid="bonita-page">
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 glass border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-sm tracking-widest uppercase">Bonita</h1>
            <p className="text-[10px] text-white/40">Your culturally fluent AI companion</p>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="p-4 border-b border-white/10">
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
                    ? "bg-white text-black hover:bg-white/90" 
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
                data-testid={`bonita-mode-${mode.id}`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-display tracking-wider">{mode.label}</span>
              </Button>
            );
          })}
        </div>
        <p className="text-[10px] text-white/30 mt-3 text-center">
          {modes.find(m => m.id === selectedMode)?.description}
        </p>
      </div>

      {/* Context Toggle */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Context:</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setContext('block')}
          className={cn(
            "text-[10px] h-6 px-2 rounded-none",
            context === 'block' ? "bg-white/10 text-white" : "text-white/40"
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
            context === 'cookout' ? "bg-white/10 text-white" : "text-white/40"
          )}
        >
          The Cookout
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/5 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white/30" />
            </div>
            <h2 className="font-display text-sm tracking-wider mb-2">Hey, I'm Bonita</h2>
            <p className="text-white/40 text-xs max-w-sm mx-auto">
              I'm here to help you navigate culture, check vibes, and refine your tone. 
              Think of me as the auntie who always knows what's really going on.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "p-4 animate-fade-in",
                  msg.role === 'user' 
                    ? "bg-white/10 text-white/80 ml-8" 
                    : "bg-white/5 text-white border border-white/10 mr-8"
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 text-[10px] text-white/40 uppercase tracking-wider">
                    <Sparkles className="h-3 w-3" />
                    <span>Bonita</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            ))}
            {loading && (
              <div className="p-4 bg-white/5 border border-white/10 mr-8 animate-pulse">
                <div className="flex items-center gap-2 text-[10px] text-white/40">
                  <Sparkles className="h-3 w-3 animate-pulse" />
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
            placeholder="Ask Bonita anything..."
            className="min-h-[100px] resize-none bg-transparent border-white/20 focus:border-white text-sm mb-3 rounded-none"
            data-testid="bonita-input"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={clearMessages}
              className="text-white/40 hover:text-white hover:bg-white/5 rounded-none text-xs"
              data-testid="bonita-clear"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Clear
            </Button>
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex-1 bg-white text-black hover:bg-white/90 rounded-none font-display tracking-wider text-xs"
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
