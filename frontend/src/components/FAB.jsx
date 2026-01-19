import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComposerModal } from '@/components/ComposerModal';

export const FAB = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fab-container">
        <Button
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-sm bg-white text-black hover:bg-white/90 shadow-lg btn-hover-effect"
          data-testid="fab-new-post"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
      
      <ComposerModal open={open} onOpenChange={setOpen} />
    </>
  );
};
