import { ReactNode } from 'react';
import { useCurrentUserRoles, AppRole } from '@/hooks/useUserRoles';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  fallback?: ReactNode;
  showAccessDenied?: boolean;
}

/**
 * Role-based access control component.
 * Only renders children if user has one of the allowed roles.
 */
export function RoleGate({ 
  children, 
  allowedRoles, 
  fallback = null,
  showAccessDenied = false 
}: RoleGateProps) {
  const { data: userRoles = [], isLoading } = useCurrentUserRoles();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAccess = userRoles.some(role => allowedRoles.includes(role));

  if (!hasAccess) {
    if (showAccessDenied) {
      return (
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to view this content. 
            Required roles: {allowedRoles.join(', ')}.
          </AlertDescription>
        </Alert>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Check if user can perform admin actions
 */
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGate allowedRoles={['admin']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

/**
 * Check if user can perform CIO/Admin actions (capital allocation, kill switch)
 */
export function CIOOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGate allowedRoles={['admin', 'cio']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

/**
 * Check if user can perform trading actions
 */
export function TraderOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGate allowedRoles={['admin', 'cio', 'trader']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

/**
 * Check if user can perform ops actions (freeze books, manage venues)
 */
export function OpsOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGate allowedRoles={['admin', 'cio', 'ops']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

/**
 * Check if user has any operational role (not just viewer)
 */
export function OperationalRole({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGate allowedRoles={['admin', 'cio', 'trader', 'ops', 'research']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

/**
 * Hook to check specific role access
 */
export function useRoleAccess() {
  const { data: roles = [], isLoading } = useCurrentUserRoles();
  
  const hasRole = (role: AppRole) => roles.includes(role);
  const hasAnyRole = (checkRoles: AppRole[]) => checkRoles.some(r => roles.includes(r));
  
  const isAdmin = hasRole('admin');
  const isCIO = hasAnyRole(['admin', 'cio']);
  const isTrader = hasAnyRole(['admin', 'cio', 'trader']);
  const isOps = hasAnyRole(['admin', 'cio', 'ops']);
  const isResearch = hasAnyRole(['admin', 'cio', 'research']);
  const isAuditor = hasAnyRole(['admin', 'auditor']);
  const isViewer = roles.length > 0;
  
  // Specific permission checks
  const canReallocateCapital = isCIO;
  const canFreezeBook = isOps;
  const canToggleStrategy = isTrader;
  const canActivateKillSwitch = isCIO;
  const canApproveMeme = isCIO;
  const canViewAudit = hasAnyRole(['admin', 'cio', 'auditor']);
  const canManageUsers = isAdmin;
  
  return {
    roles,
    isLoading,
    hasRole,
    hasAnyRole,
    isAdmin,
    isCIO,
    isTrader,
    isOps,
    isResearch,
    isAuditor,
    isViewer,
    // Permissions
    canReallocateCapital,
    canFreezeBook,
    canToggleStrategy,
    canActivateKillSwitch,
    canApproveMeme,
    canViewAudit,
    canManageUsers,
  };
}
