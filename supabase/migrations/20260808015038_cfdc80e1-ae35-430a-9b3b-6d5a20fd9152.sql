ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'not_verified';
ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'info_required';
ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'suspended';

CREATE TYPE public.org_category AS ENUM (
  'nonprofit_ngo','charity','school','hospital','government','community','religious','business','other'
);

CREATE TYPE public.verification_doc_kind AS ENUM (
  'certificate_of_registration','certificate_of_incorporation','charity_registration',
  'nonprofit_registration','government_registration','business_registration',
  'tax_exemption','government_license','other_official_proof'
);