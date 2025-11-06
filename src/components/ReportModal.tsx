import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { reportSchema } from '@/lib/validation';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'video' | 'profile' | 'comment' | 'live_stream';
  itemId: string;
  itemTitle?: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading', description: 'Fake engagement, scams, or misleading content' },
  { value: 'harassment', label: 'Harassment or bullying', description: 'Targeted abuse or bullying behavior' },
  { value: 'hate_speech', label: 'Hate speech', description: 'Content that promotes hatred or violence' },
  { value: 'violence', label: 'Violence or dangerous acts', description: 'Graphic violence or dangerous activities' },
  { value: 'nudity', label: 'Nudity or sexual content', description: 'Inappropriate sexual or nude content' },
  { value: 'misinformation', label: 'False information', description: 'Deliberately false or misleading claims' },
  { value: 'copyright', label: 'Copyright violation', description: 'Unauthorized use of copyrighted material' },
  { value: 'self_harm', label: 'Self-harm or suicide', description: 'Content promoting self-harm or suicide' },
  { value: 'illegal_content', label: 'Illegal activities', description: 'Content depicting illegal activities' },
  { value: 'other', label: 'Other', description: 'Something else not listed above' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemTitle,
}) => {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate with zod
      const validation = reportSchema.safeParse({
        reported_item_type: itemType,
        reported_item_id: itemId,
        reason,
        description: description || undefined,
      });

      if (!validation.success) {
        const errors = validation.error.issues.map(i => i.message).join(', ');
        toast.error(errors);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to report content');
        return;
      }

      // Submit report
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_item_type: itemType,
        reported_item_id: itemId,
        reason,
        description: description || null,
      });

      if (error) throw error;

      toast.success('Report submitted successfully. Our team will review it shortly.');
      onClose();
      setReason('');
      setDescription('');
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error(error.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getItemTypeLabel = () => {
    switch (itemType) {
      case 'video': return 'video';
      case 'profile': return 'profile';
      case 'comment': return 'comment';
      case 'live_stream': return 'live stream';
      default: return 'content';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Report {getItemTypeLabel()}
          </DialogTitle>
          <DialogDescription>
            {itemTitle && <p className="font-medium text-foreground mb-2">"{itemTitle}"</p>}
            Help us understand what's wrong with this {getItemTypeLabel()}. Your report is anonymous.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Why are you reporting this?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              <div className="space-y-3">
                {REPORT_REASONS.map((reportReason) => (
                  <div key={reportReason.value} className="flex items-start space-x-3 space-y-0">
                    <RadioGroupItem value={reportReason.value} id={reportReason.value} />
                    <Label
                      htmlFor={reportReason.value}
                      className="font-normal cursor-pointer flex-1"
                    >
                      <div>
                        <div className="font-semibold">{reportReason.label}</div>
                        <div className="text-sm text-muted-foreground">{reportReason.description}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional details (optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide any additional context that might help us understand the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
