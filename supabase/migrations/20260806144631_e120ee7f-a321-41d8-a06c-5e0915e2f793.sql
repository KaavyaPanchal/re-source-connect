
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('supplier','recipient','logistics','admin');
CREATE TYPE public.org_type AS ENUM ('supplier','recipient','logistics');
CREATE TYPE public.verification_status AS ENUM ('pending','verified','rejected','flagged');
CREATE TYPE public.resource_status AS ENUM ('available','reserved','unavailable','transferred','expired');
CREATE TYPE public.need_status AS ENUM ('active','partially_fulfilled','fulfilled','cancelled');
CREATE TYPE public.match_status AS ENUM ('proposed','accepted','rejected','expired','converted');
CREATE TYPE public.transfer_status AS ENUM ('proposed','accepted','scheduled','pickup_ready','picked_up','in_transit','delivered','impact_verified','cancelled');
CREATE TYPE public.ai_action_status AS ENUM ('pending','approved','rejected','executed','failed');

-- UPDATED_AT HELPER
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "self assign non admin role" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role <> 'admin');

-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  type public.org_type NOT NULL,
  description text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  verification_notes text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  reliability_score numeric NOT NULL DEFAULT 80,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_org(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id AND owner_id = auth.uid());
$$;

CREATE POLICY "orgs readable by authenticated" ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "create own org" ON public.organizations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "update own org" ON public.organizations FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "delete own org" ON public.organizations FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CATEGORIES
CREATE TABLE public.resource_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  family text NOT NULL,
  default_unit text NOT NULL DEFAULT 'kg',
  perishable boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resource_categories TO authenticated, anon;
GRANT ALL ON public.resource_categories TO service_role;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.resource_categories FOR SELECT USING (true);

INSERT INTO public.resource_categories (key,name,family,default_unit,perishable) VALUES
 ('staple_grains','Staple Grains','food','kg',false),
 ('fresh_produce','Fresh Produce','food','kg',true),
 ('dairy','Dairy','food','litre',true),
 ('prepared_meals','Prepared Meals','food','meals',true),
 ('packaged_food','Packaged Food','food','kg',false),
 ('drinking_water','Drinking Water','water','litre',false),
 ('medical_supplies','Medical Supplies','medical','units',false),
 ('medicines','Medicines','medical','units',true),
 ('clothing','Clothing','clothing','units',false),
 ('blankets_shelter','Blankets & Shelter','shelter','units',false),
 ('equipment','Equipment','equipment','units',false),
 ('electronics','Electronics','electronics','units',false),
 ('storage_space','Storage Space','storage','m3',false),
 ('transport_capacity','Transport Capacity','transport','tonnes',false),
 ('volunteer_capacity','Volunteer Capacity','people','hours',false);

-- RESOURCES
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.resource_categories(id),
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  quantity numeric NOT NULL CHECK (quantity >= 0),
  reserved_quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  condition text,
  storage_requirements text,
  requires_refrigeration boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  available_from timestamptz,
  available_to timestamptz,
  pickup_address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  photos text[] NOT NULL DEFAULT '{}',
  status public.resource_status NOT NULL DEFAULT 'available',
  urgency_score integer NOT NULL DEFAULT 0,
  ai_analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources readable" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (public.owns_org(organization_id) AND created_by = auth.uid());
