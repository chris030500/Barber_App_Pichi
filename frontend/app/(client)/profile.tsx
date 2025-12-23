import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { palette, typography } from '../../styles/theme';
import Button from '../../components/ui/Button';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/backendUrl';

interface LoyaltyWallet {
  points: number;
  referred_by?: string;
  history?: Array<{ type: string; points: number; created_at: string }>;
}

interface LoyaltyRules {
  points_per_completed_appointment: number;
  reward_threshold: number;
  reward_description: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [wallet, setWallet] = useState<LoyaltyWallet | null>(null);
  const [rules, setRules] = useState<LoyaltyRules | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  };

  const renderMenuItem = (icon: any, label: string, action: () => void) => (
    <Card style={styles.menuItem} onPress={action}>
      <View style={styles.menuIconWrapper}>
        <Ionicons name={icon} size={22} color={palette.accentSecondary} />
      </View>
      <Text style={styles.menuText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
    </Card>
  );

  useEffect(() => {
    if (!user?.user_id || !BACKEND_URL) return;

    const load = async () => {
      setLoadingWallet(true);
      try {
        const [walletResp, rulesResp] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/loyalty/wallet/${user.user_id}`),
          axios.get(`${BACKEND_URL}/api/loyalty/rules`),
        ]);

        setWallet(walletResp.data as LoyaltyWallet);
        setRules(rulesResp.data as LoyaltyRules);
      } catch (error) {
        console.error('Error cargando puntos de fidelidad', error);
      } finally {
        setLoadingWallet(false);
      }
    };

    load();
  }, [user?.user_id]);

  const rewardProgress = useMemo(() => {
    if (!rules) return 0;
    const earned = wallet?.points || 0;
    return Math.min(earned / Math.max(rules.reward_threshold, 1), 1);
  }, [rules, wallet?.points]);

  const copyReferralCode = async () => {
    if (!user?.referral_code) return;

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(user.referral_code);
      }
      Alert.alert('Copiado', 'Tu código de referido está en el portapapeles.');
    } catch (error) {
      Alert.alert('Listo', `Tu código es ${user.referral_code}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi perfil</Text>
        <Text style={styles.subtitle}>Gestiona tu cuenta y preferencias</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={palette.textSecondary} />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.email}>{user?.email || 'email@ejemplo.com'}</Text>
          {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}

          <View style={styles.badges}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color={palette.accentSecondary} />
              <Text style={styles.badgeText}>{user?.role || 'Cliente'}</Text>
            </View>
            <View style={styles.badgeMuted}>
              <Ionicons name="sparkles" size={14} color={palette.textSecondary} />
              <Text style={styles.badgeMutedText}>Membresía activa</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.loyaltyCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Puntos y recompensas</Text>
              <Text style={styles.sectionSubtitle}>Suma puntos por citas completadas y referidos</Text>
            </View>
            {loadingWallet ? (
              <ActivityIndicator color={palette.accent} />
            ) : (
              <View style={styles.pointsBadge}>
                <Ionicons name="trophy" size={16} color={palette.accent} />
                <Text style={styles.pointsBadgeText}>{wallet?.points ?? 0} pts</Text>
              </View>
            )}
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${rewardProgress * 100}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Próxima recompensa</Text>
            <Text style={styles.progressValue}>
              {wallet?.points ?? 0}/{rules?.reward_threshold ?? 200} pts
            </Text>
          </View>
          <Text style={styles.rewardText}>{rules?.reward_description || 'Recompensa disponible al alcanzar la meta.'}</Text>

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Ionicons name="checkmark-circle" size={14} color={palette.accent} />
              <Text style={styles.chipText}>
                {rules?.points_per_completed_appointment ?? 10} pts por cita completada
              </Text>
            </View>
            <View style={styles.chipMuted}>
              <Ionicons name="people" size={14} color={palette.textSecondary} />
              <Text style={styles.chipTextMuted}>Bono referidos activo</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.referralCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Invita y gana</Text>
              <Text style={styles.sectionSubtitle}>Comparte tu código y recibe puntos extra</Text>
            </View>
            <TouchableOpacity onPress={copyReferralCode} style={styles.copyButton}>
              <Ionicons name="copy" size={16} color={palette.accent} />
              <Text style={styles.copyText}>Copiar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.referralRow}>
            <Text style={styles.referralCode}>{user?.referral_code || 'Cargando...'}</Text>
            <Button title="Compartir" onPress={copyReferralCode} style={styles.shareButton} textStyle={styles.shareButtonText} />
          </View>
          <Text style={styles.referralHint}>
            Tus amigos ganan puntos al completar su primera cita y tú recibes un bono cuando suceda.
          </Text>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi cuenta</Text>
          {renderMenuItem('person-outline', 'Editar perfil', () =>
            Alert.alert('Próximamente', 'Editar perfil')
          )}
          {renderMenuItem('time-outline', 'Historial de cortes', () =>
            Alert.alert('Próximamente', 'Historial de cortes')
          )}
          {renderMenuItem('heart-outline', 'Barberos favoritos', () =>
            Alert.alert('Próximamente', 'Favoritos')
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferencias</Text>
          {renderMenuItem('notifications-outline', 'Notificaciones', () =>
            Alert.alert('Próximamente', 'Notificaciones')
          )}
          {renderMenuItem('shield-checkmark-outline', 'Privacidad', () =>
            Alert.alert('Próximamente', 'Privacidad')
          )}
          {renderMenuItem('help-circle-outline', 'Ayuda y soporte', () =>
            Alert.alert('Próximamente', 'Ayuda y soporte')
          )}
        </View>

        <Button
          title={loggingOut ? 'Cerrando sesión...' : '🚪 Cerrar Sesión'}
          onPress={handleLogout}
          disabled={loggingOut}
          style={styles.logoutButton}
          textStyle={styles.logoutText}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
  },
  subtitle: {
    ...typography.body,
    marginTop: 6,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 18,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 26,
    gap: 8,
  },
  loyaltyCard: {
    gap: 12,
    padding: 16,
  },
  referralCard: {
    gap: 12,
    padding: 16,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  name: {
    ...typography.heading,
    fontSize: 22,
  },
  email: {
    ...typography.body,
  },
  phone: {
    ...typography.body,
    color: palette.textPrimary,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  badgeText: {
    ...typography.label,
    color: palette.textPrimary,
  },
  badgeMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  badgeMutedText: {
    ...typography.label,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
    marginLeft: 4,
  },
  sectionSubtitle: {
    ...typography.body,
    color: palette.textSecondary,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0C1527',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  menuText: {
    flex: 1,
    ...typography.subheading,
    color: palette.textPrimary,
    marginLeft: 12,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pointsBadgeText: {
    ...typography.label,
    color: palette.accent,
  },
  progressBar: {
    height: 10,
    borderRadius: 10,
    backgroundColor: palette.surfaceAlt,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.accent,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...typography.body,
    color: palette.textSecondary,
  },
  progressValue: {
    ...typography.subheading,
    color: palette.textPrimary,
  },
  rewardText: {
    ...typography.body,
    color: palette.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: palette.backgroundAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipText: {
    ...typography.label,
    color: palette.textPrimary,
  },
  chipTextMuted: {
    ...typography.label,
    color: palette.textSecondary,
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralCode: {
    ...typography.heading,
    fontSize: 20,
    letterSpacing: 1.5,
    flex: 1,
  },
  referralHint: {
    ...typography.body,
    color: palette.textSecondary,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  copyText: {
    ...typography.label,
    color: palette.accent,
  },
  shareButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  shareButtonText: {
    color: palette.textPrimary,
  },
  logoutButton: {
    marginTop: 8,
  },
  logoutText: {
    color: palette.textPrimary,
  },
});
