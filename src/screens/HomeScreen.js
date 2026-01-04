import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { LanguageContext } from '../../App';

const COLORS = {
  primary: '#FF6B9D',
  primaryLight: '#FFF0F7',
  secondary: '#C8A2C8',
  background: '#FFFFFF',
  backgroundLight: '#F3F4F6',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
};

export default function HomeScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgMood: 0,
    avgSleep: 0,
    totalLogs: 0,
    topSymptom: null,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('log_date', { ascending: false });

      if (error) throw error;

      if (logs && logs.length > 0) {
        const avgMood = logs.reduce((sum, log) => sum + (log.mood || 0), 0) / logs.length;
        const avgSleep = logs.reduce((sum, log) => sum + (log.sleep_quality || 0), 0) / logs.length;

        const symptomCounts = {};
        const symptoms = ['hot_flashes', 'night_sweats', 'headaches', 'joint_pain', 'fatigue', 'anxiety', 'irritability', 'brain_fog', 'low_mood'];
        
        logs.forEach(log => {
          symptoms.forEach(symptom => {
            if (log[symptom] && log[symptom] > 0) {
              symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
            }
          });
        });

        const topSymptom = Object.keys(symptomCounts).length > 0
          ? Object.entries(symptomCounts).sort((a, b) => b[1] - a[1])[0][0]
          : null;

        setStats({
          avgMood: avgMood.toFixed(1),
          avgSleep: avgSleep.toFixed(1),
          totalLogs: logs.length,
          topSymptom,
        });
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSymptomLabel = (symptom) => {
    const labels = {
      hot_flashes: 'Bouffées de chaleur',
      night_sweats: 'Sueurs nocturnes',
      headaches: 'Maux de tête',
      joint_pain: 'Douleurs articulaires',
      fatigue: 'Fatigue',
      anxiety: 'Anxiété',
      irritability: 'Irritabilité',
      brain_fog: 'Brouillard mental',
      low_mood: 'Humeur basse',
    };
    return labels[symptom] || symptom;
  };

  const getMoodIcon = (mood) => {
    const moodValue = parseFloat(mood);
    if (moodValue >= 4.5) return { name: 'happy', color: COLORS.success };
    if (moodValue >= 3.5) return { name: 'happy-outline', color: COLORS.primary };
    if (moodValue >= 2.5) return { name: 'remove-circle-outline', color: COLORS.warning };
    if (moodValue >= 1.5) return { name: 'sad-outline', color: '#F97316' };
    return { name: 'sad', color: COLORS.error };
  };

  const getSleepIcon = (sleep) => {
    const sleepValue = parseFloat(sleep);
    if (sleepValue >= 8) return { name: 'moon', color: '#8B5CF6' };
    if (sleepValue >= 6) return { name: 'moon-outline', color: COLORS.primary };
    if (sleepValue >= 4) return { name: 'partly-sunny-outline', color: COLORS.warning };
    return { name: 'alert-circle-outline', color: COLORS.error };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour 👋</Text>
            <Text style={styles.subtitle}>Comment allez-vous aujourd'hui ?</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('profile')}
          >
            <Ionicons name="person-circle-outline" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.primaryCard}
            onPress={() => navigation.navigate('checkin')}
          >
            <View style={styles.cardIconContainer}>
              <Ionicons name="clipboard-outline" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.primaryCardContent}>
              <Text style={styles.primaryCardTitle}>Check-in quotidien</Text>
              <Text style={styles.primaryCardSubtitle}>
                Enregistrez vos symptômes et votre humeur
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryCard}
            onPress={() => navigation.navigate('chat')}
          >
            <View style={styles.cardIconContainer}>
              <Ionicons name="chatbubbles-outline" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.secondaryCardContent}>
              <Text style={styles.secondaryCardTitle}>Discuter avec Helene</Text>
              <Text style={styles.secondaryCardSubtitle}>
                Posez vos questions sur la ménopause
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cette semaine</Text>
          
          {stats.totalLogs === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>
                Commencez à enregistrer vos check-ins pour voir vos statistiques
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons 
                    name={getMoodIcon(stats.avgMood).name} 
                    size={36} 
                    color={getMoodIcon(stats.avgMood).color} 
                  />
                  <Text style={styles.statValue}>{stats.avgMood}/5</Text>
                  <Text style={styles.statLabel}>Humeur moyenne</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons 
                    name={getSleepIcon(stats.avgSleep).name} 
                    size={36} 
                    color={getSleepIcon(stats.avgSleep).color} 
                  />
                  <Text style={styles.statValue}>{stats.avgSleep}/10</Text>
                  <Text style={styles.statLabel}>Sommeil moyen</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
                  <Text style={styles.statValue}>{stats.totalLogs}</Text>
                  <Text style={styles.statLabel}>Check-ins</Text>
                </View>
              </View>

              {stats.topSymptom && (
                <View style={styles.insightCard}>
                  <Ionicons name="bulb-outline" size={28} color={COLORS.primary} />
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Symptôme principal</Text>
                    <Text style={styles.insightText}>
                      {getSymptomLabel(stats.topSymptom)} - le plus fréquent cette semaine
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.insightCTA}
            onPress={() => navigation.navigate('chat')}
          >
            <View style={styles.insightCTAContent}>
              <Text style={styles.insightCTATitle}>
                Obtenez des conseils personnalisés
              </Text>
              <Text style={styles.insightCTASubtitle}>
                Discutez avec Helene pour mieux comprendre vos symptômes
              </Text>
            </View>
            <Ionicons name="sparkles" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  primaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIconContainer: {
    marginRight: 16,
  },
  primaryCardContent: {
    flex: 1,
  },
  primaryCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  primaryCardSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  secondaryCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryCardContent: {
    flex: 1,
  },
  secondaryCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  secondaryCardSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  insightCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  insightContent: {
    flex: 1,
    marginLeft: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  emptyState: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 16,
  },
  insightCTA: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightCTAContent: {
    flex: 1,
    marginRight: 12,
  },
  insightCTATitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  insightCTASubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
});
