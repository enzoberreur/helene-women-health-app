import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { LanguageContext } from '../../App';

export default function OnboardingWelcomeScreen({ navigation }) {
  const context = useContext(LanguageContext) || {};
  const t = context.t || {};

  const title = t?.onboarding?.welcome?.title ?? 'Welcome';
  const featureUnderstand = t?.onboarding?.welcome?.featureUnderstand ?? '';
  const featureTrack = t?.onboarding?.welcome?.featureTrack ?? '';
  const featureShare = t?.onboarding?.welcome?.featureShare ?? '';
  const startLabel = t?.onboarding?.start ?? 'Get started';
  const skipLabel = t?.onboarding?.welcome?.skipIntro ?? 'Skip';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.featuresContainer}>
            {!!featureUnderstand && (
              <View style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{featureUnderstand}</Text>
              </View>
            )}
            {!!featureTrack && (
              <View style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{featureTrack}</Text>
              </View>
            )}
            {!!featureShare && (
              <View style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{featureShare}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('onboardingRoles')}
          >
            <Text style={styles.buttonText}>{startLabel}</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.navigate('signup')}
          >
            <Text style={styles.skipText}>{skipLabel}</Text>
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
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.heading.regular,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 40,
  },
  featuresContainer: {
    width: '100%',
    paddingHorizontal: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.md,
  },
  featureText: {
    fontSize: 16,
    fontFamily: FONTS.body.medium,
    color: COLORS.textSecondary,
  },
  footer: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: COLORS.white,
    marginRight: SPACING.sm,
  },
  skipButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
  },
});
