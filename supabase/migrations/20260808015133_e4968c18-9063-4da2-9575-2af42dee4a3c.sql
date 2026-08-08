-- 1. Organization verification fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_category public.org_category NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS issuing_authority text,
  ADD COLUMN IF NOT EXISTS registration_country text,
  ADD COLUMN IF NOT EXISTS registration_date date,
  ADD COLUMN IF NOT EXISTS doc_kind public.verification_doc_kind,
  ADD COLUMN IF NOT EXISTS doc_path text,
  ADD COLUMN IF NOT EXISTS doc_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rep_full_name text,
  ADD COLUMN IF NOT EXISTS rep_position text,
  ADD COLUMN IF NOT EXISTS rep_relationship text,
  ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_privacy_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_verification_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_comms_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_risk_level text,
  ADD COLUMN IF NOT EXISTS ai_risk_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_risk_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.organizations
  ALTER COLUMN verification_status SET DEFAULT 'not_verified'::public.verification_status;

-- 2. Verification history (append-only)
CREATE TABLE IF NOT EXISTS public.org_verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event text NOT NULL,
  status public.verification_status,
  note text,
  actor_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_verif_events_org ON public.org_verification_events(organization_id, created_at DESC);

GRANT SELECT, INSERT ON public.org_verification_events TO authenticated;
GRANT ALL ON public.org_verification_events TO service_role;
ALTER TABLE public.org_verification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own or admin verification events"
  ON public.org_verification_events FOR SELECT TO authenticated
  USING (public.owns_org(organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "append verification events"
  ON public.org_verification_events FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (public.owns_org(organization_id) OR public.has_role(auth.uid(),'admin'))
  );

-- 3. Private internal admin notes
CREATE TABLE IF NOT EXISTS public.org_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_admin_notes_org ON public.org_admin_notes(organization_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_admin_notes TO authenticated;
GRANT ALL ON public.org_admin_notes TO service_role;
ALTER TABLE public.org_admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read internal notes"
  ON public.org_admin_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins write internal notes"
  ON public.org_admin_notes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND admin_id = auth.uid());
CREATE POLICY "admins delete internal notes"
  ON public.org_admin_notes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 4. Verification gate helper
CREATE OR REPLACE FUNCTION public.org_is_verified(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id AND verification_status = 'verified'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.org_is_verified(uuid) FROM anon, authenticated;

-- 5. Duplicate detection helper (admin / owner use)
CREATE OR REPLACE FUNCTION public.find_org_duplicates(_org_id uuid)
RETURNS TABLE (id uuid, name text, reason text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT * FROM public.organizations WHERE id = _org_id)
  SELECT o.id, o.name,
    CASE
      WHEN me.registration_number IS NOT NULL
        AND lower(trim(o.registration_number)) = lower(trim(me.registration_number)) THEN 'registration number'
      WHEN lower(trim(o.name)) = lower(trim(me.name)) THEN 'organization name'
      WHEN me.website IS NOT NULL AND lower(trim(o.website)) = lower(trim(me.website)) THEN 'website'
      WHEN me.contact_email IS NOT NULL AND lower(trim(o.contact_email)) = lower(trim(me.contact_email)) THEN 'contact email'
      WHEN me.contact_phone IS NOT NULL AND lower(trim(o.contact_phone)) = lower(trim(me.contact_phone)) THEN 'contact phone'
      ELSE 'similar address'
    END
  FROM public.organizations o, me
  WHERE o.id <> me.id
    AND (
      (me.registration_number IS NOT NULL AND lower(trim(o.registration_number)) = lower(trim(me.registration_number)))
      OR lower(trim(o.name)) = lower(trim(me.name))
      OR (me.website IS NOT NULL AND lower(trim(o.website)) = lower(trim(me.website)))
      OR (me.contact_email IS NOT NULL AND lower(trim(o.contact_email)) = lower(trim(me.contact_email)))
      OR (me.contact_phone IS NOT NULL AND lower(trim(o.contact_phone)) = lower(trim(me.contact_phone)))
      OR (me.address IS NOT NULL AND lower(trim(o.address)) = lower(trim(me.address)))
    );
$$;
REVOKE EXECUTE ON FUNCTION public.find_org_duplicates(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_org_duplicates(uuid) TO authenticated;

-- 6. Resource access control: verified organizations only
DROP POLICY IF EXISTS "insert own needs" ON public.needs;
CREATE POLICY "insert own needs"
  ON public.needs FOR INSERT TO authenticated
  WITH CHECK (
    public.owns_org(organization_id)
    AND created_by = auth.uid()
    AND public.org_is_verified(organization_id)
  );

DROP POLICY IF EXISTS "create transfers" ON public.transfers;
CREATE POLICY "create transfers"
  ON public.transfers FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (public.owns_org(supplier_org_id) OR public.owns_org(recipient_org_id) OR public.has_role(auth.uid(),'admin'))
    AND public.org_is_verified(supplier_org_id)
    AND public.org_is_verified(recipient_org_id)
  );