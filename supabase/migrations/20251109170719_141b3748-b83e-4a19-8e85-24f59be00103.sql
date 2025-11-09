-- Fix admin_actions INSERT policy to allow authenticated admins to log their own actions
-- This replaces the service_role-only policy that was preventing edge functions from logging

DROP POLICY IF EXISTS "Service role can insert admin actions" ON public.admin_actions;

CREATE POLICY "Admins can insert their own actions" 
ON public.admin_actions
FOR INSERT 
WITH CHECK (auth.uid() = admin_id AND public.is_admin(auth.uid()));