import { useState, useEffect } from 'react';
import { useThemeClasses } from '@/hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Loader2, Sparkles, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import axios from 'axios';

// Category definitions with colors and labels
const CATEGORIES = {
  all: { label: 'All', color: 'bg-gray-500' },
  'black-history': { label: 'Black History', color: 'bg-amber-500' },
  'hip-hop': { label: 'Hip-Hop', color: 'bg-purple-500' },
  lgbtq: { label: 'LGBTQ+', color: 'bg-pink-500' },
  indigenous: { label: 'Indigenous', color: 'bg-orange-600' },
  aapi: { label: 'AAPI', color: 'bg-red-500' },
  latino: { label: 'Latino/Hispanic', color: 'bg-green-500' },
  women: { label: 'Women', color: 'bg-fuchsia-500' },
  disability: { label: 'Disability', color: 'bg-blue-500' },
  'mental-health': { label: 'Mental Health', color: 'bg-teal-500' },
  awareness: { label: 'Awareness', color: 'bg-cyan-500' },
  cultural: { label: 'Cultural', color: 'bg-indigo-500' },
  caribbean: { label: 'Caribbean', color: 'bg-yellow-500' },
  arab: { label: 'Arab American', color: 'bg-emerald-500' },
  music: { label: 'Music', color: 'bg-rose-500' },
  education: { label: 'Education', color: 'bg-sky-500' },
  remembrance: { label: 'Remembrance', color: 'bg-gray-600' },
  general: { label: 'General', color: 'bg-slate-500' },
};

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Notable cultural dates throughout the year — comprehensive list honoring marginalized histories
const CULTURAL_DATES = [
  // JANUARY
  { month: 1, day: 1, name: "New Year's Day", description: "Fresh starts and new beginnings", category: "general" },
  { month: 1, day: 1, name: "Emancipation Proclamation Anniversary", description: "1863 - Lincoln declared freedom for enslaved people", category: "black-history" },
  { month: 1, day: 4, name: "Louis Braille's Birthday", description: "Creator of the Braille reading system for the blind", category: "disability" },
  { month: 1, day: 11, name: "National Human Trafficking Awareness Day", description: "Raising awareness about modern slavery", category: "awareness" },
  { month: 1, day: 15, name: "MLK Day (observed)", description: "Honoring Dr. Martin Luther King Jr.'s legacy", category: "black-history" },
  { month: 1, day: 17, name: "Muhammad Ali's Birthday", description: "The Greatest — boxer, activist, icon", category: "black-history" },
  { month: 1, day: 21, name: "National Hugging Day", description: "Created by Kevin Zaborney to encourage affection", category: "general" },
  { month: 1, day: 27, name: "International Holocaust Remembrance Day", description: "Honoring victims of the Holocaust", category: "remembrance" },
  { month: 1, day: 30, name: "Fred Korematsu Day", description: "Japanese American civil rights hero who fought internment", category: "aapi" },

  // FEBRUARY - Black History Month
  { month: 2, day: 1, name: "Black History Month Begins", description: "Celebrating Black history, culture, and achievement", category: "black-history" },
  { month: 2, day: 1, name: "Langston Hughes' Birthday", description: "Harlem Renaissance poet and social activist", category: "black-history" },
  { month: 2, day: 1, name: "National Freedom Day", description: "Commemorating Lincoln signing the 13th Amendment", category: "black-history" },
  { month: 2, day: 4, name: "Rosa Parks Day", description: "Mother of the civil rights movement", category: "black-history" },
  { month: 2, day: 7, name: "Birth of Hip-Hop Pioneer Day", description: "Grandmaster Flash's birthday — turntable innovator", category: "hip-hop" },
  { month: 2, day: 14, name: "Valentine's Day", description: "Celebrating love in all its forms", category: "general" },
  { month: 2, day: 14, name: "Frederick Douglass Day", description: "Abolitionist, orator, and statesman", category: "black-history" },
  { month: 2, day: 17, name: "My Bloody Valentine Release", description: "1989 - Loveless-era shoegaze defined", category: "music" },
  { month: 2, day: 21, name: "Malcolm X Assassination Anniversary", description: "1965 - El-Hajj Malik El-Shabazz martyred", category: "black-history" },
  { month: 2, day: 23, name: "W.E.B. Du Bois' Birthday", description: "Scholar, activist, NAACP co-founder", category: "black-history" },
  { month: 2, day: 26, name: "Trayvon Martin Day", description: "Remembering Trayvon Martin — justice for all", category: "black-history" },

  // MARCH - Women's History Month
  { month: 3, day: 1, name: "Women's History Month Begins", description: "Celebrating women's contributions throughout history", category: "women" },
  { month: 3, day: 3, name: "World Hearing Day", description: "Raising awareness about hearing loss", category: "disability" },
  { month: 3, day: 8, name: "International Women's Day", description: "Honoring women's achievements worldwide", category: "women" },
  { month: 3, day: 9, name: "Notorious B.I.G.'s Death Anniversary", description: "1997 - Biggie Smalls, the greatest storyteller", category: "hip-hop" },
  { month: 3, day: 10, name: "Harriet Tubman Day", description: "Moses of her people, conductor of the Underground Railroad", category: "black-history" },
  { month: 3, day: 12, name: "World Day Against Cyber Censorship", description: "Defending digital freedom of expression", category: "awareness" },
  { month: 3, day: 14, name: "Pi Day", description: "Celebrating mathematics and education", category: "education" },
  { month: 3, day: 17, name: "St. Patrick's Day", description: "Irish heritage and culture celebration", category: "cultural" },
  { month: 3, day: 20, name: "International Day of Happiness", description: "UN day promoting well-being for all", category: "awareness" },
  { month: 3, day: 21, name: "International Day for Elimination of Racial Discrimination", description: "UN day against racism", category: "awareness" },
  { month: 3, day: 21, name: "World Down Syndrome Day", description: "Celebrating people with Down syndrome", category: "disability" },
  { month: 3, day: 25, name: "International Day of Remembrance for Slavery Victims", description: "Honoring those who suffered under the slave trade", category: "black-history" },
  { month: 3, day: 26, name: "Epilepsy Awareness Day (Purple Day)", description: "Global effort to increase epilepsy awareness", category: "disability" },
  { month: 3, day: 31, name: "César Chávez Day", description: "Labor leader and civil rights activist", category: "latino" },
  { month: 3, day: 31, name: "Transgender Day of Visibility", description: "Celebrating trans people worldwide", category: "lgbtq" },

  // APRIL - Arab American Heritage Month, Autism Acceptance Month
  { month: 4, day: 1, name: "Arab American Heritage Month Begins", description: "Celebrating Arab American contributions and culture", category: "arab" },
  { month: 4, day: 2, name: "World Autism Awareness Day", description: "Understanding and accepting neurodivergence", category: "disability" },
  { month: 4, day: 4, name: "MLK Assassination Anniversary", description: "1968 - The dream lives on", category: "black-history" },
  { month: 4, day: 7, name: "Billie Holiday's Birthday", description: "Lady Day — jazz legend and civil rights voice", category: "black-history" },
  { month: 4, day: 11, name: "World Parkinson's Day", description: "Raising awareness about Parkinson's disease", category: "disability" },
  { month: 4, day: 13, name: "Songkran (Thai New Year)", description: "Thai water festival and new year celebration", category: "aapi" },
  { month: 4, day: 15, name: "Jackie Robinson Day", description: "Broke baseball's color barrier in 1947", category: "black-history" },
  { month: 4, day: 16, name: "Tupac Shakur's Birthday", description: "2Pac — poet, revolutionary, icon", category: "hip-hop" },
  { month: 4, day: 22, name: "Earth Day", description: "Environmental awareness and action", category: "awareness" },
  { month: 4, day: 29, name: "Day of Remembrance (Japanese American)", description: "Remembering WWII incarceration of Japanese Americans", category: "aapi" },

  // MAY - AAPI Heritage Month, Mental Health Awareness Month
  { month: 5, day: 1, name: "AAPI Heritage Month Begins", description: "Celebrating Asian American & Pacific Islander heritage", category: "aapi" },
  { month: 5, day: 1, name: "Mental Health Awareness Month Begins", description: "Breaking stigma around mental health", category: "mental-health" },
  { month: 5, day: 1, name: "May Day / International Workers' Day", description: "Honoring labor movements worldwide", category: "awareness" },
  { month: 5, day: 3, name: "World Press Freedom Day", description: "Defending journalism and free press", category: "awareness" },
  { month: 5, day: 5, name: "Cinco de Mayo", description: "Celebrating Mexican heritage and pride", category: "latino" },
  { month: 5, day: 5, name: "Missing & Murdered Indigenous Women Awareness Day", description: "MMIW — demanding justice", category: "indigenous" },
  { month: 5, day: 9, name: "Europe Day", description: "Celebrating peace and unity in Europe", category: "cultural" },
  { month: 5, day: 10, name: "World Lupus Day", description: "Raising awareness about lupus", category: "disability" },
  { month: 5, day: 11, name: "Bob Marley's Birthday", description: "Reggae legend and global icon of peace", category: "music" },
  { month: 5, day: 17, name: "International Day Against Homophobia, Transphobia & Biphobia", description: "IDAHOBIT — fighting LGBTQ+ discrimination", category: "lgbtq" },
  { month: 5, day: 19, name: "Malcolm X Day", description: "Honoring Malcolm X's birthday and legacy", category: "black-history" },
  { month: 5, day: 21, name: "World Day for Cultural Diversity", description: "UNESCO day for dialogue and development", category: "cultural" },
  { month: 5, day: 25, name: "African Liberation Day", description: "Celebrating African independence movements", category: "black-history" },
  { month: 5, day: 25, name: "George Floyd Memorial Day", description: "Justice for George Floyd — say his name", category: "black-history" },
  { month: 5, day: 29, name: "Hernandez v. Texas Anniversary", description: "1954 — Latinos recognized as a distinct class for civil rights", category: "latino" },
  { month: 5, day: 31, name: "World No Tobacco Day", description: "Raising awareness about tobacco dangers", category: "awareness" },

  // JUNE - Pride Month, Caribbean American Heritage Month
  { month: 6, day: 1, name: "Pride Month Begins", description: "Celebrating LGBTQ+ community and history", category: "lgbtq" },
  { month: 6, day: 1, name: "Caribbean American Heritage Month Begins", description: "Honoring Caribbean American culture", category: "caribbean" },
  { month: 6, day: 1, name: "Loving Day", description: "1967 — Interracial marriage legalized nationwide", category: "black-history" },
  { month: 6, day: 5, name: "World Environment Day", description: "UN day for environmental action", category: "awareness" },
  { month: 6, day: 12, name: "Pulse Nightclub Remembrance", description: "2016 — Remembering the 49 lives lost", category: "lgbtq" },
  { month: 6, day: 14, name: "Tupac's Death Anniversary", description: "1996 — All Eyez on Me forever", category: "hip-hop" },
  { month: 6, day: 15, name: "Nature Photography Day", description: "Capturing Earth's beauty", category: "awareness" },
  { month: 6, day: 19, name: "Juneteenth", description: "Freedom Day — End of slavery in America", category: "black-history" },
  { month: 6, day: 20, name: "World Refugee Day", description: "Honoring refugees worldwide", category: "awareness" },
  { month: 6, day: 21, name: "National Indigenous Peoples Day (Canada)", description: "Celebrating First Nations, Inuit, and Métis", category: "indigenous" },
  { month: 6, day: 27, name: "Helen Keller Day", description: "Deaf-blind author and activist", category: "disability" },
  { month: 6, day: 28, name: "Stonewall Riots Anniversary", description: "1969 — The birth of Pride", category: "lgbtq" },
  { month: 6, day: 30, name: "Asteroid Day", description: "Raising awareness about asteroid impacts", category: "education" },

  // JULY
  { month: 7, day: 4, name: "Independence Day", description: "American independence celebration", category: "general" },
  { month: 7, day: 4, name: "Frederick Douglass's 'What to the Slave Is the Fourth of July?' (1852)", description: "Historic speech on American hypocrisy", category: "black-history" },
  { month: 7, day: 6, name: "Frida Kahlo's Birthday", description: "Mexican artist and cultural icon", category: "latino" },
  { month: 7, day: 11, name: "World Population Day", description: "Raising awareness about population issues", category: "awareness" },
  { month: 7, day: 14, name: "Bastille Day", description: "French national celebration", category: "cultural" },
  { month: 7, day: 18, name: "Nelson Mandela International Day", description: "Honoring Madiba's legacy of justice", category: "black-history" },
  { month: 7, day: 20, name: "Moon Landing Anniversary", description: "1969 — One giant leap for mankind", category: "education" },
  { month: 7, day: 26, name: "Americans with Disabilities Act Anniversary", description: "1990 — ADA signed into law", category: "disability" },
  { month: 7, day: 28, name: "World Hepatitis Day", description: "Raising awareness about viral hepatitis", category: "awareness" },
  { month: 7, day: 30, name: "International Day of Friendship", description: "UN day celebrating friendship", category: "general" },

  // AUGUST
  { month: 8, day: 1, name: "Emancipation Day (Caribbean)", description: "End of slavery in British colonies (1834)", category: "caribbean" },
  { month: 8, day: 4, name: "Barack Obama's Birthday", description: "44th President — first Black president", category: "black-history" },
  { month: 8, day: 9, name: "International Day of the World's Indigenous Peoples", description: "UN day honoring Indigenous cultures", category: "indigenous" },
  { month: 8, day: 11, name: "Hip-Hop's Birthday", description: "1973 — DJ Kool Herc's party in the Bronx started it all", category: "hip-hop" },
  { month: 8, day: 12, name: "International Youth Day", description: "Celebrating young people worldwide", category: "awareness" },
  { month: 8, day: 19, name: "World Humanitarian Day", description: "Honoring aid workers", category: "awareness" },
  { month: 8, day: 21, name: "Nat Turner's Rebellion Anniversary", description: "1831 — Enslaved people's uprising for freedom", category: "black-history" },
  { month: 8, day: 23, name: "International Day for Remembrance of Slave Trade", description: "UNESCO day honoring victims and abolitionists", category: "black-history" },
  { month: 8, day: 26, name: "Women's Equality Day", description: "19th Amendment ratified (1920)", category: "women" },
  { month: 8, day: 28, name: "'I Have a Dream' Anniversary", description: "1963 — MLK's historic March on Washington speech", category: "black-history" },

  // SEPTEMBER - Hispanic Heritage Month (15th), Deaf Awareness Month
  { month: 9, day: 5, name: "International Day of Charity", description: "Promoting charitable giving", category: "awareness" },
  { month: 9, day: 8, name: "International Literacy Day", description: "Promoting literacy worldwide", category: "education" },
  { month: 9, day: 10, name: "World Suicide Prevention Day", description: "Raising awareness and saving lives", category: "mental-health" },
  { month: 9, day: 13, name: "Tupac's Death Anniversary", description: "1996 — Rest in power, Makaveli", category: "hip-hop" },
  { month: 9, day: 15, name: "Hispanic Heritage Month Begins", description: "Celebrating Hispanic and Latino culture", category: "latino" },
  { month: 9, day: 15, name: "International Day of Democracy", description: "Celebrating democratic values", category: "awareness" },
  { month: 9, day: 17, name: "Constitution Day", description: "1787 — US Constitution signed", category: "general" },
  { month: 9, day: 21, name: "International Day of Peace", description: "UN day for global peace", category: "awareness" },
  { month: 9, day: 23, name: "Bisexual Visibility Day", description: "Celebrating bi+ community", category: "lgbtq" },
  { month: 9, day: 23, name: "International Day of Sign Languages", description: "Celebrating Deaf culture and sign languages", category: "disability" },
  { month: 9, day: 30, name: "International Translation Day", description: "Honoring translators and interpreters", category: "cultural" },

  // OCTOBER - Filipino American History Month, Disability Employment Awareness Month, LGBTQ History Month
  { month: 10, day: 1, name: "Filipino American History Month Begins", description: "Honoring Filipino American contributions", category: "aapi" },
  { month: 10, day: 1, name: "LGBTQ History Month Begins", description: "Celebrating LGBTQ+ history and achievements", category: "lgbtq" },
  { month: 10, day: 1, name: "Disability Employment Awareness Month Begins", description: "Promoting inclusive workplaces", category: "disability" },
  { month: 10, day: 2, name: "International Day of Non-Violence", description: "Gandhi's birthday — peace through nonviolence", category: "awareness" },
  { month: 10, day: 9, name: "Indigenous Peoples' Day", description: "Honoring Native peoples (not Columbus)", category: "indigenous" },
  { month: 10, day: 10, name: "World Mental Health Day", description: "Global mental health awareness", category: "mental-health" },
  { month: 10, day: 11, name: "National Coming Out Day", description: "Celebrating LGBTQ+ visibility", category: "lgbtq" },
  { month: 10, day: 11, name: "International Day of the Girl Child", description: "Empowering girls worldwide", category: "women" },
  { month: 10, day: 15, name: "White Cane Safety Day", description: "Celebrating blind/visually impaired independence", category: "disability" },
  { month: 10, day: 16, name: "Boss's Day", description: "Appreciating leaders and mentors", category: "general" },
  { month: 10, day: 20, name: "Spirit Day (Anti-Bullying)", description: "Standing up against LGBTQ+ bullying", category: "lgbtq" },
  { month: 10, day: 26, name: "Intersex Awareness Day", description: "Raising awareness about intersex people", category: "lgbtq" },
  { month: 10, day: 31, name: "Halloween", description: "Costumes, creativity, and community", category: "general" },

  // NOVEMBER - Native American Heritage Month
  { month: 11, day: 1, name: "Native American Heritage Month Begins", description: "Honoring Indigenous peoples and cultures", category: "indigenous" },
  { month: 11, day: 1, name: "Día de los Muertos", description: "Day of the Dead — honoring ancestors", category: "latino" },
  { month: 11, day: 2, name: "Día de los Muertos (Day 2)", description: "Continuing celebration of ancestors", category: "latino" },
  { month: 11, day: 9, name: "Kristallnacht Remembrance", description: "1938 — Never forget", category: "remembrance" },
  { month: 11, day: 13, name: "World Kindness Day", description: "Spreading kindness globally", category: "general" },
  { month: 11, day: 14, name: "World Diabetes Day", description: "Raising awareness about diabetes", category: "disability" },
  { month: 11, day: 19, name: "International Men's Day", description: "Addressing men's health and issues", category: "awareness" },
  { month: 11, day: 20, name: "Transgender Day of Remembrance", description: "Honoring trans lives lost to violence", category: "lgbtq" },
  { month: 11, day: 25, name: "International Day for Elimination of Violence Against Women", description: "Fighting gender-based violence", category: "women" },
  { month: 11, day: 26, name: "Native American Heritage Day", description: "Day after Thanksgiving — honoring Indigenous peoples", category: "indigenous" },
  { month: 11, day: 29, name: "International Day of Solidarity with Palestinian People", description: "UN day for Palestinian rights", category: "awareness" },

  // DECEMBER
  { month: 12, day: 1, name: "World AIDS Day", description: "Raising awareness and remembering those lost", category: "awareness" },
  { month: 12, day: 2, name: "International Day for Abolition of Slavery", description: "Fighting modern slavery", category: "awareness" },
  { month: 12, day: 3, name: "International Day of Persons with Disabilities", description: "Celebrating disability community", category: "disability" },
  { month: 12, day: 5, name: "Rosa Parks Day (Anniversary)", description: "1955 — The Montgomery Bus Boycott began", category: "black-history" },
  { month: 12, day: 6, name: "National Miners Day", description: "Honoring miners and their contributions", category: "awareness" },
  { month: 12, day: 10, name: "Human Rights Day", description: "UN Declaration of Human Rights (1948)", category: "awareness" },
  { month: 12, day: 18, name: "International Migrants Day", description: "Honoring migrants worldwide", category: "awareness" },
  { month: 12, day: 21, name: "Hanukkah (varies)", description: "Festival of Lights — Jewish celebration", category: "cultural" },
  { month: 12, day: 25, name: "Christmas Day", description: "Christian holiday and cultural celebration", category: "general" },
  { month: 12, day: 26, name: "Kwanzaa Begins", description: "Celebrating African heritage and culture", category: "black-history" },
  { month: 12, day: 26, name: "Boxing Day", description: "Commonwealth celebration and giving back", category: "cultural" },
  { month: 12, day: 31, name: "New Year's Eve", description: "Reflecting on the year and looking ahead", category: "general" },
];

