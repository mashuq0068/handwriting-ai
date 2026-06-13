
-- Tighten invitation DELETE: only the inviter can delete invitations
DROP POLICY "Members can delete invitations" ON workspace_invitations;
CREATE POLICY "Inviters can delete invitations" ON workspace_invitations
  FOR DELETE TO authenticated
  USING (invited_by = auth.uid());
