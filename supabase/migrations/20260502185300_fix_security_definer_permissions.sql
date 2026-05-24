-- Fix SECURITY DEFINER function permissions
-- Revokes public execute access to sensitive functions
-- Created: 2026-05-02

-- ============================================================================
-- REVOKE EXECUTE FROM ANON AND AUTHENTICATED ROLES
-- These functions should only be callable via Edge Functions with service_role
-- ============================================================================

-- Encryption/key management functions (CRITICAL)
REVOKE EXECUTE ON FUNCTION public.decrypt_api_key(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_api_key(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_decrypted_exchange_keys(uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM anon, authenticated;

-- Risk control functions
REVOKE EXECUTE ON FUNCTION public.check_daily_pnl_circuit_breaker() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_position_circuit_breaker() FROM anon, authenticated;

-- User management
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Access control helpers (should be called internally, not directly via RPC)
REVOKE EXECUTE ON FUNCTION public.can_view_order(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_book_access(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_tenant_id() FROM anon, authenticated;

-- Audit logging
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM anon, authenticated;

-- Maintenance/cleanup functions
REVOKE EXECUTE ON FUNCTION public.cleanup_old_metrics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_market_snapshots() FROM anon, authenticated;

-- ============================================================================
-- GRANT EXECUTE TO SERVICE ROLE ONLY
-- Edge Functions using service_role can still call these
-- ============================================================================

-- Grant back to service_role (supabase_storage_admin and postgres already have access)
-- This ensures only privileged server-side code can execute these functions
GRANT EXECUTE ON FUNCTION public.decrypt_api_key(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.encrypt_api_key(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_decrypted_exchange_keys(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_daily_pnl_circuit_breaker() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_position_circuit_breaker() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.can_view_order(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_book_access(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_market_snapshots() TO service_role;

-- ============================================================================
-- VERIFICATION
-- Run these queries to verify the fix:
-- SELECT routine_name, routine_schema 
-- FROM information_schema.routines 
-- WHERE routine_type = 'FUNCTION' 
-- AND routine_schema = 'public'
-- AND security_type = 'DEFINER';
-- ============================================================================
