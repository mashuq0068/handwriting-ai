
-- 1. Create security definer function for co-member check
CREATE OR REPLACE FUNCTION public.is_workspace_co_member(_viewer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = _viewer_id AND wm2.user_id = _target_user_id
  )
$$;

-- 2. Replace overly permissive profiles SELECT policy
DROP POLICY "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view co-member profiles" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_workspace_co_member(auth.uid(), user_id));

-- 3. Add DELETE policy on profiles
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Tighten invitation SELECT policy
DROP POLICY "Users can view own invitations" ON workspace_invitations;
CREATE POLICY "Users can view relevant invitations" ON workspace_invitations
  FOR SELECT TO authenticated
  USING (invited_by = auth.uid() OR is_invitation_recipient(auth.uid(), id));
