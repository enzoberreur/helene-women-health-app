import React, { useState, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { LanguageContext } from '../../App';

export default function OnboardingScreen({ navigation }) {
  const { t } = useContext(LanguageContext);

// Phase 1: Données de base
const MENOPAUSE_STAGES = [
  { id: 'pre', label: t.onboarding.step1.stages.pre.label, description: t.onboarding.step1.stages.pre.description },
  { id: 'peri', label: t.onboarding.step1.stages.peri.label, description: t.onboarding.step1.stages.peri.description },
  { id: 'meno', label: t.onboarding.step1.stages.meno.label, description: t.onboarding.step1.stages.meno.description },
  { id: 'post', label: t.onboarding.step1.stages.post.label, description: t.onboarding.step1.stages.post.description },
];

// Phase 2: Conditions médicales
const MEDICAL_CONDITIONS = [
  { id: 'cancer', label: t.onboarding.step2.medicalConditions.cancer },
  { id: 'cardiovascular', label: t.onboarding.step2.medicalConditions.cardiovascular },
  { id: 'diabetes', label: t.onboarding.step2.medicalConditions.diabetes },
  { id: 'thyroid', label: t.onboarding.step2.medicalConditions.thyroid },
  { id: 'osteoporosis', label: t.onboarding.step2.medicalConditions.osteoporosis },
  { id: 'mental_health', label: t.onboarding.step2.medicalConditions.mental_health },
  { id: 'migraines', label: t.onboarding.step2.medicalConditions.migraines },
  { id: 'none', label: t.onboarding.step2.medicalConditions.none },
];

// Phase 3: Symptômes détaillés avec échelle MRS
const PHYSICAL_SYMPTOMS = [
  { id: 'hot_flashes', label: t.onboarding.step3.symptoms.hot_flashes },
  { id: 'sleep_issues', label: t.onboarding.step3.symptoms.sleep_issues },
  { id: 'joint_pain', label: t.onboarding.step3.symptoms.joint_pain },
  { id: 'fatigue', label: t.onboarding.step3.symptoms.fatigue },
  { id: 'weight_gain', label: t.onboarding.step3.symptoms.weight_gain },
  { id: 'vaginal_dryness', label: t.onboarding.step3.symptoms.vaginal_dryness },
  { id: 'headaches', label: t.onboarding.step3.symptoms.headaches },
];

const MENTAL_SYMPTOMS = [
  { id: 'anxiety', label: t.onboarding.step3.symptoms.anxiety },
  { id: 'depression', label: t.onboarding.step3.symptoms.depression },
  { id: 'mood_swings', label: t.onboarding.step3.symptoms.mood_swings },
  { id: 'brain_fog', label: t.onboarding.step3.symptoms.brain_fog },
  { id: 'low_libido', label: t.onboarding.step3.symptoms.low_libido },
];

const CYCLE_SYMPTOMS = [
  { id: 'irregular_cycles', label: t.onboarding.step3.symptoms.irregular_cycles },
  { id: 'heavy_flow', label: t.onboarding.step3.symptoms.heavy_flow },
  { id: 'light_flow', label: t.onboarding.step3.symptoms.light_flow },
  { id: 'spotting', label: t.onboarding.step3.symptoms.spotting },
];

// Phase 4: Objectifs
const USER_GOALS = [
  { id: 'track_symptoms', label: t.onboarding.step4.goals.track_symptoms },
  { id: 'prepare_appointments', label: t.onboarding.step4.goals.prepare_appointments },
  { id: 'learn', label: t.onboarding.step4.goals.learn },
  { id: 'manage_treatment', label: t.onboarding.step4.goals.manage_treatment },
  { id: 'mental_wellbeing', label: t.onboarding.step4.goals.mental_wellbeing },
  { id: 'lifestyle_tips', label: t.onboarding.step4.goals.lifestyle_tips },
  { id: 'community', label: t.onboarding.step4.goals.community },
  { id: 'track_medications', label: t.onboarding.step4.goals.track_medications },
];

// Phase 5: Appareils connectés
const CONNECTED_DEVICES = [
  { id: 'apple_watch', label: t.onboarding.step5.devices.apple_watch },
  { id: 'fitbit', label: t.onboarding.step5.devices.fitbit },
  { id: 'oura', label: t.onboarding.step5.devices.oura },
  { id: 'garmin', label: t.onboarding.step5.devices.garmin },
  { id: 'other', label: t.onboarding.step5.devices.other },
  { id: 'none', label: t.onboarding.step5.devices.none },
];

const NOTIFICATION_FREQUENCY = [
  { id: 'daily', label: t.onboarding.step5.frequency.daily },
  { id: 'weekly', label: t.onboarding.step5.frequency.weekly },
  { id: 'monthly', label: t.onboarding.step5.frequency.monthly },
  { id: 'never', label: t.onboarding.step5.frequency.never },
];

const NOTIFICATION_TIMING = [
  { id: 'morning', label: t.onboarding.step5.timing.morning.label, time: t.onboarding.step5.timing.morning.time },
  { id: 'noon', label: t.onboarding.step5.timing.noon.label, time: t.onboarding.step5.timing.noon.time },
  { id: 'evening', label: t.onboarding.step5.timing.evening.label, time: t.onboarding.step5.timing.evening.time },
];
  const [step, setStep] = useState(0); // 0 = email/password, 1-6 = phases
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Authentication
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phase 1: Informations de base
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [menopauseStage, setMenopauseStage] = useState('');

  // Phase 2: Historique médical
  const [usesContraception, setUsesContraception] = useState(null);
  const [contraceptionType, setContraceptionType] = useState('');
  const [hadHRT, setHadHRT] = useState(null);
  const [hrtDetails, setHrtDetails] = useState('');
  const [menarcheAge, setMenarcheAge] = useState('');
  const [medicalConditions, setMedicalConditions] = useState([]);
  const [otherCondition, setOtherCondition] = useState('');

  // Phase 3: Symptômes
  const [physicalSymptoms, setPhysicalSymptoms] = useState({});
  const [mentalSymptoms, setMentalSymptoms] = useState({});
  const [cycleSymptoms, setCycleSymptoms] = useState({});

  // Phase 4: Objectifs
  const [goals, setGoals] = useState([]);

  // Phase 5: Préférences
  const [notificationFrequency, setNotificationFrequency] = useState('');
  const [notificationTiming, setNotificationTiming] = useState('');
  const [notificationTypes, setNotificationTypes] = useState({
    symptoms: false,
    tips: false,
    education: false,
    health_alerts: false,
  });
  const [medications, setMedications] = useState('');
  const [supplements, setSupplements] = useState('');
  const [connectedDevice, setConnectedDevice] = useState('');
  const [syncData, setSyncData] = useState(false);

  // Phase 6: Consentement
  const [consentData, setConsentData] = useState(false);
  const [consentShare, setConsentShare] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const totalSteps = 7; // 0 (auth) + 6 phases

  const toggleMedicalCondition = (conditionId) => {
    if (conditionId === 'none') {
      setMedicalConditions(['none']);
    } else {
      const filtered = medicalConditions.filter(id => id !== 'none');
      if (filtered.includes(conditionId)) {
        setMedicalConditions(filtered.filter(id => id !== conditionId));
      } else {
        setMedicalConditions([...filtered, conditionId]);
      }
    }
  };

  const toggleSymptom = (symptomId, category) => {
    const categoryMap = {
      physical: [physicalSymptoms, setPhysicalSymptoms],
      mental: [mentalSymptoms, setMentalSymptoms],
      cycle: [cycleSymptoms, setCycleSymptoms],
    };
    const [symptoms, setSymptoms] = categoryMap[category];
    
    if (symptoms[symptomId]) {
      const newSymptoms = { ...symptoms };
      delete newSymptoms[symptomId];
      setSymptoms(newSymptoms);
    } else {
      setSymptoms({ ...symptoms, [symptomId]: 1 });
    }
  };

  const updateSymptomIntensity = (symptomId, intensity, category) => {
    const categoryMap = {
      physical: [physicalSymptoms, setPhysicalSymptoms],
      mental: [mentalSymptoms, setMentalSymptoms],
      cycle: [cycleSymptoms, setCycleSymptoms],
    };
    const [symptoms, setSymptoms] = categoryMap[category];
    setSymptoms({ ...symptoms, [symptomId]: intensity });
  };

  const toggleGoal = (goalId) => {
    if (goals.includes(goalId)) {
      setGoals(goals.filter(id => id !== goalId));
    } else {
      setGoals([...goals, goalId]);
    }
  };

  const toggleNotificationType = (type) => {
    setNotificationTypes({
      ...notificationTypes,
      [type]: !notificationTypes[type],
    });
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
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    setError('');
    animateProgress(step + 1);
  };

  const handleBack = () => {
    if (step > 0) {
      animateProgress(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔄 Début de la création du compte...');

      // 1. Créer le compte
      console.log('📧 Email:', email.trim().toLowerCase());
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (authError) {
        console.error('❌ Erreur auth:', authError);
        throw authError;
      }

      console.log('✅ Compte créé:', authData.user?.id);
      console.log('📊 Session créée:', authData.session ? 'Oui ✅' : 'Non ❌');

      // Si pas de session, il faut se connecter manuellement
      if (!authData.session) {
        console.log('🔑 Connexion manuelle nécessaire...');
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });
        if (signInError) throw signInError;
        console.log('✅ Connexion réussie');
      }

      // 2. Attendre que le trigger crée le profil de base
      console.log('⏳ Attente du trigger...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Augmenté à 2 secondes

      // 3. Calculer l'IMC
      const bmi = weight && height ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1) : null;

      // 4. Mettre à jour le profil avec toutes les données
      console.log('📝 Mise à jour du profil...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          // Phase 1
          age: parseInt(age),
          weight: parseFloat(weight),
          height: parseFloat(height),
          bmi: bmi,
          menopause_stage: menopauseStage,
          
          // Phase 2
          uses_contraception: usesContraception,
          contraception_type: contraceptionType,
          had_hrt: hadHRT,
          hrt_details: hrtDetails,
          menarche_age: menarcheAge ? parseInt(menarcheAge) : null,
          medical_conditions: medicalConditions,
          other_condition: otherCondition,
          
          // Phase 3
          physical_symptoms: physicalSymptoms,
          mental_symptoms: mentalSymptoms,
          cycle_symptoms: cycleSymptoms,
          
          // Phase 4
          goals: goals,
          
          // Phase 5
          notification_frequency: notificationFrequency,
          notification_timing: notificationTiming,
          notification_types: notificationTypes,
          medications: medications,
          supplements: supplements,
          connected_device: connectedDevice,
          sync_data: syncData,
          
          // Phase 6
          consent_data: consentData,
          consent_share: consentShare,
          
          updated_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('❌ Erreur profil:', profileError);
        throw profileError;
      }

      console.log('✅ Profil créé avec succès!', profileData);
      console.log('🎉 Inscription terminée, redirection en cours...');
      
      // Redirection manuelle immédiate - ne pas attendre l'Alert
      // Le listener onAuthStateChange devrait déjà avoir fait la redirection
      // mais on force ici au cas où
      setLoading(false);
      
      // Petit délai pour laisser le temps à React de mettre à jour
      setTimeout(() => {
        Alert.alert(
          t?.onboarding?.signupSuccess?.title ?? 'Compte créé !',
          t?.onboarding?.signupSuccess?.message ?? 'Bienvenue dans Hélène',
          [{ text: t?.common?.ok ?? 'OK' }]
        );
      }, 100);

    } catch (error) {
      console.error('❌ Erreur complète:', error);
      const errorMessage = error.message || 'Une erreur est survenue';
      setError(errorMessage);
      Alert.alert(
        t?.common?.error ?? 'Erreur',
        errorMessage,
        [{ text: t?.common?.ok ?? 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, totalSteps],
    outputRange: ['0%', '100%'],
  });

  // Validations par phase
  const canProceedStep0 = email && password && password.length >= 6;
  const canProceedStep1 = age && weight && height && menopauseStage;
  const canProceedStep2 = menarcheAge && medicalConditions.length > 0;
  const canProceedStep3 = Object.keys(physicalSymptoms).length > 0 || Object.keys(mentalSymptoms).length > 0 || Object.keys(cycleSymptoms).length > 0;
  const canProceedStep4 = goals.length > 0;
  const canProceedStep5 = notificationFrequency && notificationTiming;
  const canProceedStep6 = consentData && consentShare;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity 
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.stepText}>
              {step === 0 ? t.onboarding.createAccount : `${t.onboarding.step} ${step}/6`}
            </Text>
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
              {/* STEP 0: Email & Password */}
              {step === 0 && (
                <View style={styles.stepContent}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>{t.onboarding.step0.title}</Text>
                    <Text style={styles.subtitle}>
                      {t.onboarding.step0.subtitle}
                    </Text>
                  </View>

                  {error ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step0.email}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t.onboarding.step0.emailPlaceholder}
                      placeholderTextColor={COLORS.gray[300]}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step0.password}</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder={t.onboarding.step0.passwordPlaceholder}
                        placeholderTextColor={COLORS.gray[300]}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoComplete="password"
                      />
                      <TouchableOpacity 
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons 
                          name={showPassword ? "eye-off-outline" : "eye-outline"} 
                          size={22} 
                          color={COLORS.gray[400]} 
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.helperText}>
                      {t.onboarding.step0.passwordHelper}
                    </Text>
                  </View>
                </View>
              )}

              {/* PHASE 1: Informations de Base */}
              {step === 1 && (
                <View style={styles.stepContent}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>{t.onboarding.step1.title}</Text>
                    <Text style={styles.subtitle}>
                      {t.onboarding.step1.subtitle}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step1.age}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t.onboarding.step1.agePlaceholder}
                      placeholderTextColor={COLORS.gray[300]}
                      value={age}
                      onChangeText={setAge}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputContainer, styles.halfWidth]}>
                      <Text style={styles.label}>{t.onboarding.step1.weight}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={t.onboarding.step1.weightPlaceholder}
                        placeholderTextColor={COLORS.gray[300]}
                        value={weight}
                        onChangeText={setWeight}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={[styles.inputContainer, styles.halfWidth]}>
                      <Text style={styles.label}>{t.onboarding.step1.height}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={t.onboarding.step1.heightPlaceholder}
                        placeholderTextColor={COLORS.gray[300]}
                        value={height}
                        onChangeText={setHeight}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  {weight && height && (
                    <View style={styles.bmiContainer}>
                      <Text style={styles.bmiLabel}>{t.onboarding.step1.bmi}</Text>
                      <Text style={styles.bmiValue}>
                        {(parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step1.menopauseStage}</Text>
                    <View style={styles.optionsContainer}>
                      {MENOPAUSE_STAGES.map((stage) => (
                        <TouchableOpacity
                          key={stage.id}
                          style={[
                            styles.optionCard,
                            menopauseStage === stage.id && styles.optionCardSelected
                          ]}
                          onPress={() => setMenopauseStage(stage.id)}
                        >
                          <Text style={[
                            styles.optionTitle,
                            menopauseStage === stage.id && styles.optionTitleSelected
                          ]}>
                            {stage.label}
                          </Text>
                          <Text style={styles.optionDescription}>{stage.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* PHASE 2: Historique Médical */}
              {step === 2 && (
                <View style={styles.stepContent}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>{t.onboarding.step2.title}</Text>
                    <Text style={styles.subtitle}>
                      {t.onboarding.step2.subtitle}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step2.contraception}</Text>
                    <View style={styles.yesNoContainer}>
                      <TouchableOpacity
                        style={[styles.yesNoButton, usesContraception === true && styles.yesNoButtonSelected]}
                        onPress={() => setUsesContraception(true)}
                      >
                        <Text style={[styles.yesNoText, usesContraception === true && styles.yesNoTextSelected]}>{t.onboarding.step2.yes}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.yesNoButton, usesContraception === false && styles.yesNoButtonSelected]}
                        onPress={() => setUsesContraception(false)}
                      >
                        <Text style={[styles.yesNoText, usesContraception === false && styles.yesNoTextSelected]}>{t.onboarding.step2.no}</Text>
                      </TouchableOpacity>
                    </View>
                    {usesContraception === true && (
                      <TextInput
                        style={[styles.input, { marginTop: SPACING.sm }]}
                        placeholder={t.onboarding.step2.contraceptionPlaceholder}
                        placeholderTextColor={COLORS.gray[300]}
                        value={contraceptionType}
                        onChangeText={setContraceptionType}
                      />
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step2.hrt}</Text>
                    <View style={styles.yesNoContainer}>
                      <TouchableOpacity
                        style={[styles.yesNoButton, hadHRT === true && styles.yesNoButtonSelected]}
                        onPress={() => setHadHRT(true)}
                      >
                        <Text style={[styles.yesNoText, hadHRT === true && styles.yesNoTextSelected]}>{t.onboarding.step2.yes}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.yesNoButton, hadHRT === false && styles.yesNoButtonSelected]}
                        onPress={() => setHadHRT(false)}
                      >
                        <Text style={[styles.yesNoText, hadHRT === false && styles.yesNoTextSelected]}>{t.onboarding.step2.no}</Text>
                      </TouchableOpacity>
                    </View>
                    {hadHRT === true && (
                      <TextInput
                        style={[styles.input, { marginTop: SPACING.sm }]}
                        placeholder={t.onboarding.step2.hrtPlaceholder}
                        placeholderTextColor={COLORS.gray[300]}
                        value={hrtDetails}
                        onChangeText={setHrtDetails}
                        multiline
                      />
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step2.menarcheAge}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t.onboarding.step2.menarcheAgePlaceholder}
                      placeholderTextColor={COLORS.gray[300]}
                      value={menarcheAge}
                      onChangeText={setMenarcheAge}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step2.conditions}</Text>
                    <Text style={[styles.helperText, { marginBottom: SPACING.sm }]}>
                      {t.onboarding.step2.conditionsHelper}
                    </Text>
                    <View style={styles.checkboxContainer}>
                      {MEDICAL_CONDITIONS.map((condition) => (
                        <TouchableOpacity
                          key={condition.id}
                          style={styles.checkboxRow}
                          onPress={() => toggleMedicalCondition(condition.id)}
                        >
                          <View style={[
                            styles.checkbox,
                            medicalConditions.includes(condition.id) && styles.checkboxSelected
                          ]}>
                            {medicalConditions.includes(condition.id) && (
                              <Ionicons name="checkmark" size={16} color={COLORS.white} />
                            )}
                          </View>
                          <Text style={styles.checkboxLabel}>{condition.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {medicalConditions.includes('other') && (
                      <TextInput
                        style={[styles.input, { marginTop: SPACING.sm }]}
                        placeholder={t.onboarding.step2.conditionsOther}
                        placeholderTextColor={COLORS.gray[300]}
                        value={otherCondition}
                        onChangeText={setOtherCondition}
                      />
                    )}
                  </View>
                </View>
              )}

              {/* PHASE 3: Symptômes Actuels */}
              {step === 3 && (
                <View style={styles.stepContent}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>{t.onboarding.step3.title}</Text>
                    <Text style={styles.subtitle}>
                      {t.onboarding.step3.subtitle}
                    </Text>
                  </View>

                  <View style={styles.symptomSection}>
                    <Text style={styles.symptomCategoryTitle}>{t.onboarding.step3.physical}</Text>
                    {PHYSICAL_SYMPTOMS.map((symptom) => (
                      <View key={symptom.id} style={styles.symptomRow}>
                        <Text style={styles.symptomLabel}>{symptom.label}</Text>
                        <View style={styles.intensityButtons}>
                          {[0, 1, 2, 3].map((intensity) => (
                            <TouchableOpacity
                              key={intensity}
                              style={[
                                styles.intensityButton,
                                physicalSymptoms[symptom.id] === intensity && styles.intensityButtonSelected
                              ]}
                              onPress={() => updateSymptomIntensity(symptom.id, intensity, 'physical')}
                            >
                              <Text style={[
                                styles.intensityButtonText,
                                physicalSymptoms[symptom.id] === intensity && styles.intensityButtonTextSelected
                              ]}>
                                {intensity}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>

                  <View style={styles.symptomSection}>
                    <Text style={styles.symptomCategoryTitle}>{t.onboarding.step3.mental}</Text>
                    {MENTAL_SYMPTOMS.map((symptom) => (
                      <View key={symptom.id} style={styles.symptomRow}>
                        <Text style={styles.symptomLabel}>{symptom.label}</Text>
                        <View style={styles.intensityButtons}>
                          {[0, 1, 2, 3].map((intensity) => (
                            <TouchableOpacity
                              key={intensity}
                              style={[
                                styles.intensityButton,
                                mentalSymptoms[symptom.id] === intensity && styles.intensityButtonSelected
                              ]}
                              onPress={() => updateSymptomIntensity(symptom.id, intensity, 'mental')}
                            >
                              <Text style={[
                                styles.intensityButtonText,
                                mentalSymptoms[symptom.id] === intensity && styles.intensityButtonTextSelected
                              ]}>
                                {intensity}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>

                  <View style={styles.symptomSection}>
                    <Text style={styles.symptomCategoryTitle}>{t.onboarding.step3.cycle}</Text>
                    {CYCLE_SYMPTOMS.map((symptom) => (
                      <View key={symptom.id} style={styles.symptomRow}>
                        <Text style={styles.symptomLabel}>{symptom.label}</Text>
                        <View style={styles.intensityButtons}>
                          {[0, 1, 2, 3].map((intensity) => (
                            <TouchableOpacity
                              key={intensity}
                              style={[
                                styles.intensityButton,
                                cycleSymptoms[symptom.id] === intensity && styles.intensityButtonSelected
                              ]}
                              onPress={() => updateSymptomIntensity(symptom.id, intensity, 'cycle')}
                            >
                              <Text style={[
                                styles.intensityButtonText,
                                cycleSymptoms[symptom.id] === intensity && styles.intensityButtonTextSelected
                              ]}>
                                {intensity}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* PHASE 4: Objectifs */}
              {step === 4 && (
                <View style={styles.stepContent}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>{t.onboarding.step4.title}</Text>
                    <Text style={styles.subtitle}>
                      {t.onboarding.step4.subtitle}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <View style={styles.checkboxContainer}>
                      {USER_GOALS.map((goal) => (
                        <TouchableOpacity
                          key={goal.id}
                          style={styles.checkboxRow}
                          onPress={() => toggleGoal(goal.id)}
                        >
                          <View style={[
                            styles.checkbox,
                            goals.includes(goal.id) && styles.checkboxSelected
                          ]}>
                            {goals.includes(goal.id) && (
                              <Ionicons name="checkmark" size={16} color={COLORS.white} />
                            )}
                          </View>
                          <Text style={styles.checkboxLabel}>{goal.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* PHASE 5: Préférences */}
              {step === 5 && (
                <View style={styles.stepContent}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>{t.onboarding.step5.title}</Text>
                    <Text style={styles.subtitle}>
                      {t.onboarding.step5.subtitle}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step5.notificationFrequency}</Text>
                    <View style={styles.optionsContainer}>
                      {NOTIFICATION_FREQUENCY.map((freq) => (
                        <TouchableOpacity
                          key={freq.id}
                          style={[
                            styles.optionCard,
                            notificationFrequency === freq.id && styles.optionCardSelected
                          ]}
                          onPress={() => setNotificationFrequency(freq.id)}
                        >
                          <Text style={[
                            styles.optionTitle,
                            notificationFrequency === freq.id && styles.optionTitleSelected
                          ]}>
                            {freq.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step5.notificationTiming}</Text>
                    <View style={styles.optionsContainer}>
                      {NOTIFICATION_TIMING.map((timing) => (
                        <TouchableOpacity
                          key={timing.id}
                          style={[
                            styles.optionCard,
                            notificationTiming === timing.id && styles.optionCardSelected
                          ]}
                          onPress={() => setNotificationTiming(timing.id)}
                        >
                          <Text style={[
                            styles.optionTitle,
                            notificationTiming === timing.id && styles.optionTitleSelected
                          ]}>
                            {timing.label}
                          </Text>
                          <Text style={styles.optionDescription}>{timing.time}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step5.notificationTypes}</Text>
                    <View style={styles.switchContainer}>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t.onboarding.step5.notifTypes.symptoms}</Text>
                        <Switch
                          value={notificationTypes.symptoms}
                          onValueChange={() => toggleNotificationType('symptoms')}
                          trackColor={{ false: COLORS.gray[200], true: COLORS.primary }}
                          thumbColor={COLORS.white}
                        />
                      </View>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t.onboarding.step5.notifTypes.tips}</Text>
                        <Switch
                          value={notificationTypes.tips}
                          onValueChange={() => toggleNotificationType('tips')}
                          trackColor={{ false: COLORS.gray[200], true: COLORS.primary }}
                          thumbColor={COLORS.white}
                        />
                      </View>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t.onboarding.step5.notifTypes.education}</Text>
                        <Switch
                          value={notificationTypes.education}
                          onValueChange={() => toggleNotificationType('education')}
                          trackColor={{ false: COLORS.gray[200], true: COLORS.primary }}
                          thumbColor={COLORS.white}
                        />
                      </View>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t.onboarding.step5.notifTypes.health_alerts}</Text>
                        <Switch
                          value={notificationTypes.health_alerts}
                          onValueChange={() => toggleNotificationType('health_alerts')}
                          trackColor={{ false: COLORS.gray[200], true: COLORS.primary }}
                          thumbColor={COLORS.white}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step5.medications}</Text>
                    <TextInput
                      style={styles.textArea}
                      placeholder={t.onboarding.step5.medicationsPlaceholder}
                      placeholderTextColor={COLORS.gray[300]}
                      value={medications}
                      onChangeText={setMedications}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step5.supplements}</Text>
                    <TextInput
                      style={styles.textArea}
                      placeholder={t.onboarding.step5.supplementsPlaceholder}
                      placeholderTextColor={COLORS.gray[300]}
                      value={supplements}
                      onChangeText={setSupplements}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t.onboarding.step5.device}</Text>
                    <View style={styles.optionsContainer}>
                      {CONNECTED_DEVICES.map((device) => (
                        <TouchableOpacity
                          key={device.id}
                          style={[
                            styles.optionCard,
                            connectedDevice === device.id && styles.optionCardSelected
                          ]}
                          onPress={() => setConnectedDevice(device.id)}
                        >
                          <Text style={[
                            styles.optionTitle,
                            connectedDevice === device.id && styles.optionTitleSelected
                          ]}>
                            {device.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {connectedDevice && connectedDevice !== 'none' && (
                    <View style={styles.inputContainer}>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t.onboarding.step5.syncData}</Text>
                        <Switch
                          value={syncData}
                          onValueChange={setSyncData}
                          trackColor={{ false: COLORS.gray[200], true: COLORS.primary }}
                          thumbColor={COLORS.white}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* PHASE 6: Confidentialité & Consentement */}
              {step === 6 && (
                <View style={styles.stepContent}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>{t.onboarding.step6.title}</Text>
                    <Text style={styles.subtitle}>
                      {t.onboarding.step6.subtitle}
                    </Text>
                  </View>

                  <View style={styles.privacyContainer}>
                    <Text style={styles.privacyTitle}>{t.onboarding.step6.privacyTitle}</Text>
                    <Text style={styles.privacyText}>
                      {t.onboarding.step6.privacyText}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <View style={styles.consentRow}>
                      <TouchableOpacity
                        style={[styles.checkbox, consentData && styles.checkboxSelected]}
                        onPress={() => setConsentData(!consentData)}
                      >
                        {consentData && (
                          <Ionicons name="checkmark" size={16} color={COLORS.white} />
                        )}
                      </TouchableOpacity>
                      <Text style={styles.consentLabel}>
                        {t.onboarding.step6.consentData}
                      </Text>
                    </View>

                    <View style={styles.consentRow}>
                      <TouchableOpacity
                        style={[styles.checkbox, consentShare && styles.checkboxSelected]}
                        onPress={() => setConsentShare(!consentShare)}
                      >
                        {consentShare && (
                          <Ionicons name="checkmark" size={16} color={COLORS.white} />
                        )}
                      </TouchableOpacity>
                      <Text style={styles.consentLabel}>
                        {t.onboarding.step6.consentShare}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.privacyFooter}>
                    <Text style={styles.privacyFooterText}>
                      {t.onboarding.step6.footer}
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.continueButton,
                ((step === 0 && !canProceedStep0) ||
                 (step === 1 && !canProceedStep1) ||
                 (step === 2 && !canProceedStep2) ||
                 (step === 3 && !canProceedStep3) ||
                 (step === 4 && !canProceedStep4) ||
                 (step === 5 && !canProceedStep5) ||
                 (step === 6 && !canProceedStep6) ||
                 loading)
                  ? styles.buttonDisabled 
                  : {}
              ]}
              activeOpacity={0.8}
              onPress={step === totalSteps - 1 ? handleComplete : handleNext}
              disabled={
                (step === 0 && !canProceedStep0) ||
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3) ||
                (step === 4 && !canProceedStep4) ||
                (step === 5 && !canProceedStep5) ||
                (step === 6 && !canProceedStep6) ||
                loading
              }
            >
              {loading ? (
                <Text style={styles.continueButtonText}>{t.onboarding.creating}</Text>
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {step === totalSteps - 1 ? t.onboarding.start : t.onboarding.next}
                  </Text>
                  {step < totalSteps - 1 && (
                    <Ionicons 
                      name="arrow-forward" 
                      size={20} 
                      color={COLORS.white} 
                    />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
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
    paddingBottom: SPACING.md,
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
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  formContainer: {
    flex: 1,
  },
  stepContent: {
    paddingTop: SPACING.sm,
  },
  titleContainer: {
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Times New Roman',
    fontStyle: 'italic',
    color: COLORS.text,
    fontWeight: '400',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray[500],
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: 15,
    color: COLORS.text,
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    fontSize: 16,
    color: COLORS.text,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    paddingRight: 50,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeIcon: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.md + 4,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfWidth: {
    flex: 1,
  },
  bmiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[100],
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.xl,
  },
  bmiLabel: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginRight: SPACING.sm,
  },
  bmiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  optionsContainer: {
    gap: SPACING.md,
  },
  optionCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg + 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
    alignItems: 'center',
  },
  optionCardSelected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  optionTitleSelected: {
    color: COLORS.primary,
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  yesNoButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  yesNoButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  yesNoText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  yesNoTextSelected: {
    color: COLORS.primary,
  },
  checkboxContainer: {
    gap: SPACING.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    marginRight: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
  symptomSection: {
    marginBottom: SPACING.xl,
  },
  symptomCategoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  symptomRow: {
    marginBottom: SPACING.md,
  },
  symptomLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  intensityButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  intensityButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  intensityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  intensityButtonTextSelected: {
    color: COLORS.white,
  },
  switchContainer: {
    gap: SPACING.sm,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  privacyContainer: {
    backgroundColor: COLORS.gray[50],
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.xl,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  privacyText: {
    fontSize: 14,
    color: COLORS.gray[600],
    lineHeight: 22,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  consentLabel: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
  privacyFooter: {
    marginTop: SPACING.md,
  },
  privacyFooterText: {
    fontSize: 12,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 18,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
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
