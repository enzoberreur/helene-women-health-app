import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { analyzeTrends } from '../utils/sentimentAnalysis';
import { LanguageContext } from '../../App';

export default function EmotionalJournalScreen({ navigation, user }) {
  const { t, language } = useContext(LanguageContext);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [trends, setTrends] = useState(null);

  const tj = t?.journal || {};
  const isEn = (language || 'fr').toLowerCase().startsWith('en');

  useEffect(() => {
    loadJournal();
  }, []);

  const loadJournal = async () => {
    try {
      setLoading(true);

      // Charger les 30 derniers jours avec notes
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
        .not('notes', 'is', null)
        .order('log_date', { ascending: false });

      if (error) throw error;

      setLogs(data || []);
      
      // Analyser les tendances
      if (data && data.length > 0) {
        const trendsAnalysis = analyzeTrends(data);
        setTrends(trendsAnalysis);
      }
    } catch (error) {
      console.error('Erreur chargement journal:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return '#48BB78';
      case 'negative':
        return '#F56565';
      default:
        return COLORS.gray[400];
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return { name: 'trending-up', color: '#48BB78' };
      case 'declining':
        return { name: 'trending-down', color: '#F56565' };
      default:
        return { name: 'remove', color: COLORS.gray[400] };
    }
  };

  const getTrendMessage = (trend) => {
    switch (trend) {
      case 'improving':
        return tj?.trendMessages?.improving ?? (isEn ? '📈 Your emotional well-being is improving!' : '📈 Votre bien-être émotionnel s\'améliore !');
      case 'declining':
        return tj?.trendMessages?.declining ?? (isEn ? "📉 Take care of yourself—consider talking to someone you trust." : '📉 Prenez soin de vous, n\'hésitez pas à en parler.');
      default:
        return tj?.trendMessages?.stable ?? (isEn ? '➡️ Your emotional well-being is stable.' : '➡️ Votre bien-être émotionnel est stable.');
    }
  };

  const getSentimentLabel = (sentiment) => {
    const labels = tj?.sentimentLabels || {};
    if (sentiment === 'positive') return labels.positive ?? (isEn ? 'Positive' : 'Positif');
    if (sentiment === 'negative') return labels.negative ?? (isEn ? 'Tough' : 'Difficile');
    return labels.neutral ?? (isEn ? 'Neutral' : 'Neutre');
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tj?.title ?? (isEn ? 'Emotional Journal' : 'Journal Émotionnel')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {trends && (
          <View style={styles.trendsSection}>
            <Text style={styles.sectionTitle}>{tj?.analysisLast30Days ?? (isEn ? 'Analysis of the last 30 days' : 'Analyse des 30 derniers jours')}</Text>

            {/* Tendance générale */}
            <View style={styles.trendCard}>
              <View style={styles.trendHeader}>
                <Ionicons 
                  name={getTrendIcon(trends.trend).name}
                  size={32}
                  color={getTrendIcon(trends.trend).color}
                />
                <Text style={styles.trendMessage}>{getTrendMessage(trends.trend)}</Text>
              </View>
            </View>

            {/* Statistiques */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: '#48BB78' }]}>
                <Text style={styles.statValue}>{trends.positiveCount}</Text>
                <Text style={styles.statLabel}>{tj?.stats?.positiveDays ?? (isEn ? 'Positive days' : 'Jours positifs')}</Text>
                <Text style={styles.statEmoji}>😊</Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: COLORS.gray[400] }]}>
                <Text style={styles.statValue}>{trends.neutralCount}</Text>
                <Text style={styles.statLabel}>{tj?.stats?.neutralDays ?? (isEn ? 'Neutral days' : 'Jours neutres')}</Text>
                <Text style={styles.statEmoji}>😐</Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#F56565' }]}>
                <Text style={styles.statValue}>{trends.negativeCount}</Text>
                <Text style={styles.statLabel}>{tj?.stats?.difficultDays ?? (isEn ? 'Tough days' : 'Jours difficiles')}</Text>
                <Text style={styles.statEmoji}>😕</Text>
              </View>
            </View>

            {/* Score moyen */}
            <View style={styles.averageCard}>
              <Text style={styles.averageLabel}>{tj?.averageScore ?? (isEn ? 'Average well-being score' : 'Score de bien-être moyen')}</Text>
              <View style={styles.averageBar}>
                <View 
                  style={[
                    styles.averageProgress, 
                    { 
                      width: `${((trends.averageSentiment + 1) / 2) * 100}%`,
                      backgroundColor: trends.averageSentiment > 0 ? '#48BB78' : '#F56565',
                    }
                  ]} 
                />
              </View>
              <Text style={styles.averageValue}>
                {trends.averageSentiment > 0 ? '+' : ''}{(trends.averageSentiment * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        )}

        {/* Entrées du journal */}
        <View style={styles.entriesSection}>
          <Text style={styles.sectionTitle}>{tj?.latestNotes ?? (isEn ? 'Your latest notes' : 'Vos dernières notes')}</Text>
          
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={64} color={COLORS.primary} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyStateTitle}>{tj?.emptyTitle ?? (isEn ? 'No notes yet' : 'Aucune note pour le moment')}</Text>
              <Text style={styles.emptyStateText}>
                {tj?.emptyDescription ?? (isEn ? 'Start writing how you feel during your daily check-ins' : 'Commencez à écrire vos ressentis lors de vos check-ins quotidiens')}
              </Text>
            </View>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryDateContainer}>
                    <Text style={styles.entryDate}>
                      {new Date(log.log_date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </Text>
                    {log.notes_sentiment_emoji && (
                      <Text style={styles.entryEmoji}>{log.notes_sentiment_emoji}</Text>
                    )}
                  </View>
                  {log.notes_sentiment && (
                    <View 
                      style={[
                        styles.sentimentBadge,
                        { backgroundColor: getSentimentColor(log.notes_sentiment) + '20' }
                      ]}
                    >
                      <View 
                        style={[
                          styles.sentimentDot,
                          { backgroundColor: getSentimentColor(log.notes_sentiment) }
                        ]} 
                      />
                      <Text 
                        style={[
                          styles.sentimentText,
                          { color: getSentimentColor(log.notes_sentiment) }
                        ]}
                      >
                        {getSentimentLabel(log.notes_sentiment)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.entryNotes}>{log.notes}</Text>
                
                {/* Indicateurs de santé */}
                <View style={styles.entryIndicators}>
                  <View style={styles.indicator}>
                    <Ionicons name="happy-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.indicatorText}>{(tj?.indicators?.mood ?? (isEn ? 'Mood' : 'Humeur'))}: {log.mood}/5</Text>
                  </View>
                  <View style={styles.indicator}>
                    <Ionicons name="moon-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.indicatorText}>{(tj?.indicators?.sleep ?? (isEn ? 'Sleep' : 'Sommeil'))}: {log.sleep_quality}/10</Text>
                  </View>
                  <View style={styles.indicator}>
                    <Ionicons name="flash-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.indicatorText}>{(tj?.indicators?.energy ?? (isEn ? 'Energy' : 'Énergie'))}: {log.energy_level}/5</Text>
                  </View>
                </View>
              </View>
            ))
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  trendsSection: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading.regular,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  trendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  trendMessage: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderLeftWidth: 3,
  },
  statValue: {
    fontSize: 28,
    fontFamily: FONTS.heading.regular,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  statEmoji: {
    fontSize: 24,
  },
  averageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
  },
  averageLabel: {
    fontSize: 14,
    fontFamily: FONTS.body.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  averageBar: {
    height: 12,
    backgroundColor: COLORS.gray[200],
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  averageProgress: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  averageValue: {
    fontSize: 18,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    textAlign: 'center',
  },
  entriesSection: {
    padding: SPACING.lg,
    paddingTop: 0,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  entryDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  entryDate: {
    fontSize: 14,
    fontFamily: FONTS.body.medium,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  entryEmoji: {
    fontSize: 20,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  sentimentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sentimentText: {
    fontSize: 12,
    fontFamily: FONTS.body.semibold,
  },
  entryNotes: {
    fontSize: 15,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  entryIndicators: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorText: {
    fontSize: 12,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.xl,
  },
});
