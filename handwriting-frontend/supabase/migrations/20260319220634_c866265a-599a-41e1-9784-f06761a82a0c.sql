
-- Create a helper function that checks membership AND that the user is not a viewer
CREATE OR REPLACE FUNCTION public.is_roadmap_editor(_user_id uuid, _roadmap_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.roadmaps r
    JOIN public.workspace_members wm ON wm.workspace_id = r.workspace_id
    WHERE r.id = _roadmap_id
      AND wm.user_id = _user_id
      AND wm.role IN ('admin', 'member')
  )
$$;

-- Create a helper function for comment writes (checks item → roadmap → workspace membership with edit role)
CREATE OR REPLACE FUNCTION public.is_comment_editor(_user_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.roadmap_items ri
    JOIN public.roadmaps r ON r.id = ri.roadmap_id
    JOIN public.workspace_members wm ON wm.workspace_id = r.workspace_id
    WHERE ri.id = _item_id
      AND wm.user_id = _user_id
      AND wm.role IN ('admin', 'member')
  )
$$;

-- roadmap_items: restrict write operations to editors (not viewers)
DROP POLICY IF EXISTS "Members can create items" ON public.roadmap_items;
CREATE POLICY "Members can create items"
  ON public.roadmap_items
  FOR INSERT
  TO authenticated
  WITH CHECK (is_roadmap_editor(auth.uid(), roadmap_id));

DROP POLICY IF EXISTS "Members can update items" ON public.roadmap_items;
CREATE POLICY "Members can update items"
  ON public.roadmap_items
  FOR UPDATE
  TO authenticated
  USING (is_roadmap_editor(auth.uid(), roadmap_id));

DROP POLICY IF EXISTS "Members can delete items" ON public.roadmap_items;
CREATE POLICY "Members can delete items"
  ON public.roadmap_items
  FOR DELETE
  TO authenticated
  USING (is_roadmap_editor(auth.uid(), roadmap_id));

-- comments: restrict write operations to editors (not viewers)
DROP POLICY IF EXISTS "Members can create comments" ON public.comments;
CREATE POLICY "Members can create comments"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (is_comment_editor(auth.uid(), roadmap_item_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_comment_editor(auth.uid(), roadmap_item_id))
  WITH CHECK (auth.uid() = user_id AND is_comment_editor(auth.uid(), roadmap_item_id));
