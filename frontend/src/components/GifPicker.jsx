import { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Using Giphy API (free tier)
const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65'; // Public beta key

export const GifPicker = ({ open, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trendingGifs, setTrendingGifs] = useState([]);

  // Fetch trending on mount
  useEffect(() => {
    if (open && trendingGifs.length === 0) {
      fetchTrending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=pg-13`
      );
      const data = await res.json();
      setTrendingGifs(data.data || []);
      setGifs(data.data || []);
    } catch (e) {
      console.error('Giphy trending error:', e);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setGifs(trendingGifs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=pg-13`
      );
      const data = await res.json();
      setGifs(data.data || []);
    } catch (e) {
      console.error('Giphy search error:', e);
    } finally {
      setLoading(false);
    }
  }, [trendingGifs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchGifs(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchGifs]);

  const handleSelect = (gif) => {
    onSelect({
      url: gif.images.fixed_height.url,
      width: gif.images.fixed_height.width,
      height: gif.images.fixed_height.height,
      title: gif.title,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Picker */}
      <div className="relative w-full sm:max-w-md bg-black border border-white/20 max-h-[70vh] flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-display text-sm tracking-widest uppercase">The Reaction</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-8 w-8 text-white/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reactions... (Side eye, Shannon Sharpe...)"
              className="pl-10 bg-transparent border-white/20 focus:border-white rounded-none text-sm"
              autoFocus
              data-testid="gif-search-input"
            />
          </div>
          
          {/* Quick tags */}
          <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar">
            {['Side Eye', 'Oop', 'Facts', 'Huh', 'Nope', 'Crying'].map(tag => (
              <button
                key={tag}
                onClick={() => setQuery(tag)}
                className={cn(
                  "px-3 py-1 text-xs border border-white/20 whitespace-nowrap transition-colors",
                  query === tag ? "bg-white text-black" : "text-white/60 hover:text-white hover:border-white/40"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* GIF Grid */}
        <ScrollArea className="flex-1 p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/40 text-sm">No GIFs found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleSelect(gif)}
                  className="relative aspect-video overflow-hidden border border-white/10 hover:border-white/40 transition-colors"
                  data-testid={`gif-${gif.id}`}
                >
                  <img
                    src={gif.images.fixed_height_small.url}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t border-white/10 text-center">
          <span className="text-[10px] text-white/30">Powered by GIPHY</span>
        </div>
      </div>
    </div>
  );
};
