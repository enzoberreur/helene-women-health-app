import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { LanguageContext } from '../../App';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { generateWeeklyInsights } from '../utils/insightsGenerator';
import { hapticFeedback } from '../utils/hapticFeedback';

export default function HomeScreen({ navigation }) {
  const { t, language } = useContext(LanguageContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgMood: 0,
    avgSleep: 0,
    totalLogs: 0,
    topSymptom: null,
  });
  const [insights, setInsights] = useState([]);
  
  // Animations pour empty state
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadStats();
    
    // Animation pour empty state
    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger 14 jours pour comparer les semaines
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', fourteenDaysAgo.toISOString().split('T')[0])
        .order('log_date', { ascending: false });

      if (error) throw error;

      if (logs && logs.length > 0) {
        const currentWeekLogs = logs.slice(0, 7);
        const avgMood = currentWeekLogs.reduce((sum, log) => sum + (log.mood || 0), 0) / currentWeekLogs.length;
        const avgSleep = currentWeekLogs.reduce((sum, log) => sum + (log.sleep_quality || 0), 0) / currentWeekLogs.length;

        const symptomCounts = {};
        const symptoms = ['hot_flashes', 'night_sweats', 'headaches', 'joint_pain', 'fatigue', 'anxiety', 'irritability', 'brain_fog', 'low_mood'];
        
        currentWeekLogs.forEach(log => {
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
          totalLogs: currentWeekLogs.length,
          topSymptom,
        });

        // Générer les insights
        const weeklyInsights = generateWeeklyInsights(logs, language);
        setInsights(weeklyInsights);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSymptomLabel = (symptom) => {
    const labels = t?.home?.symptomLabels || {};
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>{t.home.hello}</Text>
            <Text style={styles.subtitle}>{t.home.headerSubtitle}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('profile')}
          >
            <Ionicons name="person-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Action principale */}
        <View style={styles.mainSection}>
          <TouchableOpacity
            style={styles.primaryCard}
            onPress={() => {
              hapticFeedback.medium();
              navigation.navigate('checkin');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.primaryCardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="create-outline" size={24} color={COLORS.white} />
              </View>
              <Ionicons name="arrow-forward" size={22} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={styles.primaryCardTitle}>{t.home.dailyCheckIn}</Text>
            <Text style={styles.primaryCardSubtitle}>
              {t.home.dailyCheckInSubtitle}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Statistiques */}
        <View style={styles.statsSection}>
          <View style={styles.statsSectionHeader}>
            <Text style={styles.sectionTitle}>{t.home.thisWeek}</Text>
            {stats.totalLogs > 0 && (
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  navigation.navigate('trends');
                }}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>{t.home.viewMore}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
          
          {stats.totalLogs === 0 ? (
            <Animated.View 
              style={[
                styles.emptyState,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: bounceAnim }]
                }
              ]}
            >
              <View style={styles.emptyStateIconContainer}>
                <View style={styles.emptyStateIconCircle}>
                  <Ionicons name="rocket" size={48} color={COLORS.primary} />
                </View>
              </View>
              <Text style={styles.emptyStateTitle}>{t.home.emptyTitle}</Text>
              <Text style={styles.emptyStateText}>
                {t.home.emptyDescription}
              </Text>
              <TouchableOpacity
                style={styles.emptyStateCTA}
                onPress={() => {
                  hapticFeedback.medium();
                  navigation.navigate('checkin');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyStateCTAText}>{t.home.startCheckIn}</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons 
                    name={getMoodIcon(stats.avgMood).name} 
                    size={32} 
                    color={getMoodIcon(stats.avgMood).color} 
                  />
                  <Text style={styles.statValue}>{stats.avgMood}</Text>
                  <Text style={styles.statLabel}>{t.home.stats.mood}</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons 
                    name={getSleepIcon(stats.avgSleep).name} 
                    size={32} 
                    color={getSleepIcon(stats.avgSleep).color} 
                  />
                  <Text style={styles.statValue}>{stats.avgSleep}</Text>
                  <Text style={styles.statLabel}>{t.home.stats.sleep}</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="calendar" size={32} color={COLORS.primary} />
                  <Text style={styles.statValue}>{stats.totalLogs}</Text>
                  <Text style={styles.statLabel}>{t.home.stats.days}</Text>
                </View>
              </View>

              {/* Insights automatiques */}
              {insights.length > 0 && (
                <View style={styles.insightsContainer}>
                  <Text style={styles.insightsTitle}>{t.home.weeklyInsightsTitle}</Text>
                  {insights.map((insight) => (
                    <View 
                      key={insight.id} 
                      style={[
                        styles.insightAutoCard,
                        insight.type === 'positive' && styles.insightPositive,
                        insight.type === 'warning' && styles.insightWarning,
                      ]}
                    >
                      <View style={styles.insightAutoIcon}>
                        <Ionicons 
                          name={insight.icon} 
                          size={20} 
                          color={
                            insight.type === 'positive' ? COLORS.success :
                            insight.type === 'warning' ? COLORS.warning :
                            COLORS.primary
                          } 
                        />
                      </View>
                      <View style={styles.insightAutoContent}>
                        <Text style={styles.insightAutoTitle}>{insight.title}</Text>
                        <Text style={styles.insightAutoMessage}>{insight.message}</Text>
                      </View>
                      <Text style={styles.insightAutoValue}>{insight.value}</Text>
                    </View>
                  ))}
                </View>
              )}

              {stats.topSymptom && (
                <View style={styles.insightCard}>
                  <View style={styles.insightIcon}>
                    <Ionicons name="pulse" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{t.home.mostFrequentSymptom}</Text>
                    <Text style={styles.insightText}>
                      {getSymptomLabel(stats.topSymptom)}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Action secondaire */}
        <View style={styles.chatSection}>
          <TouchableOpacity
            style={styles.chatCard}
            onPress={() => {
              hapticFeedback.light();
              navigation.navigate('chat');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.chatCardContent}>
              <View style={styles.chatIconBadge}>
                <Ionicons name="sparkles" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.chatCardTitle}>{t.home.talkToHelene}</Text>
              <Text style={styles.chatCardSubtitle}>
                {t.home.talkToHeleneSubtitle}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={COLORS.text} />
          </TouchableOpacity>

          {/* Journal Émotionnel */}
          <TouchableOpacity
            style={[styles.chatCard, { marginTop: SPACING.md }]}
            onPress={() => {
              hapticFeedback.light();
              navigation.navigate('journal');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.chatCardContent}>
              <View style={[styles.chatIconBadge, { backgroundColor: '#FCECEF' }]}>
                <Ionicons name="heart" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.chatCardTitle}>{t.home.emotionalJournal}</Text>
              <Text style={styles.chatCardSubtitle}>
                {t.home.emotionalJournalSubtitle}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={COLORS.text} />
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
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 38,
    fontFamily: FONTS.heading.italic,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  primaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryCardTitle: {
    fontSize: 22,
    fontFamily: FONTS.heading.italic,
    color: COLORS.white,
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  primaryCardSubtitle: {
    fontSize: 15,
    fontFamily: FONTS.body.regular,
    color: COLORS.white,
    opacity: 0.9,
    lineHeight: 21,
  },
  statsSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  statsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading.italic,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: FONTS.body.semibold,
    color: COLORS.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  insightsContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  insightsTitle: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  insightAutoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  insightPositive: {
    borderLeftColor: COLORS.success,
    backgroundColor: '#F0FDF4',
  },
  insightWarning: {
    borderLeftColor: COLORS.warning,
    backgroundColor: '#FFFBEB',
  },
  insightAutoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  insightAutoContent: {
    flex: 1,
  },
  insightAutoTitle: {
    fontSize: 13,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  insightAutoMessage: {
    fontSize: 13,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  insightAutoValue: {
    fontSize: 14,
    fontFamily: FONTS.body.bold,
    color: COLORS.text,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 26,
    fontFamily: FONTS.heading.regular,
    color: COLORS.text,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.body.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  insightTitle: {
    fontSize: 13,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 15,
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
    lineHeight: 21,
  },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxxl,
    alignItems: 'center',
    marginVertical: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    borderStyle: 'dashed',
  },
  emptyStateIconContainer: {
    marginBottom: SPACING.lg,
  },
  emptyStateIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontFamily: FONTS.heading.italic,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  emptyStateCTA: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateCTAText: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: COLORS.white,
  },
  chatSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  chatCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chatCardContent: {
    flex: 1,
  },
  chatIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  chatCardTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading.italic,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  chatCardSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
