import { useAuthStore } from '../store/auth.store';

export function useRoleAccess() {
  const currentRole = useAuthStore((state) => state.user?.role ?? '');

  const isAdmin = currentRole === 'system_admin';
  const isViewer = currentRole === 'management_viewer';

  const canManageUsers = isAdmin;
  const canManageSuppliers = ['system_admin', 'procurement_officer'].includes(currentRole);
  const canViewReports = true;
  const canDispatch = ['system_admin', 'warehouse_officer', 'export_coordinator'].includes(currentRole);
  const canCreateOrders = ['system_admin', 'sales_executive', 'export_coordinator'].includes(currentRole);
  const canManageProduction = ['system_admin', 'production_supervisor'].includes(currentRole);
  const canManageInventory = ['system_admin', 'warehouse_officer', 'export_coordinator'].includes(currentRole);
  const canDoQC = ['system_admin', 'qc_inspector'].includes(currentRole);
  const isReadOnly = isViewer;

  return {
    isAdmin,
    isViewer,
    canManageUsers,
    canManageSuppliers,
    canViewReports,
    canDispatch,
    canCreateOrders,
    canManageProduction,
    canManageInventory,
    canDoQC,
    isReadOnly,
    currentRole,
  };
}
