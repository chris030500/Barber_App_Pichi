import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export function PushBootstrap() {
  const { user } = useAuth();
  const { registerForPushNotifications } = useNotification();

  useEffect(() => {
    if (user?.user_id) {
      registerForPushNotifications(user.user_id);
    }
  }, [user?.user_id, registerForPushNotifications]);

  return null;
}
