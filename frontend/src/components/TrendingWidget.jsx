import { useState, useEffect } from 'react';
import { TrendingUp, Hash, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// "The Word" - Trending Topics Widget
export const TrendingWidget = ({ className }) => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      const response = await axios.get(`${API}/trending`, { withCredentials: true });
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
        <TrendingUp className="h-5 w-5 text-white" />
        <h3 className="font-display text-sm tracking-widest uppercase">The Word</h3>
      </div>
      
      <p className="text-[10px] text-white/40 mb-4 uppercase tracking-wider">What's poppin'</p>
      
      {/* Trending List */}
      <div className="space-y-1">
        {trending.map((topic, index) => (
          <Link
            key={topic.hashtag}
            to={`/search?q=${encodeURIComponent(topic.hashtag)}`}
            className="block py-3 px-2 -mx-2 hover:bg-white/5 transition-colors group"
            data-testid={`trending-${index}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3 w-3 text-white/40" />
                  <span className="font-medium text-white text-sm group-hover:underline">
                    {topic.hashtag.replace('#', '')}
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-0.5">
                  {formatCount(topic.post_count)} Plates served
                </p>
              </div>
              <span className={`text-[10px] font-mono ${
                topic.change === 'new' 
                  ? 'text-green-400' 
                  : topic.change.startsWith('+') 
                    ? 'text-white/60' 
                    : 'text-white/40'
              }`}>
                {topic.change}
              </span>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <Link 
          to="/search"
          className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1"
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

  useEffect(() => {
    if (url) {
      fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const fetchPreview = async () => {
    try {
      const response = await axios.get(`${API}/link-preview`, {
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
      <div className={`border border-white/20 overflow-hidden ${className}`}>
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
      className={`block border border-white/20 overflow-hidden hover:border-white/40 transition-colors ${className}`}
      data-testid="link-preview"
    >
      {/* Image */}
      {preview?.image && (
        <div className={cn(
          "overflow-hidden bg-white/5",
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
      <div className="p-3 bg-white/5">
        <p className="text-sm text-white font-medium line-clamp-2 mb-1">
          {preview?.title || 'Link'}
        </p>
        {preview?.description && (
          <p className="text-xs text-white/50 line-clamp-2 mb-2">
            {preview.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
          <ExternalLink className="h-3 w-3" />
          <span>{preview?.domain || new URL(url).hostname}</span>
        </div>
      </div>
    </a>
  );
};
