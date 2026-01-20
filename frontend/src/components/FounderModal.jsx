import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ExternalLink, Sparkles, Code, Heart } from 'lucide-react';

export const FounderModal = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border border-white/20 sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="font-display text-sm tracking-widest uppercase text-center">
            The Architect
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6 space-y-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-white/20">
              <AvatarImage src="https://i.pravatar.cc/150?u=cjnurse" />
              <AvatarFallback className="bg-white/10 text-2xl">CJ</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
              <Sparkles className="h-4 w-4 text-black" />
            </div>
          </div>
          
          {/* Name & Title */}
          <div className="text-center">
            <h2 className="text-xl font-display tracking-wide">CJ Nurse</h2>
            <p className="text-white/50 text-sm">Founder & Chief Architect</p>
          </div>
          
          {/* Bio */}
          <p className="text-white/70 text-sm text-center leading-relaxed px-4">
            Building spaces where culture lives and breathes. BLVX is just the beginning.
          </p>
          
          {/* Stats */}
          <div className="flex items-center gap-8 text-center">
            <div>
              <p className="text-white font-display text-lg">BLVX</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">This Platform</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-white font-display text-lg">Creator</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Of Culture</p>
            </div>
          </div>
          
          {/* The Lab CTA */}
          <div className="w-full space-y-3 pt-4 border-t border-white/10">
            <p className="text-center text-white/50 text-xs uppercase tracking-wider">
              The Blueprint
            </p>
            <a 
              href="https://www.contentcreators.life" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Button 
                className="w-full bg-white text-black hover:bg-white/90 font-display tracking-wider group"
                data-testid="visit-lab-btn"
              >
                <Code className="h-4 w-4 mr-2" />
                Visit The Lab
                <ExternalLink className="h-3 w-3 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Button>
            </a>
            <p className="text-center text-white/30 text-[10px]">
              The blueprint for the next generation of storytellers.
            </p>
          </div>
          
          {/* Easter Egg */}
          <div className="flex items-center gap-2 text-white/20 text-[10px]">
            <Heart className="h-3 w-3" />
            <span>Built with love for the culture</span>
            <Heart className="h-3 w-3" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
