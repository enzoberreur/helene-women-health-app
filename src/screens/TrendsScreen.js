import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { calculateMenqolScore } from '../utils/menqolCalculator';
import { LanguageContext } from '../../App';

const { width } = Dimensions.get('window');

export default function TrendsScreen({ navigation, user }) {
  const { t, language } = useContext(LanguageContext);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7); // 7 ou 30 jours
  const [data, setData] = useState({
    moodData: [],
    sleepData: [],
    symptomsData: [],
    labels: [],
    menqolScore: null,
  });

  useEffect(() => {
    if (user) {
      loadTrends();
    }
  }, [period, user]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      console.log('TrendsScreen: Loading trends for user', user?.id);
      if (!user) {
        console.log('TrendsScreen: No user found');
        return;
      }

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - period);

      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', daysAgo.toISOString().split('T')[0])
        .order('log_date', { ascending: true });

      if (error) {
        console.error('TrendsScreen: Error loading logs', error);
        throw error;
      }

      console.log('TrendsScreen: Loaded', logs?.length || 0, 'logs');

      if (logs && logs.length > 0) {
        // Préparer les données pour les graphiques
        const moodData = logs.map(log => log.mood || 0);
        const sleepData = logs.map(log => log.sleep_quality || 0);
        const labels = logs.map(log => {
          const date = new Date(log.log_date);
          return `${date.getDate()}/${date.getMonth() + 1}`;
        });

        // Compter les symptômes
        const symptoms = ['hot_flashes', 'night_sweats', 'headaches', 'joint_pain', 'fatigue', 'anxiety', 'irritability', 'brain_fog', 'low_mood'];
        const symptomCounts = {};
        
        symptoms.forEach(symptom => {
          symptomCounts[symptom] = logs.filter(log => log[symptom] && log[symptom] > 0).length;
        });

        // Calculer le score MENQOL
        const menqolScore = calculateMenqolScore(logs, language);

        setData({
          moodData,
          sleepData,
          symptomsData: symptomCounts,
          labels: period === 7 ? labels : labels.filter((_, i) => i % 3 === 0), // Simplifier les labels pour 30j
          menqolScore,
        });
      }
    } catch (error) {
      console.error('Erreur chargement tendances:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSymptomLabel = (symptom) => {
    const homeLabels = t?.home?.symptomLabels || {};
    const trendsLabels = t?.trends?.symptoms || {};
    return homeLabels[symptom] || trendsLabels[symptom] || symptom;
  };

  const tt = t?.trends || {};
  const isEn = (language || 'fr').toLowerCase().startsWith('en');
  const formatPeriodSubtitle = (template) => {
    if (!template) return '';
    return template.replace('{period}', String(period));
  };

  const chartConfig = {
    backgroundColor: COLORS.white,
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.white,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(232, 62, 115, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(74, 85, 104, ${opacity})`,
    style: {
      borderRadius: RADIUS.lg,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: COLORS.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: COLORS.gray[200],
      strokeWidth: 1,
    },
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

  const topSymptoms = Object.entries(data.symptomsData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .filter(([_, count]) => count > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tt?.title ?? 'Trends'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, period === 7 && styles.periodButtonActive]}
            onPress={() => setPeriod(7)}
          >
            <Text style={[styles.periodButtonText, period === 7 && styles.periodButtonTextActive]}>
              {tt?.period7days ?? '7 days'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, period === 30 && styles.periodButtonActive]}
            onPress={() => setPeriod(30)}
          >
            <Text style={[styles.periodButtonText, period === 30 && styles.periodButtonTextActive]}>
              {tt?.period30days ?? '30 days'}
            </Text>
          </TouchableOpacity>
        </View>

        {data.moodData.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color={COLORS.primary} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyStateTitle}>{tt?.noData ?? 'No data yet'}</Text>
            <Text style={styles.emptyStateText}>
              {tt?.noDataDescription ?? tt?.noDataSubtitle ?? 'Start recording your daily check-ins to see your trends'}
            </Text>
          </View>
        ) : (
          <>
            {/* MENQOL Score Card */}
            {data.menqolScore && data.menqolScore.globalScore > 0 && (
              <View style={styles.menqolSection}>
                <View style={styles.menqolHeader}>
                  <View style={styles.menqolTitleContainer}>
                    <Ionicons name="medical" size={24} color={COLORS.primary} />
                    <Text style={styles.menqolTitle}>{tt?.menqolScore ?? 'MENQOL Score'}</Text>
                  </View>
                  <View style={styles.menqolBadge}>
                    <Text style={styles.menqolBadgeText}>{tt?.menqolStandardized ?? 'Standardized'}</Text>
                  </View>
                </View>

                <View style={styles.menqolCard}>
                  <View style={styles.menqolScoreContainer}>
                    <Text style={styles.menqolScoreValue}>{data.menqolScore.globalScore}</Text>
                    <Text style={styles.menqolScoreMax}>/8</Text>
                  </View>
                  <Text style={styles.menqolInterpretation}>{data.menqolScore.interpretation}</Text>

                  <View style={styles.menqolDomains}>
                    {Object.entries(data.menqolScore.domains).map(([domain, data]) => {
                      const domainIcons = {
                        vasomotor: 'thermometer',
                        psychosocial: 'brain',
                        physical: 'body',
                        sexual: 'heart',
                      };
                      const domainLabels = tt?.menqolDomains || {
                        vasomotor: tt?.vasomotor,
                        psychosocial: tt?.psychosocial,
                        physical: tt?.physical,
                        sexual: tt?.sexual,
                      };
                      const severityColors = {
                        none: COLORS.gray[300],
                        mild: '#10B981',
                        moderate: '#F59E0B',
                        severe: '#F97316',
                        very_severe: '#EF4444',
                      };

                      if (data.score === 0) return null;

                      return (
                        <View key={domain} style={styles.menqolDomain}>
                          <View style={styles.menqolDomainHeader}>
                            <Ionicons name={domainIcons[domain]} size={16} color={severityColors[data.severity]} />
                            <Text style={styles.menqolDomainLabel}>{domainLabels?.[domain] ?? domain}</Text>
                          </View>
                          <View style={styles.menqolDomainScore}>
                            <View style={styles.menqolDomainBar}>
                              <View 
                                style={[
                                  styles.menqolDomainProgress,
                                  { 
                                    width: `${(data.score / 8) * 100}%`,
                                    backgroundColor: severityColors[data.severity],
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={[styles.menqolDomainValue, { color: severityColors[data.severity] }]}>
                              {data.score}/8
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.menqolRecommendation}>
                    <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                    <Text style={styles.menqolRecommendationText}>{data.menqolScore.recommendation}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Mood Chart */}
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>{tt?.mood ?? (isEn ? 'Mood' : 'Humeur')}</Text>
              <Text style={styles.chartSubtitle}>
                {formatPeriodSubtitle(tt?.moodSubtitle ?? (isEn ? 'Mood trend over {period} days' : 'Évolution de votre humeur sur {period} jours'))}
              </Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: data.labels,
                    datasets: [{
                      data: data.moodData,
                    }],
                  }}
                  width={width - (SPACING.xl * 2)}
                  height={200}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withDots={true}
                  withShadow={false}
                  fromZero
                  segments={5}
                />
              </View>
            </View>

            {/* Sleep Chart */}
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>{tt?.sleep ?? (isEn ? 'Sleep' : 'Sommeil')}</Text>
              <Text style={styles.chartSubtitle}>
                {formatPeriodSubtitle(tt?.sleepSubtitle ?? (isEn ? 'Sleep quality over {period} days' : 'Qualité de sommeil sur {period} jours'))}
              </Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: data.labels,
                    datasets: [{
                      data: data.sleepData,
                    }],
                  }}
                  width={width - (SPACING.xl * 2)}
                  height={200}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: COLORS.success,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withDots={true}
                  withShadow={false}
                  fromZero
                  segments={5}
                />
              </View>
            </View>

            {/* Symptoms Chart */}
            {topSymptoms.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>{tt?.topSymptoms ?? (isEn ? 'Most frequent symptoms' : 'Symptômes les plus fréquents')}</Text>
                <Text style={styles.chartSubtitle}>
                  {formatPeriodSubtitle(tt?.symptomsSubtitle ?? (isEn ? 'Number of occurrences over {period} days' : "Nombre d'occurrences sur {period} jours"))}
                </Text>
                <View style={styles.chartContainer}>
                  <BarChart
                    data={{
                      labels: topSymptoms.map(([symptom]) => getSymptomLabel(symptom)),
                      datasets: [{
                        data: topSymptoms.map(([_, count]) => count),
                      }],
                    }}
                    width={width - (SPACING.xl * 2)}
                    height={220}
                    chartConfig={chartConfig}
                    style={styles.chart}
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    fromZero
                    showValuesOnTopOfBars={true}
                    withInnerLines={false}
                  />
                </View>
              </View>
            )}

            {/* Insights */}
            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>{tt?.observations ?? (isEn ? 'Observations' : 'Observations')}</Text>
              
              <View style={styles.insightCard}>
                <View style={styles.insightIcon}>
                  <Ionicons name="trending-up" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>{tt?.averageMood ?? (isEn ? 'Average mood' : 'Humeur moyenne')}</Text>
                  <Text style={styles.insightValue}>
                    {(data.moodData.reduce((a, b) => a + b, 0) / data.moodData.length).toFixed(1)}/5
                  </Text>
                </View>
              </View>

              <View style={styles.insightCard}>
                <View style={styles.insightIcon}>
                  <Ionicons name="moon" size={20} color={COLORS.success} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>{tt?.averageSleep ?? (isEn ? 'Average sleep' : 'Sommeil moyen')}</Text>
                  <Text style={styles.insightValue}>
                    {(data.sleepData.reduce((a, b) => a + b, 0) / data.sleepData.length).toFixed(1)}/10
                  </Text>
                </View>
              </View>

              {topSymptoms.length > 0 && (
                <View style={styles.insightCard}>
                  <View style={styles.insightIcon}>
                    <Ionicons name="pulse" size={20} color={COLORS.warning} />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{tt?.mainSymptom ?? (isEn ? 'Main symptom' : 'Symptôme principal')}</Text>
                    <Text style={styles.insightValue}>
                      {getSymptomLabel(topSymptoms[0][0])} ({topSymptoms[0][1]} {tt?.days ?? (isEn ? 'days' : 'jours')})
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading.italic,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: 15,
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
  },
  periodButtonTextActive: {
    color: COLORS.white,
  },
  chartSection: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading.italic,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  chartSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chart: {
    borderRadius: RADIUS.md,
  },
  insightsSection: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading.italic,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    letterSpacing: -0.3,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    fontFamily: FONTS.body.medium,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightValue: {
    fontSize: 18,
    fontFamily: FONTS.heading.regular,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading.italic,
    color: COLORS.text,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    letterSpacing: -0.3,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // MENQOL Styles
  menqolSection: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  menqolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  menqolTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menqolTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading.italic,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  menqolBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  menqolBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.body.bold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menqolCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  menqolScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  menqolScoreValue: {
    fontSize: 56,
    fontFamily: FONTS.heading.regular,
    color: COLORS.primary,
    letterSpacing: -2,
  },
  menqolScoreMax: {
    fontSize: 24,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  menqolInterpretation: {
    fontSize: 15,
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  menqolDomains: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  menqolDomain: {
    gap: SPACING.xs,
  },
  menqolDomainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  menqolDomainLabel: {
    fontSize: 13,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
  },
  menqolDomainScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menqolDomainBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.gray[200],
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  menqolDomainProgress: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  menqolDomainValue: {
    fontSize: 13,
    fontFamily: FONTS.body.bold,
    minWidth: 35,
    textAlign: 'right',
  },
  menqolRecommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  menqolRecommendationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
    lineHeight: 18,
  },
});
