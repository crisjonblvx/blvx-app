import { useState } from 'react';
import { Flag, AlertTriangle, Loader2 } from 'lucide-react';
import { useThemeClasses } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam', description: 'Unwanted promotional content or repetitive posts' },
  { id: 'harassment', label: 'Harassment', description: 'Targeting, bullying, or threatening behavior' },
  { id: 'hate_speech', label: 'Hate Speech', description: 'Content promoting hatred against protected groups' },
  { id: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { id: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else' },
  { id: 'other', label: 'Other', description: 'Something else not listed above' },
];

export const ReportModal = ({ 
  open, 
  onOpenChange, 
  targetType, // "post" or "user"
  targetId, 
  targetName // For display purposes
}) => {
  const { isDark, textClass, textMutedClass, borderClass } = useThemeClasses();
  const [selectedReason, setSelectedReason] = useState(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error('Please select a reason for your report');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = targetType === 'post' 
        ? `${API}/posts/${targetId}/report`
        : `${API}/users/${targetId}/report`;

      await axios.post(endpoint, {
        target_type: targetType,
        target_id: targetId,
        reason: selectedReason,
        details: details.trim() || null
      }, { withCredentials: true });

      toast.success('Report submitted. Thank you for helping keep the community safe.');
      onOpenChange(false);
      setSelectedReason(null);
      setDetails('');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to submit report';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedReason(null);
    setDetails('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "sm:max-w-[450px] p-0 overflow-hidden",
        isDark ? "bg-black border-white/10" : "bg-white border-gray-200"
      )}>
        <DialogHeader className={cn("p-4 border-b", borderClass)}>
          <DialogTitle className={cn("font-display text-sm tracking-widest uppercase flex items-center gap-2", textClass)}>
            <Flag className="h-4 w-4" />
            Report {targetType === 'post' ? 'Post' : 'User'}
          </DialogTitle>
          <DialogDescription className={textMutedClass}>
            {targetName && `Reporting: ${targetName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Warning */}
          <div className={cn(
            "flex items-start gap-3 p-3 rounded-lg text-sm",
            isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700"
          )}>
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>Reports are reviewed by our moderation team. False reports may result in action against your account.</p>
          </div>

          {/* Reason Selection */}
          <div>
            <p className={cn("text-xs uppercase tracking-wider mb-3", textMutedClass)}>
              Why are you reporting this?
            </p>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={cn(
                    "w-full p-3 text-left border transition-all",
                    selectedReason === reason.id
                      ? isDark 
                        ? "border-white bg-white/10" 
                        : "border-black bg-gray-100"
                      : cn(borderClass, "hover:border-white/30")
                  )}
                >
                  <p className={cn("font-medium text-sm", textClass)}>{reason.label}</p>
                  <p className={cn("text-xs mt-0.5", textMutedClass)}>{reason.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          {selectedReason && (
            <div>
              <p className={cn("text-xs uppercase tracking-wider mb-2", textMutedClass)}>
                Additional details (optional)
              </p>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide any additional context that might help our review..."
                className={cn(
                  "min-h-[80px] resize-none bg-transparent text-sm",
                  isDark ? "border-white/20 focus:border-white" : "border-gray-300 focus:border-gray-900"
                )}
                maxLength={500}
              />
              <p className={cn("text-[10px] mt-1 text-right", textMutedClass)}>
                {details.length}/500
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedReason || submitting}
              className={cn(
                "flex-1",
                isDark ? "bg-red-500 hover:bg-red-600 text-white" : "bg-red-600 hover:bg-red-700 text-white"
              )}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
