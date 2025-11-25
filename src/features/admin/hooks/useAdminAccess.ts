import { useAuthStore } from '@shared/store/authStore';
import { isAdmin } from '../utils/roleHelpers';

export const useAdminAccess = () => {
  const { user } = useAuthStore();

  const hasAdminAccess = isAdmin(user?.role);
  const isSuperAdmin = user?.role === 'super_admin';

  return {
    hasAdminAccess,
    isSuperAdmin,
    currentUser: user,
  };
};
