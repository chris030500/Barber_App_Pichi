import type { User } from '../contexts/AuthContext';
import { normalizeRole } from '../contexts/AuthContext';

export function getRedirectPath(user: User | null | undefined): string {
  if (!user) return '/(auth)/welcome';

  const role = normalizeRole(user.role);

  switch (role) {
    case 'client':
      return '/(client)/home';
    case 'barber':
      return '/(barber)/schedule';
    case 'admin':
      return '/(admin)/dashboard';
    default:
      return '/(auth)/welcome';
  }
}