export default function CalendarPage() {
  const navigate = useNavigate();
  const [posting, setPosting] = useState(false);
  const [todayEvents, setTodayEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const { isDark, textClass, textMutedClass, textVeryMutedClass, borderClass, hoverBgClass } = useThemeClasses();

  useEffect(() => {
    // Check if today matches any cultural dates (can be multiple)
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    
    const events = CULTURAL_DATES.filter(
      d => d.month === todayMonth && d.day === todayDay
    );
    setTodayEvents(events);
  }, []);

  // Filter dates by selected category
  const filteredDates = selectedCategory === 'all' 
    ? CULTURAL_DATES 
    : CULTURAL_DATES.filter(d => d.category === selectedCategory);

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

  return (
    <div className="mb-safe" data-testid="calendar-page">
      {/* Header */}
      <div className={cn("sticky top-14 md:top-0 z-30 glass border-b p-4", borderClass)}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className={cn("md:hidden", isDark ? "text-white/60 hover:text-white" : "text-gray-600 hover:text-gray-900")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-500" />
            <h1 className={cn("font-display text-lg tracking-wide uppercase", textClass)}>Culture Calendar</h1>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className={cn("border-b", borderClass)}>
        <Button
          variant="ghost"
          onClick={() => setShowFilters(!showFilters)}
          className={cn("w-full flex items-center justify-between p-4 rounded-none", textClass, hoverBgClass)}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm">
              {selectedCategory === 'all' 
                ? `All Categories (${CULTURAL_DATES.length} dates)` 
                : `${CATEGORIES[selectedCategory]?.label} (${filteredDates.length} dates)`}
            </span>
          </div>
          <span className={cn("text-xs", textVeryMutedClass)}>{showFilters ? 'Hide' : 'Show'}</span>
        </Button>
        
        {showFilters && (
          <div className="p-4 pt-0 flex flex-wrap gap-2">
            {Object.entries(CATEGORIES).map(([key, { label, color }]) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(key)}
                className={cn(
                  "text-xs rounded-full px-3 py-1 h-auto",
                  selectedCategory === key 
                    ? cn(color, "text-white hover:opacity-90")
                    : cn(isDark ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200", textMutedClass)
                )}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Today's Events Highlight */}
      {todayEvents.length > 0 && (
        <div className={cn("p-4 border-b bg-amber-500/10", borderClass)}>
          <p className="text-xs text-amber-500 uppercase tracking-wider mb-3">Today</p>
          <div className="space-y-4">
            {todayEvents.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", CATEGORIES[event.category]?.color || 'bg-amber-500')}>
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className={cn("font-display text-base", textClass)}>{event.name}</h2>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full", CATEGORIES[event.category]?.color || 'bg-amber-500', "text-white")}>
                      {CATEGORIES[event.category]?.label}
                    </span>
                  </div>
                  <p className={cn("text-sm mt-1", isDark ? "text-white/60" : "text-gray-600")}>{event.description}</p>
                </div>
              </div>
            ))}
          </div>
          <Button
            onClick={handlePostTodayEvent}
            disabled={posting}
            className="mt-4 w-full bg-amber-500 text-black hover:bg-amber-400 rounded-none font-display tracking-wider text-sm"
            data-testid="post-today-event-btn"
          >
            {posting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Let Bonita Post About Today
          </Button>
        </div>
      )}

      {/* Calendar List */}
      <div className={cn("divide-y", borderClass)}>
        {Object.entries(
          filteredDates.reduce((acc, event) => {
            const monthName = new Date(2024, event.month - 1).toLocaleString('default', { month: 'long' });
            if (!acc[monthName]) acc[monthName] = [];
            acc[monthName].push(event);
            return acc;
          }, {})
        ).map(([month, events]) => (
          <div key={month} className="p-4">
            <h3 className={cn("font-display text-sm uppercase tracking-wider mb-3 flex items-center justify-between", textVeryMutedClass)}>
              <span>{month}</span>
              <span className="text-xs">{events.length} {events.length === 1 ? 'date' : 'dates'}</span>
            </h3>
            <div className="space-y-3">
              {events.map((event, idx) => (
                <div 
                  key={idx}
                  className={cn("flex items-start gap-3 p-3 rounded-lg", isDark ? "bg-white/5" : "bg-gray-50")}
                >
                  <div className={cn("w-10 h-10 rounded flex items-center justify-center flex-shrink-0", CATEGORIES[event.category]?.color || (isDark ? "bg-white/10" : "bg-gray-200"))}>
                    <span className="text-sm font-bold text-white">{event.day}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className={cn("font-medium", textClass)}>{event.name}</p>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0", CATEGORIES[event.category]?.color || 'bg-gray-500', "text-white")}>
                        {CATEGORIES[event.category]?.label}
                      </span>
                    </div>
                    <p className={cn("text-xs mt-1", textMutedClass)}>{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className={cn("p-6 text-center border-t", borderClass)}>
        <p className={cn("text-sm", textVeryMutedClass)}>
          Bonita automatically posts culturally relevant content on these dates.
        </p>
        <p className={cn("text-xs mt-2", isDark ? "text-white/30" : "text-gray-400")}>
          {CULTURAL_DATES.length} dates across {Object.keys(CATEGORIES).length - 1} categories • Black History • Hip-Hop • LGBTQ+ • Indigenous • AAPI • Latino • and more
        </p>
      </div>
    </div>
  );
}
