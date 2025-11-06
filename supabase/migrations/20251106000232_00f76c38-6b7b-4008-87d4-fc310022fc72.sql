-- Create reports table for content moderation
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_item_type text NOT NULL,
  reported_item_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create enum-like constraint for item types
ALTER TABLE public.reports
ADD CONSTRAINT valid_reported_item_type 
CHECK (reported_item_type IN ('video', 'profile', 'comment', 'live_stream'));

-- Create enum-like constraint for status
ALTER TABLE public.reports
ADD CONSTRAINT valid_status 
CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed'));

-- Create enum-like constraint for reasons
ALTER TABLE public.reports
ADD CONSTRAINT valid_reason 
CHECK (reason IN (
  'spam',
  'harassment',
  'hate_speech',
  'violence',
  'nudity',
  'misinformation',
  'copyright',
  'self_harm',
  'illegal_content',
  'other'
));

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can report content
CREATE POLICY "Users can create reports" ON public.reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON public.reports
FOR SELECT
USING (auth.uid() = reporter_id OR public.is_admin(auth.uid()));

-- Only admins can update reports
CREATE POLICY "Admins can update reports" ON public.reports
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Prevent deletion of reports (audit trail)
CREATE POLICY "Prevent report deletion" ON public.reports
FOR DELETE
USING (false);

-- Create indexes for better performance
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX idx_reports_item ON public.reports(reported_item_type, reported_item_id);
CREATE INDEX idx_reports_created ON public.reports(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();