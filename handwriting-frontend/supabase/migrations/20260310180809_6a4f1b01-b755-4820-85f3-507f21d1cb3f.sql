
-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Workspace invitations table
CREATE TABLE public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can invite"
ON public.workspace_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = invited_by
);

CREATE POLICY "Users can view own invitations"
ON public.workspace_invitations
FOR SELECT
TO authenticated
USING (
  is_workspace_member(auth.uid(), workspace_id)
  OR invited_by = auth.uid()
);

CREATE POLICY "Invited users can accept"
ON public.workspace_invitations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Members can delete invitations"
ON public.workspace_invitations
FOR DELETE
TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id));
