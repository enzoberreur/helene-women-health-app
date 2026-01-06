import React, { useState, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { LanguageContext } from '../../App';

const { width } = Dimensions.get('window');

export default function OnboardingRolesScreen({ navigation }) {
  const context = useContext(LanguageContext) || {};
  const t = context.t || {};

  const [currentIndex, setCurrentIndex] = useState(0);

  const roles = useMemo(() => {
    const tr = t?.onboarding?.roles || {};

    return [
      {
        id: 1,
        icon: 'search',
        title: tr?.interpreter?.title ?? "L'Interprète",
        subtitle: tr?.interpreter?.subtitle ?? 'Comprendre ce qui se passe',
        description:
          tr?.interpreter?.description ??
          "Hélène analyse vos symptômes et vous aide à comprendre les changements de votre corps avec des explications claires et personnalisées.",
        example:
          tr?.interpreter?.example ??
          '"Vous ressentez des bouffées de chaleur ? Hélène vous explique pourquoi elles surviennent et comment les gérer au quotidien."',
        color: COLORS.primary,
      },
      {
        id: 2,
        icon: 'book',
        title: tr?.storyteller?.title ?? 'La Conteuse',
        subtitle: tr?.storyteller?.subtitle ?? 'Voir votre histoire se dessiner',
        description:
          tr?.storyteller?.description ??
          "Hélène visualise votre parcours à travers des graphiques et des insights, révélant les patterns et tendances de votre bien-être.",
        example:
          tr?.storyteller?.example ??
          '"Découvrez que votre humeur s\'améliore les jours où vous dormez mieux, grâce aux graphiques et insights personnalisés."',
        color: '#8B5CF6',
      },
      {
        id: 3,
        icon: 'heart',
        title: tr?.companion?.title ?? 'La Compagne',
        subtitle: tr?.companion?.subtitle ?? 'Un soutien au quotidien',
        description:
          tr?.companion?.description ??
          "Hélène est là pour vous écouter, vous conseiller et vous accompagner avec bienveillance à chaque étape de votre parcours.",
        example:
          tr?.companion?.example ??
          '"Discutez librement avec Hélène de vos préoccupations, elle vous écoute et vous conseille avec empathie."',
        color: '#10B981',
      },
    ];
  }, [t]);

  const currentRole = roles[currentIndex];
  const exampleTitle = t?.onboarding?.roles?.exampleTitle ?? 'Par exemple';
  const backLabel = t?.common?.back ?? 'Retour';
  const nextLabel = t?.onboarding?.next ?? 'Suivant';
  const continueLabel = t?.onboarding?.continue ?? 'Continuer';
  const skipLabel = t?.onboarding?.welcome?.skipIntro ?? "Passer l'introduction";

  const handleNext = () => {
    if (currentIndex < roles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.navigate('onboardingValue');
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          {roles.map((role, index) => (
            <View
              key={role.id}
              style={[
                styles.progressDot,
                index === currentIndex && styles.progressDotActive,
                index < currentIndex && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>

        {/* Main Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.roleCard}>
            <View style={[styles.iconCircle, { backgroundColor: currentRole.color + '20' }]}>
              <Ionicons name={currentRole.icon} size={48} color={currentRole.color} />
            </View>

            <Text style={styles.roleTitle}>{currentRole.title}</Text>
            <Text style={styles.roleSubtitle}>{currentRole.subtitle}</Text>

            <View style={styles.divider} />

            <Text style={styles.roleDescription}>{currentRole.description}</Text>
          </View>

          {/* Example Card */}
          <View style={styles.exampleCard}>
            <View style={styles.exampleHeader}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.exampleTitle}>{exampleTitle}</Text>
            </View>

            <Text style={styles.exampleText}>{currentRole?.example ?? ''}</Text>
          </View>
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentIndex > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
              <Text style={styles.backText}>{backLabel}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, currentIndex === 0 && styles.nextButtonFull]}
            onPress={handleNext}
          >
            <Text style={styles.nextText}>
              {currentIndex === roles.length - 1 ? continueLabel : nextLabel}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('signup')}
        >
          <Text style={styles.skipText}>{skipLabel}</Text>
        </TouchableOpacity>
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
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray[300],
  },
  progressDotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  progressDotCompleted: {
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.lg,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  roleTitle: {
    fontSize: 32,
    fontFamily: FONTS.heading.italic,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  roleSubtitle: {
    fontSize: 16,
    fontFamily: FONTS.body.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  roleDescription: {
    fontSize: 16,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
    lineHeight: 24,
    textAlign: 'center',
  },
  exampleCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  exampleTitle: {
    fontSize: 14,
    fontFamily: FONTS.body.semibold,
    color: COLORS.primary,
  },
  exampleText: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  navigation: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    gap: SPACING.xs,
  },
  backText: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: SPACING.xs,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextText: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  skipText: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
  },
});
