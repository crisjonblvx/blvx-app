import { useState } from 'react';
import { Sparkles, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBonitaChat } from '@/hooks/useBonitaChat';
import { cn } from '@/lib/utils';

export const BonitaPanel = () => {
  const [input, setInput] = useState('');
  const [selectedType, setSelectedType] = useState('cultural_context');
  const { messages, loading, askBonita, clearMessages } = useBonitaChat();

  const promptTypes = [
    { id: 'cultural_context', label: 'Context', description: 'Explain cultural references' },
    { id: 'thread_decompress', label: 'Decompress', description: 'Break down threads' },
    { id: 'tone_refine', label: 'Refine', description: 'Polish your tone' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    await askBonita(input.trim(), selectedType);
    setInput('');
  };

  return (
    <aside className="hidden xl:flex fixed right-0 top-0 bottom-0 w-80 flex-col border-l border-white/10 bg-black z-40 bonita-panel">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-sm bonita-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-wide uppercase">Bonita</h2>
            <p className="text-xs text-white/50">Your cultural AI companion</p>
          </div>
        </div>
      </div>

      {/* Type Selector */}
      <div className="p-4 border-b border-white/10">
        <div className="flex gap-2">
          {promptTypes.map((type) => (
            <Button
              key={type.id}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedType(type.id)}
              className={cn(
                "flex-1 text-xs transition-colors",
                selectedType === type.id 
                  ? "bg-white text-black hover:bg-white/90" 
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
              data-testid={`bonita-type-${type.id}`}
            >
              {type.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-2 text-center">
          {promptTypes.find(t => t.id === selectedType)?.description}
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-sm">
              Hey, I'm Bonita. Paste some text and I'll help you understand the culture, decompress drama, or refine your tone.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-sm text-sm animate-fade-in",
                  msg.role === 'user' 
                    ? "bg-white/10 text-white/80" 
                    : "bg-white/5 text-white border border-white/10"
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-white/50">
                    <Sparkles className="h-3 w-3" />
                    <span className="uppercase tracking-wide">Bonita</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {loading && (
              <div className="p-3 bg-white/5 rounded-sm border border-white/10 animate-pulse">
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
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex gap-2 mb-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste text here..."
            className="flex-1 min-h-[80px] resize-none bg-transparent border-white/20 focus:border-white text-sm"
            data-testid="bonita-input"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-white/50 hover:text-white hover:bg-white/10"
            data-testid="bonita-clear"
          >
            <RefreshCw className="h-4 w-4" />
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
    </aside>
  );
};
