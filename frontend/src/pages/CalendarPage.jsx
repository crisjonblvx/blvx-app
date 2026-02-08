import { useState, useEffect } from 'react';
import { useThemeClasses } from '@/hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Notable cultural dates throughout the year
const CULTURAL_DATES = [
  { month: 1, day: 1, name: "New Year's Day", description: "Fresh starts and new beginnings" },
  { month: 1, day: 15, name: "MLK Day (observed)", description: "Honoring Dr. Martin Luther King Jr.'s legacy" },
  { month: 2, day: 1, name: "Black History Month Begins", description: "Celebrating Black history, culture, and achievement" },
  { month: 2, day: 14, name: "Valentine's Day", description: "Celebrating love in all its forms" },
  { month: 3, day: 8, name: "International Women's Day", description: "Honoring women's achievements worldwide" },
  { month: 4, day: 22, name: "Earth Day", description: "Environmental awareness and action" },
  { month: 5, day: 5, name: "Cinco de Mayo", description: "Celebrating Mexican heritage and pride" },
  { month: 5, day: 19, name: "Malcolm X Day", description: "Honoring Malcolm X's birthday and legacy" },
  { month: 6, day: 1, name: "Pride Month Begins", description: "Celebrating LGBTQ+ community and history" },
  { month: 6, day: 19, name: "Juneteenth", description: "Freedom Day - End of slavery in America" },
  { month: 7, day: 4, name: "Independence Day", description: "American independence celebration" },
  { month: 9, day: 15, name: "Hispanic Heritage Month Begins", description: "Celebrating Hispanic and Latino culture" },
  { month: 10, day: 1, name: "Filipino American History Month", description: "Honoring Filipino American contributions" },
  { month: 11, day: 1, name: "Native American Heritage Month", description: "Honoring Indigenous peoples and cultures" },
  { month: 12, day: 26, name: "Kwanzaa Begins", description: "Celebrating African heritage and culture" },
];

export default function CalendarPage() {
  const navigate = useNavigate();
  const [posting, setPosting] = useState(false);
  const [todayEvent, setTodayEvent] = useState(null);

  useEffect(() => {
    // Check if today matches any cultural date
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    
    const event = CULTURAL_DATES.find(
      d => d.month === todayMonth && d.day === todayDay
    );
    setTodayEvent(event);
  }, []);

  const handlePostTodayEvent = async () => {
    setPosting(true);
    try {
      const response = await axios.post(
        `${API}/spark/calendar/post`,
        {},
        { withCredentials: true }
      );
      toast.success(`Posted: ${response.data.event_name}`);
      navigate('/home');
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('No cultural event for today');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to post');
      }
    } finally {
      setPosting(false);
    }
  };

  // Group events by month
  const eventsByMonth = CULTURAL_DATES.reduce((acc, event) => {
    const monthName = new Date(2024, event.month - 1).toLocaleString('default', { month: 'long' });
    if (!acc[monthName]) acc[monthName] = [];
    acc[monthName].push(event);
    return acc;
  }, {});

  return (
    <div className="mb-safe" data-testid="calendar-page">
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 glass border-b border-white/10 p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white/60 hover:text-white md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-500" />
            <h1 className="font-display text-lg tracking-wide uppercase">Culture Calendar</h1>
          </div>
        </div>
      </div>

      {/* Today's Event Highlight */}
      {todayEvent && (
        <div className="p-4 border-b border-white/10 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-6 w-6 text-black" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-amber-500 uppercase tracking-wider mb-1">Today</p>
              <h2 className="font-display text-lg text-white">{todayEvent.name}</h2>
              <p className="text-sm text-white/60 mt-1">{todayEvent.description}</p>
              <Button
                onClick={handlePostTodayEvent}
                disabled={posting}
                className="mt-3 bg-amber-500 text-black hover:bg-amber-400 rounded-none font-display tracking-wider text-sm"
                data-testid="post-today-event-btn"
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Let Bonita Post About This
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar List */}
      <div className="divide-y divide-white/10">
        {Object.entries(eventsByMonth).map(([month, events]) => (
          <div key={month} className="p-4">
            <h3 className="font-display text-sm uppercase tracking-wider text-white/40 mb-3">
              {month}
            </h3>
            <div className="space-y-3">
              {events.map((event, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded-lg"
                >
                  <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold">{event.day}</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{event.name}</p>
                    <p className="text-xs text-white/50">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="p-6 text-center border-t border-white/10">
        <p className="text-sm text-white/40">
          Bonita automatically posts culturally relevant content on these dates.
        </p>
        <p className="text-xs text-white/30 mt-2">
          More dates coming soon...
        </p>
      </div>
    </div>
  );
}
