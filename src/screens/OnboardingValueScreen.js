import React, { useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { LanguageContext } from '../../App';

export default function OnboardingValueScreen({ navigation }) {
  const context = useContext(LanguageContext) || {};
  const t = context.t || {};

  const title = t?.onboarding?.value?.title ?? "Ce qu'Hélène vous apporte";
  const subtitle = t?.onboarding?.value?.subtitle ?? 'Un accompagnement complet pour votre bien-être';
  const trustTitle = t?.onboarding?.value?.trustTitle ?? 'Conçu avec soin';
  const trustText =
    t?.onboarding?.value?.trustText ??
    "Hélène a été créée en collaboration avec des professionnels de santé et des femmes traversant la ménopause pour vous offrir le meilleur accompagnement possible.";
  const ctaCreateAccount = t?.onboarding?.value?.ctaCreateAccount ?? (t?.onboarding?.createAccount ?? 'Créer mon compte');
  const backLabel = t?.common?.back ?? 'Retour';

  const valuePoints = useMemo(() => {
    const points = t?.onboarding?.value?.points || {};

    return [
      {
        id: 1,
        icon: 'calendar',
        title: points?.dailyTracking?.title ?? 'Suivi quotidien simple',
        description: points?.dailyTracking?.description ?? 'Notez vos symptômes en moins de 2 minutes par jour',
      },
      {
        id: 2,
        icon: 'trending-up',
        title: points?.clearCharts?.title ?? 'Visualisations claires',
        description: points?.clearCharts?.description ?? 'Comprenez vos tendances avec des graphiques intuitifs',
      },
      {
        id: 3,
        icon: 'chatbubbles',
        title: points?.conversationalAI?.title ?? 'IA conversationnelle',
        description: points?.conversationalAI?.description ?? 'Posez vos questions et obtenez des réponses personnalisées',
      },
      {
        id: 4,
        icon: 'document-text',
        title: points?.medicalReports?.title ?? 'Rapports médicaux',
        description: points?.medicalReports?.description ?? 'Générez des PDF à partager avec votre médecin',
      },
      {
        id: 5,
        icon: 'bulb',
        title: points?.automaticInsights?.title ?? 'Insights automatiques',
        description: points?.automaticInsights?.description ?? 'Recevez des analyses hebdomadaires de votre bien-être',
      },
      {
        id: 6,
        icon: 'shield-checkmark',
        title: points?.privacy?.title ?? 'Confidentialité totale',
        description: points?.privacy?.description ?? 'Vos données sont sécurisées et ne sont jamais partagées',
      },
    ];
  }, [t]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Value Points */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.valueGrid}>
            {valuePoints.map((point) => (
              <View key={point.id} style={styles.valueCard}>
                <View style={styles.iconContainer}>
                  <Ionicons name={point.icon} size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.valueTitle}>{point.title}</Text>
                <Text style={styles.valueDescription}>{point.description}</Text>
              </View>
            ))}
          </View>

          {/* Trust Section */}
          <View style={styles.trustSection}>
            <View style={styles.trustHeader}>
              <Ionicons name="heart" size={20} color={COLORS.primary} />
              <Text style={styles.trustTitle}>{trustTitle}</Text>
            </View>
            <Text style={styles.trustText}>{trustText}</Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('signup')}
          >
            <Text style={styles.buttonText}>{ctaCreateAccount}</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            <Text style={styles.backText}>{backLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.heading.regular,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.lg,
  },
  valueGrid: {
    gap: SPACING.md,
  },
  valueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  valueTitle: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  valueDescription: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  trustSection: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  trustTitle: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
  },
  trustText: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    marginTop: SPACING.lg,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  backText: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
  },
});
