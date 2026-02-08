import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Globe, UtensilsCrossed, Radio, MessageCircle, Ticket, Sparkles, DoorOpen, Calendar } from 'lucide-react';
import { useThemeClasses } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FAQ_SECTIONS = [
  {
    id: 'feeds',
    icon: Globe,
    title: 'The Block & The Cookout',
    items: [
      {
        question: 'What is The Block?',
        answer: 'The Block is the main public feed where everyone can see and engage with posts. Think of it like the neighborhood — open, visible, and where the community comes together. Anyone can post here and see what others are saying.'
      },
      {
        question: 'What is The Cookout?',
        answer: 'The Cookout is a more intimate space, only accessible to people who have been "vouched for." It\'s for content you want to share with your inner circle — people who\'ve earned trust in the community. Posts here are only visible to mutuals (people who follow each other).'
      },
      {
        question: 'How do I get access to The Cookout?',
        answer: 'You need to be vouched for by someone already in the community. They\'ll give you a "Plate" — an invite code that grants you access. Once vouched, you can see The Cookout and also vouch for others you trust.'
      }
    ]
  },
  {
    id: 'vouch',
    icon: Ticket,
    title: 'The Vouch System (Plates)',
    items: [
      {
        question: 'What are Plates?',
        answer: 'Plates are invite codes you can give to people you want to bring into BLVX. Each plate is a personal vouch — you\'re putting your reputation on the line for that person. Choose wisely.'
      },
      {
        question: 'How do I get more Plates?',
        answer: 'You start with 3 Plates. You can earn more by being an active, positive member of the community. Quality engagement matters more than quantity.'
      },
      {
        question: 'What happens if someone I vouched for causes problems?',
        answer: 'Your reputation is tied to who you vouch for. If someone you brought in consistently causes issues, it reflects on your judgment. The community remembers.'
      }
    ]
  },
  {
    id: 'stoop',
    icon: Radio,
    title: 'The Stoop (Live Audio)',
    items: [
      {
        question: 'What is The Stoop?',
        answer: 'The Stoop is where live audio conversations happen. Like sitting on a stoop with friends, you can start or join live discussions. It\'s real-time, unrecorded, and ephemeral — if you weren\'t there, you missed it.'
      },
      {
        question: 'How do I start a Stoop?',
        answer: 'Tap "Start" on The Stoop page and give your conversation a topic. You\'ll automatically be the host with mic access. Others can join as listeners and request to speak.'
      },
      {
        question: 'What does "Got Next" mean?',
        answer: 'When you\'re listening and want to speak, you can request the mic with an expression like "Got Next" or "Mic Me." The host sees your request and can approve or deny you speaker access.'
      },
      {
        question: 'Are Stoops recorded?',
        answer: 'No. Stoops are intentionally ephemeral. When the conversation ends, it\'s gone. This keeps things authentic — people speak more freely when they know it\'s not being saved.'
      }
    ]
  },
  {
    id: 'gc',
    icon: MessageCircle,
    title: 'The GC (Group Chat)',
    items: [
      {
        question: 'What is The GC?',
        answer: 'The GC is where group conversations happen. Create a chat with people you want to connect with. It\'s private, real-time messaging with the people who matter.'
      },
      {
        question: 'Can Bonita join my GC?',
        answer: 'Yes! You can ask Bonita questions directly in any GC by using the sparkle button. She\'ll respond in the chat so everyone can see.'
      }
    ]
  },
  {
    id: 'bonita',
    icon: Sparkles,
    title: 'Bonita (AI Assistant)',
    items: [
      {
        question: 'Who is Bonita?',
        answer: 'Bonita is BLVX\'s AI companion. She\'s culturally fluent, helpful, and here to assist with everything from writing to vibe checks. Think of her as the auntie who always knows what\'s really going on.'
      },
      {
        question: 'What can Bonita do?',
        answer: 'Bonita can chat with you, analyze the vibe of content (Vibe Check), and help you rewrite things in different tones (Tone Lab). She\'s also integrated into GCs and can help with your "Leave a Message" feature.'
      },
      {
        question: 'What\'s a Spark?',
        answer: 'Sparks are conversation starters that Bonita posts to The Block. They\'re designed to get discussions going — funny observations, cultural commentary, or thought-provoking questions.'
      }
    ]
  },
  {
    id: 'message',
    icon: DoorOpen,
    title: 'Leave a Message',
    items: [
      {
        question: 'What is "Leave a Message"?',
        answer: 'It\'s your AI-powered answering machine. When someone visits your profile and wants to chat but you\'re not around, they can have a conversation with an AI that represents you. You configure its personality and what topics it should discuss.'
      },
      {
        question: 'How do I set it up?',
        answer: 'Go to Settings → Leave a Message. You can customize your greeting, personality (warm, professional, playful, or chill), and topics you want to encourage or avoid.'
      },
      {
        question: 'Do I see the conversations?',
        answer: 'Yes! You can review all the conversations people have had with your AI. You can also allow visitors to request sharing notable conversations to your Block (with your approval).'
      }
    ]
  },
  {
    id: 'calendar',
    icon: Calendar,
    title: 'Cultural Calendar',
    items: [
      {
        question: 'What is the Cultural Calendar?',
        answer: 'It\'s a comprehensive calendar of culturally significant dates — Black History Month, AAPI Heritage Month, Juneteenth, hip-hop milestones, and hundreds more. It helps the community stay connected to what matters.'
      },
      {
        question: 'Where can I find it?',
        answer: 'The Calendar is accessible from the sidebar navigation. You can filter by category (Black History, Hip-Hop, LGBTQ+, etc.) to see dates that matter to you.'
      }
    ]
  }
];

