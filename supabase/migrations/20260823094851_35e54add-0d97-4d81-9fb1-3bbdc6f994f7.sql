
-- helper for match participation
CREATE OR REPLACE FUNCTION public.can_touch_match(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = _id
      AND (public.owns_org(m.supplier_org_id) OR public.owns_org(m.recipient_org_id))
  ) OR public.has_role(auth.uid(),'admin');
$$;

-- PROFILES
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable by self or admin" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ORGANIZATIONS
DROP POLICY IF EXISTS "orgs readable by authenticated" ON public.organizations;
CREATE POLICY "orgs readable by owner or admin" ON public.organizations
FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE VIEW public.organizations_directory
WITH (security_invoker = false) AS
SELECT id, owner_id, name, type, org_category, description, website,
       city, region, country, latitude, longitude,
       verification_status, reliability_score, created_at
FROM public.organizations;

REVOKE ALL ON public.organizations_directory FROM anon;
GRANT SELECT ON public.organizations_directory TO authenticated;
GRANT ALL ON public.organizations_directory TO service_role;

-- DOCUMENTS
DROP POLICY IF EXISTS "documents readable" ON public.documents;
CREATE POLICY "documents readable by involved" ON public.documents
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR (transfer_id IS NOT NULL AND public.can_touch_transfer(transfer_id))
  OR (organization_id IS NOT NULL AND public.owns_org(organization_id))
  OR public.has_role(auth.uid(),'admin')
);

-- MATCHES
DROP POLICY IF EXISTS "matches readable" ON public.matches;
CREATE POLICY "matches readable by involved" ON public.matches
FOR SELECT TO authenticated
USING (public.owns_org(supplier_org_id) OR public.owns_org(recipient_org_id) OR public.has_role(auth.uid(),'admin'));

-- MESSAGES
DROP POLICY IF EXISTS "messages readable" ON public.messages;
CREATE POLICY "messages readable by participants" ON public.messages
FOR SELECT TO authenticated
USING (
  sender_id = auth.uid()
  OR (transfer_id IS NOT NULL AND public.can_touch_transfer(transfer_id))
  OR (match_id IS NOT NULL AND public.can_touch_match(match_id))
);

-- TRANSFERS
DROP POLICY IF EXISTS "transfers readable" ON public.transfers;
CREATE POLICY "transfers readable by involved" ON public.transfers
FOR SELECT TO authenticated
USING (
  public.owns_org(supplier_org_id)
  OR public.owns_org(recipient_org_id)
  OR (logistics_org_id IS NOT NULL AND public.owns_org(logistics_org_id))
  OR (logistics_org_id IS NULL AND status IN ('proposed','accepted','scheduled','pickup_ready'))
  OR public.has_role(auth.uid(),'admin')
);

-- TRANSFER EVENTS
DROP POLICY IF EXISTS "events readable" ON public.transfer_events;
CREATE POLICY "events readable by involved" ON public.transfer_events
FOR SELECT TO authenticated
USING (public.can_touch_transfer(transfer_id) OR public.has_role(auth.uid(),'admin'));

-- RESOURCES / NEEDS / LOGISTICS PROFILES
DROP POLICY IF EXISTS "resources readable" ON public.resources;
CREATE POLICY "resources discoverable" ON public.resources
FOR SELECT TO authenticated
USING (
  public.owns_org(organization_id)
  OR public.has_role(auth.uid(),'admin')
  OR status IN ('available','reserved')
);

DROP POLICY IF EXISTS "needs readable" ON public.needs;
CREATE POLICY "needs discoverable" ON public.needs
FOR SELECT TO authenticated
USING (
  public.owns_org(organization_id)
  OR public.has_role(auth.uid(),'admin')
  OR status IN ('active','partially_fulfilled')
);

DROP POLICY IF EXISTS "logistics readable" ON public.logistics_profiles;
CREATE POLICY "logistics discoverable" ON public.logistics_profiles
FOR SELECT TO authenticated
USING (
  public.owns_org(organization_id)
  OR public.has_role(auth.uid(),'admin')
  OR available = true
);

-- Lock down SECURITY DEFINER helper execution
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.owns_org(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.org_is_verified(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.can_touch_transfer(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.can_touch_match(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.find_org_duplicates(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_org_duplicates(uuid) TO service_role;
