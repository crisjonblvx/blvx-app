import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ExternalLink, Sparkles, Code, Heart, Trophy, Users } from 'lucide-react';

// CJ Nurse profile pic
const CJ_AVATAR = "https://customer-assets.emergentagent.com/job_high-context/artifacts/wv7mkbdo_309b6b7d-5dd6-4073-9776-a5671d58e0d6.png";

export const FounderModal = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border border-white/20 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-sm tracking-widest uppercase text-center">
            The Architect
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6 space-y-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-28 w-28 border-2 border-amber-500/50">
              <AvatarImage src={CJ_AVATAR} className="object-cover" />
              <AvatarFallback className="bg-white/10 text-2xl">CJ</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1.5">
              <Sparkles className="h-4 w-4 text-black" />
            </div>
          </div>
          
          {/* Name & Title */}
          <div className="text-center">
            <h2 className="text-2xl font-display tracking-wide">Christopher "CJ" Nurse</h2>
            <p className="text-amber-400/80 text-sm font-medium">The Architect of BLVX</p>
            <p className="text-white/50 text-xs mt-1">Professor at VUU</p>
          </div>
          
          {/* Bio */}
          <div className="text-white/70 text-sm text-center leading-relaxed px-4 space-y-3">
            <p>
              Senior Executive Video Producer for <span className="text-amber-400">The Table with Anthony ONeal (TTAO)</span>.
            </p>
            <p className="text-white/60">
              The original producer who stood with Anthony ONeal from the very beginning—building the foundation from a team of two to a movement of <span className="text-white font-bold">1 Million+ subscribers</span>.
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-6 text-center py-2">
            <div className="flex flex-col items-center">
              <Trophy className="h-5 w-5 text-amber-400 mb-1" />
              <p className="text-white font-display text-lg">1M+</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Subscribers Built</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col items-center">
              <Users className="h-5 w-5 text-amber-400 mb-1" />
              <p className="text-white font-display text-lg">Day One</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">OG Builder</p>
            </div>
          </div>
          
          {/* Tagline */}
          <div className="text-center border-t border-b border-white/10 py-4 w-full">
            <p className="text-white/80 text-sm italic">
              "Built for the culture. Owned by the people."
            </p>
          </div>
          
          {/* The Lab CTA */}
          <div className="w-full space-y-3">
            <a 
              href="https://www.contentcreators.life" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Button 
                className="w-full bg-amber-500 text-black hover:bg-amber-400 font-display tracking-wider group"
                data-testid="visit-lab-btn"
              >
                <Code className="h-4 w-4 mr-2" />
                Visit The Lab
                <ExternalLink className="h-3 w-3 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Button>
            </a>
            <p className="text-center text-white/30 text-[10px]">
              contentcreators.life - The blueprint for the next generation of storytellers.
            </p>
          </div>
          
          {/* Easter Egg */}
          <div className="flex items-center gap-2 text-white/20 text-[10px]">
            <Heart className="h-3 w-3 fill-current" />
            <span>The 1M Flex</span>
            <Heart className="h-3 w-3 fill-current" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
