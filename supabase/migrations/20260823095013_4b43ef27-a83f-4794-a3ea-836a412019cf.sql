
DROP VIEW IF EXISTS public.organizations_directory;

CREATE TABLE public.organizations_directory (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  type org_type NOT NULL,
  org_category org_category NOT NULL,
  description text,
  website text,
  city text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  verification_status verification_status NOT NULL,
  reliability_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organizations_directory TO authenticated;
GRANT ALL ON public.organizations_directory TO service_role;
ALTER TABLE public.organizations_directory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "directory readable by authenticated" ON public.organizations_directory
FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.sync_org_directory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.organizations_directory WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  INSERT INTO public.organizations_directory (
    id, owner_id, name, type, org_category, description, website,
    city, region, country, latitude, longitude, verification_status, reliability_score, created_at
  ) VALUES (
    NEW.id, NEW.owner_id, NEW.name, NEW.type, NEW.org_category, NEW.description, NEW.website,
    NEW.city, NEW.region, NEW.country, NEW.latitude, NEW.longitude, NEW.verification_status,
    NEW.reliability_score, NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id, name = EXCLUDED.name, type = EXCLUDED.type,
    org_category = EXCLUDED.org_category, description = EXCLUDED.description, website = EXCLUDED.website,
    city = EXCLUDED.city, region = EXCLUDED.region, country = EXCLUDED.country,
    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
    verification_status = EXCLUDED.verification_status, reliability_score = EXCLUDED.reliability_score;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.sync_org_directory() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_sync_org_directory
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.sync_org_directory();

INSERT INTO public.organizations_directory (
  id, owner_id, name, type, org_category, description, website,
  city, region, country, latitude, longitude, verification_status, reliability_score, created_at
)
SELECT id, owner_id, name, type, org_category, description, website,
       city, region, country, latitude, longitude, verification_status, reliability_score, created_at
FROM public.organizations
ON CONFLICT (id) DO NOTHING;
