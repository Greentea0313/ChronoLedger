-- R80: align the R64 classification icon write policy with the other admin tables.
-- Admin = JWT app_metadata.role = 'admin' OR public.users.role = 'admin'
-- (users.role cannot be self-changed: prevent_users_role_self_change). Re-runnable.

DROP POLICY IF EXISTS "Admin manage classification icons" ON public.game_classification_icons;
CREATE POLICY "Admin manage classification icons" ON public.game_classification_icons FOR ALL TO authenticated
    USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));
