import { useState, useEffect } from 'react';
import { TrendingUp, Hash, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import api from '@/lib/api';


// Theme hook for components
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

// "The Word" - Trending Topics Widget
export const TrendingWidget = ({ className }) => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDark = useTheme();
  
  // Theme-aware classes
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/40' : 'text-gray-500';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';
  const hoverBgClass = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100';

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      const response = await api.get(`/trending`, { withCredentials: true });
      setTrending(response.data.trends || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
      // Fallback mock data for when API is not ready
      setTrending([
        { hashtag: '#TechAccountability', post_count: 1247, change: '+12%' },
        { hashtag: '#MusicCulture', post_count: 892, change: '+8%' },
        { hashtag: '#TheBlock', post_count: 654, change: '+5%' },
        { hashtag: '#StoopTalk', post_count: 421, change: '+3%' },
        { hashtag: '#BonitaSays', post_count: 318, change: 'new' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-24" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="py-3">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className} data-testid="trending-widget">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className={cn("h-5 w-5", textClass)} />
        <h3 className={cn("font-display text-sm tracking-widest uppercase", textClass)}>The Word</h3>
      </div>
      
      <p className={cn("text-[10px] mb-4 uppercase tracking-wider", textMutedClass)}>What's poppin'</p>
      
      {/* Trending List */}
      <div className="space-y-1">
        {trending.map((topic, index) => (
          <Link
            key={topic.hashtag}
            to={`/search?q=${encodeURIComponent(topic.hashtag)}`}
            className={cn("block py-3 px-2 -mx-2 transition-colors group", hoverBgClass)}
            data-testid={`trending-${index}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <Hash className={cn("h-3 w-3", textMutedClass)} />
                  <span className={cn("font-medium text-sm group-hover:underline", textClass)}>
                    {topic.hashtag.replace('#', '')}
                  </span>
                </div>
                <p className={cn("text-xs mt-0.5", textMutedClass)}>
                  {formatCount(topic.post_count)} Plates served
                </p>
              </div>
              <span className={cn("text-[10px] font-mono", 
                topic.change === 'new' 
                  ? 'text-green-400' 
                  : topic.change.startsWith('+') 
                    ? (isDark ? 'text-white/60' : 'text-gray-600')
                    : textMutedClass
              )}>
                {topic.change}
              </span>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Footer */}
      <div className={cn("mt-4 pt-4 border-t", borderClass)}>
        <Link 
          to="/search"
          className={cn("text-xs transition-colors flex items-center gap-1", textMutedClass, isDark ? "hover:text-white" : "hover:text-gray-900")}
        >
          See more
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
};

// Rich Link Preview Card for posts with reference URLs
export const LinkPreviewCard = ({ url, className }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isDark = useTheme();
  
  // Theme-aware classes
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/50' : 'text-gray-600';
  const textVeryMutedClass = isDark ? 'text-white/40' : 'text-gray-500';
  const borderClass = isDark ? 'border-white/20' : 'border-gray-200';
  const borderHoverClass = isDark ? 'hover:border-white/40' : 'hover:border-gray-400';
  const bgClass = isDark ? 'bg-white/5' : 'bg-gray-50';

  useEffect(() => {
    if (url) {
      fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const fetchPreview = async () => {
    try {
      const response = await api.get(`/link-preview`, {
        params: { url },
        withCredentials: true
      });
      setPreview(response.data);
    } catch (error) {
      console.error('Error fetching link preview:', error);
      // Fallback: extract domain from URL
      try {
        const urlObj = new URL(url);
        setPreview({
          title: urlObj.pathname.split('/').filter(Boolean).pop() || 'Link',
          description: 'View the full article',
          domain: urlObj.hostname.replace('www.', ''),
          image: null,
          url: url
        });
      } catch {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!url || error) return null;

  if (loading) {
    return (
      <div className={cn("border overflow-hidden", borderClass, className)}>
        <Skeleton className="h-32 w-full" />
        <div className="p-3">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    );
  }

  // Check if it's a Google Search URL
  const isGoogleSearch = url.includes('google.com/search');

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("block border overflow-hidden transition-colors", borderClass, borderHoverClass, className)}
      data-testid="link-preview"
    >
      {/* Image */}
      {preview?.image && (
        <div className={cn(
          "overflow-hidden",
          bgClass,
          isGoogleSearch ? "h-16 flex items-center justify-center" : "h-32"
        )}>
          <img
            src={preview.image}
            alt=""
            className={cn(
              "object-contain",
              isGoogleSearch ? "h-8" : "w-full h-full object-cover"
            )}
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>
      )}
      
      {/* Content */}
      <div className={cn("p-3", bgClass)}>
        <p className={cn("text-sm font-medium line-clamp-2 mb-1", textClass)}>
          {preview?.title || 'Link'}
        </p>
        {preview?.description && (
          <p className={cn("text-xs line-clamp-2 mb-2", textMutedClass)}>
            {preview.description}
          </p>
        )}
        <div className={cn("flex items-center gap-1.5 text-[10px]", textVeryMutedClass)}>
          <ExternalLink className="h-3 w-3" />
          <span>{preview?.domain || new URL(url).hostname}</span>
        </div>
      </div>
    </a>
  );
};
