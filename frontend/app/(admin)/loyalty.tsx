import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { palette, typography, shadows } from '../../styles/theme';
import { BACKEND_URL } from '../../utils/backendUrl';

interface LoyaltyRules {
  points_per_completed_appointment: number;
  referral_bonus: number;
  reward_threshold: number;
  reward_description: string;
}

export default function LoyaltyConfigScreen() {
  const [rules, setRules] = useState<LoyaltyRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pointsPerAppointment, setPointsPerAppointment] = useState('10');
  const [referralBonus, setReferralBonus] = useState('50');
  const [rewardThreshold, setRewardThreshold] = useState('200');
  const [rewardDescription, setRewardDescription] = useState('Corte gratis o upgrade de servicio');

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    if (!BACKEND_URL) return;
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/loyalty/rules`);
      const data = response.data as LoyaltyRules;
      setRules(data);
      setPointsPerAppointment(String(data.points_per_completed_appointment || 0));
      setReferralBonus(String(data.referral_bonus || 0));
      setRewardThreshold(String(data.reward_threshold || 0));
      setRewardDescription(data.reward_description || '');
    } catch (error) {
      console.error('Error cargando reglas de fidelidad', error);
      Alert.alert('Error', 'No se pudieron cargar las reglas de fidelidad');
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async () => {
    if (!BACKEND_URL) return;
    const ppa = parseInt(pointsPerAppointment, 10);
    const rb = parseInt(referralBonus, 10);
    const rt = parseInt(rewardThreshold, 10);

    if ([ppa, rb, rt].some((value) => Number.isNaN(value) || value < 0)) {
      Alert.alert('Valores inválidos', 'Usa solo números positivos para los puntos.');
      return;
    }

    setSaving(true);
    try {
      const payload: LoyaltyRules = {
        points_per_completed_appointment: ppa,
        referral_bonus: rb,
        reward_threshold: rt,
        reward_description,
      };
      const response = await axios.put(`${BACKEND_URL}/api/loyalty/rules`, payload);
      setRules(response.data);
      Alert.alert('Guardado', 'Reglas de fidelidad actualizadas');
    } catch (error) {
      console.error('Error guardando reglas', error);
      Alert.alert('Error', 'No se pudieron guardar las reglas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Programa de fidelidad</Text>
            <Text style={styles.subtitle}>
              Define cómo se acumulan puntos, los bonos por referido y cuándo liberar recompensas.
            </Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="gift" size={16} color={palette.accent} />
            <Text style={styles.badgeText}>Beta</Text>
          </View>
        </View>

        <Card style={styles.metricCard}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Pts / cita completada</Text>
            <Text style={styles.metricValue}>{pointsPerAppointment || '0'}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Bono por referido</Text>
            <Text style={styles.metricValue}>{referralBonus || '0'}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Meta recompensa</Text>
            <Text style={styles.metricValue}>{rewardThreshold || '0'} pts</Text>
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionLabel}>Reglas de acumulación</Text>
          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Pts por cita</Text>
              <TextInput
                value={pointsPerAppointment}
                onChangeText={setPointsPerAppointment}
                style={styles.input}
                placeholder="10"
                keyboardType="numeric"
                placeholderTextColor={palette.textSecondary}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Bono referido</Text>
              <TextInput
                value={referralBonus}
                onChangeText={setReferralBonus}
                style={styles.input}
                placeholder="50"
                keyboardType="numeric"
                placeholderTextColor={palette.textSecondary}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Meta de recompensa</Text>
              <TextInput
                value={rewardThreshold}
                onChangeText={setRewardThreshold}
                style={styles.input}
                placeholder="200"
                keyboardType="numeric"
                placeholderTextColor={palette.textSecondary}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Descripción de recompensa</Text>
              <TextInput
                value={rewardDescription}
                onChangeText={setRewardDescription}
                style={[styles.input, { height: 70 }]}
                multiline
                placeholder="Corte gratis o upgrade de servicio"
                placeholderTextColor={palette.textSecondary}
              />
            </View>
          </View>

          <Button
            title={saving ? 'Guardando...' : 'Guardar reglas'}
            onPress={saveRules}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
          />
        </Card>

        <Card style={styles.helperCard}>
          <Text style={styles.sectionLabel}>Sugerencias rápidas</Text>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={16} color={palette.accent} />
            <Text style={styles.tipText}>Usa metas bajas (100-200 pts) para entregar recompensas frecuentes.</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={16} color={palette.accent} />
            <Text style={styles.tipText}>Configura el bono de referido para que valga ~3 citas completadas.</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={16} color={palette.accent} />
            <Text style={styles.tipText}>Recuerda anunciar el beneficio en el perfil del cliente.</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
  },
  subtitle: {
    ...typography.body,
    color: palette.textSecondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  badgeText: {
    ...typography.label,
    color: palette.accent,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.sm,
  },
  metricItem: {
    flex: 1,
    padding: 16,
    gap: 4,
  },
  metricLabel: {
    ...typography.label,
    color: palette.textSecondary,
  },
  metricValue: {
    ...typography.heading,
    fontSize: 20,
  },
  separator: {
    width: 1,
    backgroundColor: palette.border,
    alignSelf: 'stretch',
  },
  formCard: {
    gap: 12,
    paddingBottom: 16,
  },
  sectionLabel: {
    ...typography.subheading,
    color: palette.textPrimary,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    ...typography.label,
    color: palette.textSecondary,
  },
  input: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.textPrimary,
  },
  saveButton: {
    marginTop: 4,
  },
  helperCard: {
    gap: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    ...typography.body,
    color: palette.textPrimary,
    flex: 1,
  },
});
