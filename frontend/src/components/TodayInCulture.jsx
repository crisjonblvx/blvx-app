import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Category colors
const CATEGORY_COLORS = {
  'black-history': 'bg-amber-500',
  'hip-hop': 'bg-purple-500',
  'lgbtq': 'bg-pink-500',
  'indigenous': 'bg-orange-600',
  'aapi': 'bg-red-500',
  'latino': 'bg-green-500',
  'women': 'bg-fuchsia-500',
  'disability': 'bg-blue-500',
  'mental-health': 'bg-teal-500',
  'awareness': 'bg-cyan-500',
  'cultural': 'bg-indigo-500',
  'caribbean': 'bg-yellow-500',
  'arab': 'bg-emerald-500',
  'music': 'bg-rose-500',
  'education': 'bg-sky-500',
  'remembrance': 'bg-gray-600',
  'general': 'bg-slate-500',
};

// Subset of cultural dates (full list is in CalendarPage)
const NOTABLE_DATES = [
  // January
  { month: 1, day: 1, name: "Emancipation Proclamation Anniversary", description: "1863 - Lincoln declared freedom for enslaved people", category: "black-history" },
  { month: 1, day: 15, name: "MLK Day (observed)", description: "Honoring Dr. Martin Luther King Jr.'s legacy", category: "black-history" },
  { month: 1, day: 17, name: "Muhammad Ali's Birthday", description: "The Greatest — boxer, activist, icon", category: "black-history" },
  // February
  { month: 2, day: 1, name: "Black History Month Begins", description: "Celebrating Black history, culture, and achievement", category: "black-history" },
  { month: 2, day: 4, name: "Rosa Parks Day", description: "Mother of the civil rights movement", category: "black-history" },
  { month: 2, day: 14, name: "Frederick Douglass Day", description: "Abolitionist, orator, and statesman", category: "black-history" },
  { month: 2, day: 21, name: "Malcolm X Assassination Anniversary", description: "1965 - El-Hajj Malik El-Shabazz martyred", category: "black-history" },
  // March
  { month: 3, day: 1, name: "Women's History Month Begins", description: "Celebrating women's contributions throughout history", category: "women" },
  { month: 3, day: 8, name: "International Women's Day", description: "Honoring women's achievements worldwide", category: "women" },
  { month: 3, day: 9, name: "Notorious B.I.G.'s Death Anniversary", description: "1997 - Biggie Smalls, the greatest storyteller", category: "hip-hop" },
  { month: 3, day: 31, name: "César Chávez Day", description: "Labor leader and civil rights activist", category: "latino" },
  { month: 3, day: 31, name: "Transgender Day of Visibility", description: "Celebrating trans people worldwide", category: "lgbtq" },
  // April
  { month: 4, day: 4, name: "MLK Assassination Anniversary", description: "1968 - The dream lives on", category: "black-history" },
  { month: 4, day: 15, name: "Jackie Robinson Day", description: "Broke baseball's color barrier in 1947", category: "black-history" },
  { month: 4, day: 16, name: "Tupac Shakur's Birthday", description: "2Pac — poet, revolutionary, icon", category: "hip-hop" },
  // May
  { month: 5, day: 1, name: "AAPI Heritage Month Begins", description: "Celebrating Asian American & Pacific Islander heritage", category: "aapi" },
  { month: 5, day: 5, name: "Cinco de Mayo", description: "Celebrating Mexican heritage and pride", category: "latino" },
  { month: 5, day: 19, name: "Malcolm X Day", description: "Honoring Malcolm X's birthday and legacy", category: "black-history" },
  // June
  { month: 6, day: 1, name: "Pride Month Begins", description: "Celebrating LGBTQ+ community and history", category: "lgbtq" },
  { month: 6, day: 19, name: "Juneteenth", description: "Freedom Day — End of slavery in America", category: "black-history" },
  { month: 6, day: 28, name: "Stonewall Riots Anniversary", description: "1969 — The birth of Pride", category: "lgbtq" },
  // July
  { month: 7, day: 18, name: "Nelson Mandela International Day", description: "Honoring Madiba's legacy of justice", category: "black-history" },
  // August
  { month: 8, day: 4, name: "Barack Obama's Birthday", description: "44th President — first Black president", category: "black-history" },
  { month: 8, day: 11, name: "Hip-Hop's Birthday", description: "1973 — DJ Kool Herc's party in the Bronx started it all", category: "hip-hop" },
  { month: 8, day: 28, name: "'I Have a Dream' Anniversary", description: "1963 — MLK's historic March on Washington speech", category: "black-history" },
  // September
  { month: 9, day: 13, name: "Tupac's Death Anniversary", description: "1996 — Rest in power, Makaveli", category: "hip-hop" },
  { month: 9, day: 15, name: "Hispanic Heritage Month Begins", description: "Celebrating Hispanic and Latino culture", category: "latino" },
  // October
  { month: 10, day: 1, name: "LGBTQ History Month Begins", description: "Celebrating LGBTQ+ history and achievements", category: "lgbtq" },
  { month: 10, day: 9, name: "Indigenous Peoples' Day", description: "Honoring Native peoples (not Columbus)", category: "indigenous" },
  { month: 10, day: 10, name: "World Mental Health Day", description: "Global mental health awareness", category: "mental-health" },
  { month: 10, day: 11, name: "National Coming Out Day", description: "Celebrating LGBTQ+ visibility", category: "lgbtq" },
  // November
  { month: 11, day: 1, name: "Native American Heritage Month Begins", description: "Honoring Indigenous peoples and cultures", category: "indigenous" },
  { month: 11, day: 1, name: "Día de los Muertos", description: "Day of the Dead — honoring ancestors", category: "latino" },
  { month: 11, day: 20, name: "Transgender Day of Remembrance", description: "Honoring trans lives lost to violence", category: "lgbtq" },
  // December
  { month: 12, day: 1, name: "World AIDS Day", description: "Raising awareness and remembering those lost", category: "awareness" },
  { month: 12, day: 5, name: "Rosa Parks Day (Anniversary)", description: "1955 — The Montgomery Bus Boycott began", category: "black-history" },
  { month: 12, day: 26, name: "Kwanzaa Begins", description: "Seven-day celebration of African heritage", category: "black-history" },
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

export const TodayInCulture = ({ className }) => {
  const isDark = useTheme();
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  
  // Find today's notable dates
  const todaysDates = NOTABLE_DATES.filter(
    date => date.month === currentMonth && date.day === currentDay
  );
  
  // If no dates today, don't render
  if (todaysDates.length === 0) {
    return null;
  }
  
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/60' : 'text-gray-600';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';
  const bgClass = isDark ? 'bg-white/5' : 'bg-gray-50';
  
  return (
    <div className={cn("p-4 border-b", borderClass, className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded", isDark ? "bg-amber-500/20" : "bg-amber-100")}>
            <Calendar className="h-4 w-4 text-amber-500" />
          </div>
          <span className={cn("text-xs font-display tracking-wider uppercase", textMutedClass)}>
            Today in Culture
          </span>
        </div>
        <Link 
          to="/calendar"
          className={cn("text-[10px] flex items-center gap-1 hover:underline", textMutedClass)}
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      
      {/* Dates */}
      <div className="space-y-2">
        {todaysDates.map((date, index) => (
          <div 
            key={index}
            className={cn("p-3 rounded-lg", bgClass)}
          >
            <div className="flex items-start gap-2">
              <span className={cn(
                "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                CATEGORY_COLORS[date.category] || 'bg-gray-500'
              )} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", textClass)}>
                  {date.name}
                </p>
                <p className={cn("text-xs mt-0.5", textMutedClass)}>
                  {date.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Bonita prompt suggestion */}
      {todaysDates.length > 0 && (
        <Link 
          to="/bonita"
          className={cn(
            "mt-3 flex items-center justify-center gap-2 py-2 rounded text-xs transition-colors",
            isDark ? "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20" : "bg-purple-50 text-purple-600 hover:bg-purple-100"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Ask Bonita about {todaysDates[0].name.split(' ')[0]}
        </Link>
      )}
    </div>
  );
};

export default TodayInCulture;