CREATE POLICY "update own resources" ON public.resources FOR UPDATE TO authenticated
  USING (public.owns_org(organization_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.owns_org(organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "delete own resources" ON public.resources FOR DELETE TO authenticated USING (public.owns_org(organization_id));
CREATE TRIGGER trg_resources_updated BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NEEDS
CREATE TABLE public.needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.resource_categories(id),
  created_by uuid NOT NULL,
  title text NOT NULL,
  purpose text,
  quantity numeric NOT NULL CHECK (quantity >= 0),
  min_quantity numeric,
  fulfilled_quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  acceptable_alternatives text,
  storage_capacity text,
  has_refrigeration boolean NOT NULL DEFAULT false,
  delivery_requirements text,
  deadline timestamptz,
  address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  status public.need_status NOT NULL DEFAULT 'active',
  urgency_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.needs TO authenticated;
GRANT ALL ON public.needs TO service_role;
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "needs readable" ON public.needs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own needs" ON public.needs FOR INSERT TO authenticated WITH CHECK (public.owns_org(organization_id) AND created_by = auth.uid());
CREATE POLICY "update own needs" ON public.needs FOR UPDATE TO authenticated
  USING (public.owns_org(organization_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.owns_org(organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "delete own needs" ON public.needs FOR DELETE TO authenticated USING (public.owns_org(organization_id));
CREATE TRIGGER trg_needs_updated BEFORE UPDATE ON public.needs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LOGISTICS PROFILES
CREATE TABLE public.logistics_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL,
  capacity_kg numeric NOT NULL DEFAULT 1000,
  refrigerated boolean NOT NULL DEFAULT false,
  service_areas text[] NOT NULL DEFAULT '{}',
  max_distance_km numeric NOT NULL DEFAULT 100,
  price_per_km numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  available boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistics_profiles TO authenticated;
GRANT ALL ON public.logistics_profiles TO service_role;
ALTER TABLE public.logistics_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logistics readable" ON public.logistics_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage own logistics" ON public.logistics_profiles FOR ALL TO authenticated
  USING (public.owns_org(organization_id)) WITH CHECK (public.owns_org(organization_id));
CREATE TRIGGER trg_logistics_updated BEFORE UPDATE ON public.logistics_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MATCHES
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  need_id uuid NOT NULL REFERENCES public.needs(id) ON DELETE CASCADE,
  supplier_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  distance_km numeric,
  rationale jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation text,
  status public.match_status NOT NULL DEFAULT 'proposed',
  supplier_response text,
  recipient_response text,
  generated_by text NOT NULL DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_id, need_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches readable" ON public.matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "create matches" ON public.matches FOR INSERT TO authenticated
  WITH CHECK (public.owns_org(supplier_org_id) OR public.owns_org(recipient_org_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "respond to matches" ON public.matches FOR UPDATE TO authenticated
  USING (public.owns_org(supplier_org_id) OR public.owns_org(recipient_org_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.owns_org(supplier_org_id) OR public.owns_org(recipient_org_id) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRANSFERS
CREATE TABLE public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  need_id uuid NOT NULL REFERENCES public.needs(id) ON DELETE CASCADE,
  supplier_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  logistics_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  status public.transfer_status NOT NULL DEFAULT 'proposed',
  distance_km numeric,
  scheduled_pickup_at timestamptz,
  scheduled_delivery_at timestamptz,
  pickup_instructions text,
  delivery_instructions text,
  delivered_quantity numeric,
  delivered_at timestamptz,
  delivery_notes text,
  delivery_photos text[] NOT NULL DEFAULT '{}',
  confirmed_by uuid,
  impact_verified boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO service_role;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_touch_transfer(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.transfers t
    JOIN public.organizations o
      ON o.id IN (t.supplier_org_id, t.recipient_org_id, COALESCE(t.logistics_org_id, t.supplier_org_id))
    WHERE t.id = _id AND o.owner_id = auth.uid()
  ) OR public.has_role(auth.uid(),'admin');
$$;

CREATE POLICY "transfers readable" ON public.transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "create transfers" ON public.transfers FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.owns_org(supplier_org_id) OR public.owns_org(recipient_org_id) OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "update involved transfers" ON public.transfers FOR UPDATE TO authenticated
  USING (public.owns_org(supplier_org_id) OR public.owns_org(recipient_org_id) OR public.owns_org(COALESCE(logistics_org_id, supplier_org_id)) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.owns_org(supplier_org_id) OR public.owns_org(recipient_org_id) OR public.owns_org(COALESCE(logistics_org_id, supplier_org_id)) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_transfers_updated BEFORE UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRANSFER EVENTS
CREATE TABLE public.transfer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  status public.transfer_status NOT NULL,
  note text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.transfer_events TO authenticated;
GRANT ALL ON public.transfer_events TO service_role;
ALTER TABLE public.transfer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events readable" ON public.transfer_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert events" ON public.transfer_events FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() AND public.can_touch_transfer(transfer_id));

-- MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid REFERENCES public.transfers(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_name text,
  body text NOT NULL,
  is_ai boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages readable" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- DOCUMENTS
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid REFERENCES public.transfers(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  file_url text,
  approved boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents readable" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "create documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "approve documents" ON public.documents FOR UPDATE TO authenticated
  USING (transfer_id IS NULL OR public.can_touch_transfer(transfer_id))
  WITH CHECK (transfer_id IS NULL OR public.can_touch_transfer(transfer_id));

-- AI ACTIONS
CREATE TABLE public.ai_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.ai_action_status NOT NULL DEFAULT 'pending',
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_actions TO authenticated;
GRANT ALL ON public.ai_actions TO service_role;
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai actions" ON public.ai_actions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "create ai actions" ON public.ai_actions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own ai actions" ON public.ai_actions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_ai_actions_updated BEFORE UPDATE ON public.ai_actions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR actor_id = auth.uid());
CREATE POLICY "write audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
ALTER PUBLICATION supabase_realtime ADD TABLE public.needs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;

CREATE INDEX idx_resources_org ON public.resources(organization_id);
CREATE INDEX idx_resources_status ON public.resources(status);
CREATE INDEX idx_needs_org ON public.needs(organization_id);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_transfers_status ON public.transfers(status);
CREATE INDEX idx_messages_transfer ON public.messages(transfer_id);
