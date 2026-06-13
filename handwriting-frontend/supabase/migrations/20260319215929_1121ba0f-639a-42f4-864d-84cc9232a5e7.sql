
-- Drop the existing UPDATE policy that lacks WITH CHECK
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;

-- Recreate with proper WITH CHECK to prevent cross-workspace injection
CREATE POLICY "Users can update own comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_comment_member(auth.uid(), roadmap_item_id));
