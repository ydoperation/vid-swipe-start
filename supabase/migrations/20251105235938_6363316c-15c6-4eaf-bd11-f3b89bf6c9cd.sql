-- Create admin_actions table for audit logging
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX idx_admin_actions_created_at ON public.admin_actions(created_at DESC);
CREATE INDEX idx_admin_actions_target ON public.admin_actions(target_type, target_id);

-- Only admins can view audit logs
CREATE POLICY "Admins can view all admin actions" ON public.admin_actions
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only edge functions (service role) can insert audit logs
CREATE POLICY "Service role can insert admin actions" ON public.admin_actions
FOR INSERT
WITH CHECK (true);