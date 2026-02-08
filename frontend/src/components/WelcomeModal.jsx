import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Home, UtensilsCrossed, Lock, ChevronRight, ChevronLeft, Radio, Sparkles, HelpCircle } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const slides = [
  {
    icon: Home,
    title: "The Block",
    subtitle: "Public Square",
    description: "Stand on business. Share your thoughts with the culture. This is where voices are heard.",
    color: "text-white",
    bg: "bg-gradient-to-br from-zinc-900 to-black"
  },
  {
    icon: UtensilsCrossed,
    title: "The Plates",
    subtitle: "We don't do Likes",
    description: "We serve Plates. When you appreciate something, you feed the culture. Show love by serving a plate.",
    color: "text-amber-500",
    bg: "bg-gradient-to-br from-amber-900/30 to-black"
  },
  {
    icon: Lock,
    title: "The Vouch",
    subtitle: "The Cookout is Private",
    description: "You need a Vouch to get into The Cookout. Earn plates on The Block, build your rep, and get invited.",
    color: "text-amber-400",
    bg: "bg-gradient-to-br from-zinc-800 to-black"
  },
  {
    icon: Radio,
    title: "The Stoop",
    subtitle: "Live Audio",
    description: "Jump into live conversations. Start a Stoop, request the mic, and chop it up with the community. If you weren't there, you missed it.",
    color: "text-purple-400",
    bg: "bg-gradient-to-br from-purple-900/30 to-black"
  },
  {
    icon: Sparkles,
    title: "Bonita",
    subtitle: "Your AI Companion",
    description: "Bonita is here to help. Get vibe checks, rewrite your tone, or just chat. She's culturally fluent and always got your back.",
    color: "text-pink-400",
    bg: "bg-gradient-to-br from-pink-900/30 to-black"
  },
  {
    icon: HelpCircle,
    title: "Learn More",
    subtitle: "We Got You",
    description: "Questions? Check Settings → Learn BLVX for the full breakdown. Welcome to the culture.",
    color: "text-cyan-400",
    bg: "bg-gradient-to-br from-cyan-900/30 to-black"
  }
];

export const WelcomeModal = ({ open, onOpenChange }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { refreshUser } = useAuth();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleFinish = async () => {
    try {
      await axios.post(`${API}/users/welcome-seen`, {}, { withCredentials: true });
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Failed to mark welcome as seen:', error);
    }
    onOpenChange(false);
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${slide.bg} border border-white/10 sm:max-w-[420px] p-0 overflow-hidden`}>
        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl ${slide.color === 'text-amber-500' ? 'bg-amber-500/20' : 'bg-white/10'} flex items-center justify-center`}>
            <Icon className={`h-10 w-10 ${slide.color}`} />
          </div>

          {/* Logo */}
          <img src="/assets/logo-white.png" alt="BLVX" className="h-6 mx-auto mb-4 opacity-60" />

          {/* Title */}
          <h2 className={`font-display text-2xl tracking-wider uppercase mb-2 ${slide.color}`}>
            {slide.title}
          </h2>
          
          {/* Subtitle */}
          <p className="text-white/60 text-sm font-display tracking-wider uppercase mb-4">
            {slide.subtitle}
          </p>

          {/* Description */}
          <p className="text-white/80 text-base leading-relaxed mb-8">
            {slide.description}
          </p>

          {/* Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentSlide ? 'bg-amber-500 w-6' : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentSlide > 0 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-none"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            
            {currentSlide < slides.length - 1 ? (
              <Button
                onClick={handleNext}
                className="flex-1 bg-white text-black hover:bg-white/90 rounded-none font-display tracking-wider"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                className="flex-1 bg-amber-500 text-black hover:bg-amber-400 rounded-none font-display tracking-wider"
              >
                Let's Go
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
