import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function SignUpScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [menopauseStage, setMenopauseStage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const capitalizeName = (text) => {
    return text
      .toLowerCase()
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('-');
  };

  const handleNameChange = (text) => {
    setName(capitalizeName(text));
  };

  const animateProgress = (toStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: toStep,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setStep(toStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    if (step < totalSteps) {
      animateProgress(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      animateProgress(step - 1);
    }
  };

  const handleSignUp = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Créer le compte avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // 2. Attendre que le trigger crée le profil de base, puis le mettre à jour
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Mettre à jour le profil avec les informations complètes
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          birth_year: parseInt(birthYear),
          menopause_stage: menopauseStage,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Erreur mise à jour profil:', profileError);
        // Ne pas bloquer si la mise à jour échoue
      }

      // Succès! Rediriger vers l'app
      console.log('Compte créé avec succès!', authData.user);
      // La redirection se fera automatiquement via onAuthStateChange
      
    } catch (error) {
      setError(error.message);
      console.error('Erreur inscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = () => {
    Alert.alert(
      'Bientôt disponible',
      'La connexion avec Apple arrive dans une prochaine mise à jour.',
      [{ text: 'OK' }]
    );
  };

  const handleGoogleSignUp = () => {
    Alert.alert(
      'Bientôt disponible',
      'La connexion avec Google arrive dans une prochaine mise à jour.',
      [{ text: 'OK' }]
    );
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, totalSteps],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={step === 1 ? () => navigation.goBack() : handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
            </TouchableOpacity>
            <Text style={styles.stepText}>Étape {step}/{totalSteps}</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  { width: progressWidth }
                ]} 
              />
            </View>
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
              {/* Step 1: Prénom */}
              {step === 1 && (
                <View style={styles.stepContent}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>Bienvenue</Text>
                    <Text style={styles.subtitle}>
                      Choisissez votre mode d'inscription
                    </Text>
                  </View>

                  <View style={styles.socialButtonsContainer}>
                    <TouchableOpacity 
                      style={styles.socialButtonLarge} 
                      activeOpacity={0.8}
                      onPress={handleAppleSignUp}
                      disabled={loading}
                    >
                      <Ionicons name="logo-apple" size={24} color={COLORS.white} />
                      <Text style={styles.socialButtonLargeText}>Continuer avec Apple</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.socialButtonLargeOutline} 
                      activeOpacity={0.8}
                      onPress={handleGoogleSignUp}
                      disabled={loading}
                    >
                      <Ionicons name="logo-google" size={24} color={COLORS.secondary} />
                      <Text style={styles.socialButtonLargeTextOutline}>Continuer avec Google</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>ou par email</Text>
                    <View style={styles.divider} />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Prénom</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Entrez votre prénom"
                      placeholderTextColor={COLORS.gray[300]}
                      value={name}
                      onChangeText={handleNameChange}
                      autoCapitalize="words"
                      autoFocus={false}
                    />
                  </View>
                </View>
              )}

              {/* Step 2: Email & Password */}
              {step === 2 && (
                <View style={styles.stepContent}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>Votre compte</Text>
                    <Text style={styles.subtitle}>
                      Sécurisez votre espace personnel
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="exemple@email.com"
                      placeholderTextColor={COLORS.gray[300]}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Mot de passe</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Minimum 8 caractères"
                        placeholderTextColor={COLORS.gray[300]}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity 
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                      >
                        <Ionicons 
                          name={showPassword ? "eye-off-outline" : "eye-outline"} 
                          size={22} 
                          color={COLORS.gray[400]} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Step 3: Année de naissance */}
              {step === 3 && (
                <View style={styles.stepContent}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>À propos de vous</Text>
                    <Text style={styles.subtitle}>
                      Pour personnaliser votre accompagnement
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Année de naissance</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: 1975"
                      placeholderTextColor={COLORS.gray[300]}
                      value={birthYear}
                      onChangeText={setBirthYear}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                    <Text style={styles.helperText}>
                      Pour adapter nos conseils à votre étape de vie
                    </Text>
                  </View>
                </View>
              )}

              {/* Step 4: Stade de ménopause */}
              {step === 4 && (
                <View style={styles.stepContent}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>Votre parcours</Text>
                    <Text style={styles.subtitle}>
                      Où en êtes-vous de votre ménopause ?
                    </Text>
                  </View>

                  <View style={styles.optionsContainer}>
                    <TouchableOpacity 
                      style={[
                        styles.optionCard, 
                        menopauseStage === 'peri' && styles.optionCardSelected
                      ]}
                      onPress={() => setMenopauseStage('peri')}
                    >
                      <View style={styles.optionHeader}>
                        <Text style={[
                          styles.optionTitle,
                          menopauseStage === 'peri' && styles.optionTitleSelected
                        ]}>
                          Périménopause
                        </Text>
                        {menopauseStage === 'peri' && (
                          <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                        )}
                      </View>
                      <Text style={styles.optionDescription}>
                        Cycles irréguliers, premiers symptômes
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[
                        styles.optionCard, 
                        menopauseStage === 'meno' && styles.optionCardSelected
                      ]}
                      onPress={() => setMenopauseStage('meno')}
                    >
                      <View style={styles.optionHeader}>
                        <Text style={[
                          styles.optionTitle,
                          menopauseStage === 'meno' && styles.optionTitleSelected
                        ]}>
                          Ménopause
                        </Text>
                        {menopauseStage === 'meno' && (
                          <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                        )}
                      </View>
                      <Text style={styles.optionDescription}>
                        Absence de règles depuis 12 mois
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[
                        styles.optionCard, 
                        menopauseStage === 'post' && styles.optionCardSelected
                      ]}
                      onPress={() => setMenopauseStage('post')}
                    >
                      <View style={styles.optionHeader}>
                        <Text style={[
                          styles.optionTitle,
                          menopauseStage === 'post' && styles.optionTitleSelected
                        ]}>
                          Post-ménopause
                        </Text>
                        {menopauseStage === 'post' && (
                          <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                        )}
                      </View>
                      <Text style={styles.optionDescription}>
                        Plusieurs années après la ménopause
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[
                        styles.optionCard, 
                        menopauseStage === 'unsure' && styles.optionCardSelected
                      ]}
                      onPress={() => setMenopauseStage('unsure')}
                    >
                      <View style={styles.optionHeader}>
                        <Text style={[
                          styles.optionTitle,
                          menopauseStage === 'unsure' && styles.optionTitleSelected
                        ]}>
                          Je ne sais pas
                        </Text>
                        {menopauseStage === 'unsure' && (
                          <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                        )}
                      </View>
                      <Text style={styles.optionDescription}>
                        Nous vous aiderons à le déterminer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Action Button */}
          <View style={styles.buttonContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            <TouchableOpacity 
              style={[
                styles.continueButton,
                ((step === 1 && !name) || 
                 (step === 2 && (!email || !password)) || 
                 (step === 3 && !birthYear) ||
                 (step === 4 && !menopauseStage) ||
                 loading)
                  ? styles.buttonDisabled 
                  : {}
              ]}
              activeOpacity={0.8}
              onPress={step === totalSteps ? handleSignUp : handleNext}
              disabled={
                (step === 1 && !name) || 
                (step === 2 && (!email || !password)) || 
                (step === 3 && !birthYear) ||
                (step === 4 && !menopauseStage) ||
                loading
              }
            >
              {loading ? (
                <Text style={styles.continueButtonText}>Création du compte...</Text>
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {step === totalSteps ? 'Créer mon compte' : 'Continuer'}
                  </Text>
                  <Ionicons 
                    name={step === totalSteps ? "checkmark" : "arrow-forward"} 
                    size={20} 
                    color={COLORS.white} 
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  backButton: {
    padding: SPACING.sm,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.gray[500],
    fontWeight: '500',
  },
  placeholder: {
    width: 40,
  },
  progressBarContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: COLORS.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  formContainer: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingTop: SPACING.lg,
  },
  titleContainer: {
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Times New Roman',
    fontStyle: 'italic',
    color: COLORS.secondary,
    fontWeight: '400',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray[500],
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 15,
    color: COLORS.secondary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  helperText: {
    fontSize: 13,
    color: COLORS.gray[400],
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 0,
    borderRadius: 14,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    fontSize: 16,
    color: COLORS.secondary,
  },
  optionsContainer: {
    gap: SPACING.md,
  },
  optionCard: {
    backgroundColor: '#F5F5F5',
    padding: SPACING.lg,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: `${COLORS.primary}08`,
    borderColor: COLORS.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  optionTitleSelected: {
    color: COLORS.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.gray[500],
    lineHeight: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg + 4,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray[200],
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: 13,
    color: COLORS.gray[400],
  },
  socialButtonsContainer: {
    gap: SPACING.sm + 4,
    marginBottom: SPACING.md,
  },
  socialButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.md + 4,
    borderRadius: 14,
    gap: SPACING.sm + 4,
  },
  socialButtonLargeText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  socialButtonLargeOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
    paddingVertical: SPACING.md + 4,
    borderRadius: 14,
    gap: SPACING.sm + 4,
  },
  socialButtonLargeTextOutline: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    fontSize: 16,
    color: COLORS.secondary,
  },
  eyeIcon: {
    paddingHorizontal: SPACING.md,
  },
  buttonContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
