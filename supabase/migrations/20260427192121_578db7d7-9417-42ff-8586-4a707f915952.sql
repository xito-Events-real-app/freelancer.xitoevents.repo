
REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_platform_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_signups_by_day(int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_suspension(uuid, boolean, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_suspended(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_list_users(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_signups_by_day(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_suspension(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_suspended(uuid) TO authenticated;
