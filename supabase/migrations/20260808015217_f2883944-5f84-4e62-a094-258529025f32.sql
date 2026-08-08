REVOKE ALL ON FUNCTION public.org_is_verified(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_org_duplicates(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_is_verified(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_org_duplicates(uuid) TO service_role;