
-- Fix overly permissive UPDATE policy on workspace_invitations
DROP POLICY "Invited users can accept" ON public.workspace_invitations;

-- Create a function to check invitation ownership by email
CREATE OR REPLACE FUNCTION public.is_invitation_recipient(_user_id uuid, _invitation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_invitations wi
    JOIN auth.users u ON u.email = wi.email
    WHERE wi.id = _invitation_id AND u.id = _user_id
  )
$$;

CREATE POLICY "Invited users can accept"
ON public.workspace_invitations
FOR UPDATE
TO authenticated
USING (is_invitation_recipient(auth.uid(), id))
WITH CHECK (is_invitation_recipient(auth.uid(), id));
