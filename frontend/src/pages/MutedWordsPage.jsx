import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquareOff, Plus, X, Loader2 } from 'lucide-react';
import { useThemeClasses } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MutedWordsPage() {
  const navigate = useNavigate();
  const { isDark, textClass, textMutedClass, textVeryMutedClass, borderClass } = useThemeClasses();
  
  const [mutedWords, setMutedWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    fetchMutedWords();
  }, []);

  const fetchMutedWords = async () => {
    try {
      const response = await axios.get(`${API}/users/muted-words`, { withCredentials: true });
      setMutedWords(response.data.muted_words || []);
    } catch (error) {
      console.error('Error fetching muted words:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWord = async (e) => {
    e.preventDefault();
    const word = newWord.trim().toLowerCase();
    
    if (!word) return;
    if (mutedWords.includes(word)) {
      toast.error('Word already muted');
      return;
    }
    if (mutedWords.length >= 50) {
      toast.error('Maximum 50 muted words allowed');
      return;
    }
    
    setAdding(true);
    try {
      await axios.post(`${API}/users/muted-words/add?word=${encodeURIComponent(word)}`, {}, { withCredentials: true });
      setMutedWords([...mutedWords, word]);
      setNewWord('');
      toast.success(`Now muting "${word}"`);
    } catch (error) {
      toast.error('Failed to add word');
    } finally {
      setAdding(false);
    }
  };

  const removeWord = async (word) => {
    setRemoving(word);
    try {
      await axios.delete(`${API}/users/muted-words/${encodeURIComponent(word)}`, { withCredentials: true });
      setMutedWords(mutedWords.filter(w => w !== word));
      toast.success(`No longer muting "${word}"`);
    } catch (error) {
      toast.error('Failed to remove word');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="mb-safe" data-testid="muted-words-page">
      {/* Header */}
      <div className={cn("sticky top-14 md:top-0 z-30 glass border-b p-4", borderClass)}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className={cn(isDark ? "text-white/60 hover:text-white" : "text-gray-600 hover:text-gray-900")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <MessageSquareOff className={cn("h-5 w-5", textClass)} />
            <h1 className={cn("font-display text-lg tracking-wide uppercase", textClass)}>
              Muted Words
            </h1>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {/* Explanation */}
        <div className={cn("p-4 rounded-lg mb-6 text-sm", isDark ? "bg-white/5" : "bg-gray-50")}>
          <p className={textMutedClass}>
            Posts containing these words or phrases will be hidden from your feed. 
            Other people can still see them.
          </p>
        </div>

        {/* Add Word Form */}
        <form onSubmit={addWord} className="flex gap-2 mb-6">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Add a word or phrase..."
            className={cn(
              "flex-1 bg-transparent rounded-none",
              isDark ? "border-white/20 focus:border-white" : "border-gray-300 focus:border-gray-900"
            )}
            maxLength={50}
          />
          <Button
            type="submit"
            disabled={!newWord.trim() || adding}
            className={cn("rounded-none", isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")}
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {/* Word Count */}
        <p className={cn("text-xs mb-4", textVeryMutedClass)}>
          {mutedWords.length}/50 words muted
        </p>

        {/* Muted Words List */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : mutedWords.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquareOff className={cn("h-12 w-12 mx-auto mb-4", isDark ? "text-white/20" : "text-gray-300")} />
            <p className={cn("text-sm", textMutedClass)}>No muted words yet</p>
            <p className={cn("text-xs mt-1", textVeryMutedClass)}>
              Add words above to filter them from your feed
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mutedWords.map((word) => (
              <div
                key={word}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-full border",
                  isDark ? "bg-white/5 border-white/20" : "bg-gray-100 border-gray-200"
                )}
              >
                <span className={textClass}>{word}</span>
                <button
                  onClick={() => removeWord(word)}
                  disabled={removing === word}
                  className={cn(
                    "p-0.5 rounded-full transition-colors",
                    isDark ? "hover:bg-white/20 text-white/50 hover:text-white" : "hover:bg-gray-300 text-gray-500 hover:text-gray-700"
                  )}
                >
                  {removing === word ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Examples */}
        <div className={cn("mt-8 p-4 rounded-lg text-sm", isDark ? "bg-white/5" : "bg-gray-50")}>
          <p className={cn("font-medium mb-2", textClass)}>Examples</p>
          <ul className={cn("space-y-1 text-xs", textMutedClass)}>
            <li>• Mute "spoiler" during a new show release</li>
            <li>• Mute topics you need a break from</li>
            <li>• Mute specific phrases, not just single words</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
