-- Add explicit immutability policies for financial tables
-- This prevents any modification or deletion of transaction records

-- Payment transactions immutability
CREATE POLICY "Prevent payment transaction modifications" ON public.payment_transactions
FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Prevent payment transaction deletion" ON public.payment_transactions
FOR DELETE TO authenticated USING (false);

-- Gift transactions immutability
CREATE POLICY "Prevent gift transaction modifications" ON public.gift_transactions
FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Prevent gift transaction deletion" ON public.gift_transactions
FOR DELETE TO authenticated USING (false);

-- Refunds immutability
CREATE POLICY "Prevent refund modifications" ON public.refunds
FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Prevent refund deletion" ON public.refunds
FOR DELETE TO authenticated USING (false);

-- Add security definer function for stream ownership validation
CREATE OR REPLACE FUNCTION public.owns_stream(_stream_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_streams
    WHERE id = _stream_id AND user_id = _user_id
  );
$$;

-- Update stream_credentials RLS policy to use security definer function
DROP POLICY IF EXISTS "Stream owners can manage their credentials" ON public.stream_credentials;
DROP POLICY IF EXISTS "Stream owners can view their credentials" ON public.stream_credentials;

CREATE POLICY "Stream owners access credentials" ON public.stream_credentials
FOR ALL TO authenticated
USING (public.owns_stream(stream_id, auth.uid()))
WITH CHECK (public.owns_stream(stream_id, auth.uid()));