export default function LearnPage() {
  const navigate = useNavigate();
  const { isDark, textClass, textMutedClass, textVeryMutedClass, borderClass } = useThemeClasses();
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (sectionId, index) => {
    const key = `${sectionId}-${index}`;
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="mb-safe" data-testid="learn-page">
      {/* Header */}
      <div className={cn("sticky top-14 md:top-0 z-30 glass border-b p-4", borderClass)}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className={cn(isDark ? "text-white/60 hover:text-white" : "text-gray-600 hover:text-gray-900", "md:hidden")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <HelpCircle className={cn("h-5 w-5", textClass)} />
            <h1 className={cn("font-display text-lg tracking-wide uppercase", textClass)}>Learn BLVX</h1>
          </div>
        </div>
      </div>

      {/* Intro */}
      <div className={cn("p-6 border-b", borderClass)}>
        <h2 className={cn("text-xl font-semibold mb-2", textClass)}>Welcome to the culture.</h2>
        <p className={cn("text-sm", textMutedClass)}>
          BLVX is different from other social platforms. We prioritize community over algorithms, 
          context over virality, and real connection over engagement metrics. Here's how it all works.
        </p>
      </div>

      {/* FAQ Sections */}
      <div className="divide-y divide-white/10">
        {FAQ_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} className="py-4">
              {/* Section Header */}
              <div className="px-4 flex items-center gap-3 mb-3">
                <div className={cn("p-2 rounded-lg", isDark ? "bg-white/5" : "bg-gray-100")}>
                  <Icon className={cn("h-5 w-5", textClass)} />
                </div>
                <h3 className={cn("font-display text-sm tracking-wider uppercase", textClass)}>
                  {section.title}
                </h3>
              </div>

              {/* Questions */}
              <div className="space-y-1">
                {section.items.map((item, index) => {
                  const key = `${section.id}-${index}`;
                  const isOpen = openItems[key];
                  
                  return (
                    <div key={index}>
                      <button
                        onClick={() => toggleItem(section.id, index)}
                        className={cn(
                          "w-full px-4 py-3 flex items-center justify-between text-left transition-colors",
                          isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                        )}
                      >
                        <span className={cn("text-sm font-medium pr-4", textClass)}>
                          {item.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className={cn("h-4 w-4 flex-shrink-0", textMutedClass)} />
                        ) : (
                          <ChevronDown className={cn("h-4 w-4 flex-shrink-0", textMutedClass)} />
                        )}
                      </button>
                      
                      {isOpen && (
                        <div className={cn("px-4 pb-4 text-sm leading-relaxed", textMutedClass)}>
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={cn("p-6 text-center", isDark ? "bg-white/5" : "bg-gray-50")}>
        <p className={cn("text-sm mb-3", textMutedClass)}>
          Still have questions?
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/bonita')}
          className={cn("rounded-none", isDark ? "border-white/30" : "border-gray-300")}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Ask Bonita
        </Button>
      </div>
    </div>
  );
}
