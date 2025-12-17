import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface DashboardStats {
  total_appointments: number;
  completed_appointments: number;
  total_barbers: number;
  today_appointments: number;
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_appointments: 0,
    completed_appointments: 0,
    total_barbers: 0,
    today_appointments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.barbershop_id) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      if (!user?.barbershop_id) return;
      
      const response = await axios.get(
        `${BACKEND_URL}/api/dashboard/stats?shop_id=${user.barbershop_id}`
      );
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Bienvenido, {user?.name}</Text>
        </View>
        <Ionicons name="notifications-outline" size={28} color="#1E293B" />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="calendar" size={32} color="#2563EB" />
            <Text style={styles.statValue}>{stats.total_appointments}</Text>
            <Text style={styles.statLabel}>Total Citas</Text>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            <Text style={styles.statValue}>{stats.completed_appointments}</Text>
            <Text style={styles.statLabel}>Completadas</Text>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="people" size={32} color="#F59E0B" />
            <Text style={styles.statValue}>{stats.total_barbers}</Text>
            <Text style={styles.statLabel}>Barberos</Text>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#FCE7F3' }]}>
            <Ionicons name="today" size={32} color="#EC4899" />
            <Text style={styles.statValue}>{stats.today_appointments}</Text>
            <Text style={styles.statLabel}>Hoy</Text>
          </Card>
        </View>

        <Card style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Actividad Reciente</Text>
            <Ionicons name="time-outline" size={20} color="#64748B" />
          </View>
          <Text style={styles.emptyText}>No hay actividad reciente</Text>
        </Card>

        <Card style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="person-add" size={24} color="#2563EB" />
              <Text style={styles.actionText}>Agregar Barbero</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="add-circle" size={24} color="#2563EB" />
              <Text style={styles.actionText}>Nuevo Servicio</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
    paddingVertical: 24,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  recentSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 24,
  },
  quickActions: {},
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  actionText: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 8,
    fontWeight: '500',
  },
});

import { TouchableOpacity } from 'react-native';
