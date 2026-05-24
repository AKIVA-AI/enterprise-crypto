-- Lock down EXECUTE grants on SECURITY DEFINER functions per
-- Supabase Security Advisor warnings (anon/authenticated_security_definer_function_executable).
--
-- Enterprise Crypto has 22 advisor warnings (11 functions x [anon, authenticated]).
-- Supabase auto-grants EXECUTE to PUBLIC, anon, authenticated, and service_role
-- on every public function; SECURITY DEFINER bypasses the caller's RLS.
--
-- Classification:
--   User-facing RPCs (keep authenticated, revoke anon):
--     - can_view_order: checks if user can view an order (internal auth via auth.uid())
--     - has_any_role: checks user roles (internal auth via auth.uid())
--     - has_book_access: checks book access (internal auth via auth.uid())
--     - has_role: checks user role (internal auth via auth.uid())
--     - current_tenant_id: reads caller's tenant (internal auth via auth.uid())
--
--   Service-only functions (service_role only, revoke both):
--     - check_daily_pnl_circuit_breaker: circuit breaker logic (service-only)
--     - check_position_circuit_breaker: circuit breaker logic (service-only)
--     - cleanup_old_market_snapshots: cleanup job (cron/service-only)
--     - cleanup_old_metrics: cleanup job (cron/service-only)
--     - handle_new_user: auth trigger function (trigger-only)
--
--   Audit logging (keep authenticated, revoke anon):
--     - log_audit_event: audit logging (user-facing, but should only log caller's actions)
--
-- Expected after this migration: 6 advisor warnings remain (authenticated role for 6 user-facing
-- functions). These are by-design: the functions need user-callable EXECUTE and have internal
-- auth checks via auth.uid().

-- User-facing RPCs: Keep authenticated, revoke anon

-- can_view_order: checks if user can view an order
REVOKE EXECUTE ON FUNCTION public.can_view_order(_user_id uuid, _book_id uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_order(_user_id uuid, _book_id uuid) TO service_role, authenticated;

-- has_any_role: checks user roles
REVOKE EXECUTE ON FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[]) TO service_role, authenticated;

-- has_book_access: checks book access
REVOKE EXECUTE ON FUNCTION public.has_book_access(_user_id uuid, _book_id uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_book_access(_user_id uuid, _book_id uuid) TO service_role, authenticated;

-- has_role: checks user role
REVOKE EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role, authenticated;

-- current_tenant_id: reads caller's tenant
REVOKE EXECUTE ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO service_role, authenticated;

-- log_audit_event: audit logging (user-facing)
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event() TO service_role, authenticated;

-- Service-only functions: Revoke both anon and authenticated, keep only service_role

-- check_daily_pnl_circuit_breaker: circuit breaker logic (service-only)
REVOKE EXECUTE ON FUNCTION public.check_daily_pnl_circuit_breaker() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_daily_pnl_circuit_breaker() TO service_role;

-- check_position_circuit_breaker: circuit breaker logic (service-only)
REVOKE EXECUTE ON FUNCTION public.check_position_circuit_breaker() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_position_circuit_breaker() TO service_role;

-- cleanup_old_market_snapshots: cleanup job (cron/service-only)
REVOKE EXECUTE ON FUNCTION public.cleanup_old_market_snapshots() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_market_snapshots() TO service_role;

-- cleanup_old_metrics: cleanup job (cron/service-only)
REVOKE EXECUTE ON FUNCTION public.cleanup_old_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_metrics() TO service_role;

-- handle_new_user: auth trigger function (trigger-only)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
