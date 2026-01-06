import React, { useState, useContext, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { LanguageContext } from '../../App';
import { analyzeSentiment, generateEncouragementMessage } from '../utils/sentimentAnalysis';

const PHYSICAL_SYMPTOMS = [
  { id: 'hot_flashes', icon: 'flame' },
  { id: 'night_sweats', icon: 'moon' },
  { id: 'headaches', icon: 'sad' },
  { id: 'joint_pain', icon: 'body' },
  { id: 'fatigue', icon: 'battery-dead' },
];

const MENTAL_SYMPTOMS = [
  { id: 'anxiety', icon: 'alert-circle' },
  { id: 'irritability', icon: 'flash' },
  { id: 'brain_fog', icon: 'cloud' },
  { id: 'low_mood', icon: 'sad' },
];

export default function DailyCheckInScreen({ navigation, user }) {
  const context = useContext(LanguageContext) || {};
  const t = context.t || {};
  const language = context.language || 'fr';

  const td = t?.dailyCheckIn || {};
  const tc = t?.common || {};
  const symptomLabels = t?.home?.symptomLabels || {};

  const moodOptions = useMemo(() => {
    const labels = td?.moodOptions || {};
    return [
      { value: 1, icon: 'sad', label: labels?.veryLow ?? 'Very low', color: '#F56565' },
      { value: 2, icon: 'sad-outline', label: labels?.low ?? 'Low', color: '#ED8936' },
      { value: 3, icon: 'remove-circle-outline', label: labels?.neutral ?? 'Neutral', color: '#718096' },
      { value: 4, icon: 'happy-outline', label: labels?.good ?? 'Good', color: '#48BB78' },
      { value: 5, icon: 'happy', label: labels?.excellent ?? 'Excellent', color: '#38A169' },
    ];
  }, [td]);

  const intensityOptions = useMemo(() => {
    const labels = td?.intensity || {};
    return [
      { value: 0, label: labels?.none ?? 'None' },
      { value: 1, label: labels?.mild ?? 'Mild' },
      { value: 2, label: labels?.moderate ?? 'Moderate' },
      { value: 3, label: labels?.severe ?? 'Severe' },
    ];
  }, [td]);

  const getSymptomLabel = (symptomId) => {
    return symptomLabels?.[symptomId] ?? symptomId;
  };
  const [loading, setLoading] = useState(false);
  const [existingLog, setExistingLog] = useState(null);

  // État du formulaire
  const [mood, setMood] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [physicalSymptoms, setPhysicalSymptoms] = useState({
    hot_flashes: 0,
    night_sweats: 0,
    headaches: 0,
    joint_pain: 0,
    fatigue: 0,
  });
  const [mentalSymptoms, setMentalSymptoms] = useState({
    anxiety: 0,
    irritability: 0,
    brain_fog: 0,
    low_mood: 0,
  });
  const [notes, setNotes] = useState('');

  // Charger le log du jour si il existe
  useEffect(() => {
    loadTodayLog();
  }, []);

  const loadTodayLog = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .single();

      if (data) {
        setExistingLog(data);
        setMood(data.mood || 3);
        setEnergyLevel(data.energy_level || 3);
        setSleepQuality(data.sleep_quality || 3);
        setPhysicalSymptoms({
          hot_flashes: data.hot_flashes || 0,
          night_sweats: data.night_sweats || 0,
          headaches: data.headaches || 0,
          joint_pain: data.joint_pain || 0,
          fatigue: data.fatigue || 0,
        });
        setMentalSymptoms({
          anxiety: data.anxiety || 0,
          irritability: data.irritability || 0,
          brain_fog: data.brain_fog || 0,
          low_mood: data.low_mood || 0,
        });
        setNotes(data.notes || '');
      }
    } catch (error) {
      if (error.code !== 'PGRST116') { // Ignore "not found" error
        console.error('Erreur chargement log:', error);
      }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Analyser le sentiment des notes
      let sentimentAnalysis = null;
      let encouragementMessage = '';
      
      if (notes && notes.trim().length > 0) {
        sentimentAnalysis = analyzeSentiment(notes);
        encouragementMessage = generateEncouragementMessage({ ...sentimentAnalysis, language });
      }

      const logData = {
        user_id: user.id,
        log_date: today,
        mood,
        energy_level: energyLevel,
        sleep_quality: sleepQuality,
        ...physicalSymptoms,
        ...mentalSymptoms,
        notes: notes.trim() || null,
        notes_sentiment: sentimentAnalysis?.sentiment || null,
        notes_sentiment_score: sentimentAnalysis?.score || null,
        notes_sentiment_emoji: sentimentAnalysis?.emoji || null,
      };

      let error;
      if (existingLog) {
        // Update
        ({ error } = await supabase
          .from('daily_logs')
          .update(logData)
          .eq('id', existingLog.id));
      } else {
        // Insert
        ({ error } = await supabase
          .from('daily_logs')
          .insert([logData]));
      }

      if (error) throw error;

      // Message personnalisé avec encouragement
      const alertMessage = sentimentAnalysis
        ? (td?.savedMessageWithEncouragement ?? 'Your daily check-in has been saved.\n\n{emoji} {message}')
            .replace('{emoji}', sentimentAnalysis.emoji)
            .replace('{message}', encouragementMessage)
        : (td?.savedMessage ?? 'Your daily check-in has been saved.');

      Alert.alert(
        td?.savedTitle ?? '✅ Saved!',
        alertMessage,
        [
          {
            text: tc?.ok ?? 'OK',
            onPress: () => navigation.navigate('home'),
          },
        ]
      );
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert(tc?.error ?? 'Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSymptom = (category, symptomId, value) => {
    if (category === 'physical') {
      setPhysicalSymptoms({ ...physicalSymptoms, [symptomId]: value });
    } else {
      setMentalSymptoms({ ...mentalSymptoms, [symptomId]: value });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{td?.title ?? 'Daily check-in'}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Mood */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{td?.moodQuestion ?? 'How are you feeling today?'}</Text>
            <View style={styles.moodContainer}>
              {moodOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.moodButton, mood === option.value && styles.moodButtonSelected]}
                  onPress={() => setMood(option.value)}
                >
                  <View style={[
                    styles.moodIconContainer,
                    mood === option.value && { backgroundColor: option.color }
                  ]}>
                    <Ionicons 
                      name={option.icon} 
                      size={28} 
                      color={mood === option.value ? COLORS.white : option.color} 
                    />
                  </View>
                  <Text style={[
                    styles.moodLabel,
                    mood === option.value && styles.moodLabelSelected
                  ]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Energy & Sleep */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{td?.energyTitle ?? 'Energy level'}</Text>
            <View style={styles.scaleContainer}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.scaleButton, energyLevel === value && styles.scaleButtonSelected]}
                  onPress={() => setEnergyLevel(value)}
                >
                  <Text style={[styles.scaleText, energyLevel === value && styles.scaleTextSelected]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>{td?.energyLow ?? 'Very low'}</Text>
              <Text style={styles.scaleLabel}>{td?.energyHigh ?? 'Excellent'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{td?.sleepTitle ?? 'Sleep quality'}</Text>
            <View style={styles.scaleContainer}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.scaleButton, sleepQuality === value && styles.scaleButtonSelected]}
                  onPress={() => setSleepQuality(value)}
                >
                  <Text style={[styles.scaleText, sleepQuality === value && styles.scaleTextSelected]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>{td?.sleepLow ?? 'Very poor'}</Text>
              <Text style={styles.scaleLabel}>{td?.sleepHigh ?? 'Excellent'}</Text>
            </View>
          </View>

          {/* Physical Symptoms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{td?.physicalSymptoms ?? 'Physical symptoms'}</Text>
            {PHYSICAL_SYMPTOMS.map((symptom) => (
              <View key={symptom.id} style={styles.symptomRow}>
                <View style={styles.symptomHeader}>
                  <Ionicons name={symptom.icon} size={20} color={COLORS.primary} />
                  <Text style={styles.symptomLabel}>{getSymptomLabel(symptom.id)}</Text>
                </View>
                <View style={styles.intensityContainer}>
                  {intensityOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.intensityButton,
                        physicalSymptoms[symptom.id] === option.value && styles.intensityButtonSelected,
                      ]}
                      onPress={() => updateSymptom('physical', symptom.id, option.value)}
                    >
                      <Text
                        style={[
                          styles.intensityText,
                          physicalSymptoms[symptom.id] === option.value && styles.intensityTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Mental Symptoms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{td?.mentalSymptoms ?? 'Mental & emotional state'}</Text>
            {MENTAL_SYMPTOMS.map((symptom) => (
              <View key={symptom.id} style={styles.symptomRow}>
                <View style={styles.symptomHeader}>
                  <Ionicons name={symptom.icon} size={20} color={COLORS.primary} />
                  <Text style={styles.symptomLabel}>{getSymptomLabel(symptom.id)}</Text>
                </View>
                <View style={styles.intensityContainer}>
                  {intensityOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.intensityButton,
                        mentalSymptoms[symptom.id] === option.value && styles.intensityButtonSelected,
                      ]}
                      onPress={() => updateSymptom('mental', symptom.id, option.value)}
                    >
                      <Text
                        style={[
                          styles.intensityText,
                          mentalSymptoms[symptom.id] === option.value && styles.intensityTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{td?.notesTitle ?? 'Notes (optional)'}</Text>
            <TextInput
              style={styles.notesInput}
              placeholder={td?.notesPlaceholder ?? 'How was your day? Write anything you want...'}
              placeholderTextColor={COLORS.gray[300]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading
                ? (td?.saving ?? (tc?.saving ?? 'Saving...'))
                : existingLog
                  ? (td?.update ?? 'Update')
                  : (td?.save ?? (tc?.save ?? 'Save'))}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '400',
    fontFamily: FONTS.heading.regular,
    color: COLORS.text,
    letterSpacing: -0.3,
    fontStyle: 'italic',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
  },
  section: {
    marginBottom: SPACING.xxxl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    letterSpacing: -0.2,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moodButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  moodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    marginBottom: SPACING.sm,
  },
  moodLabel: {
    fontSize: 11,
    fontFamily: FONTS.body.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moodLabelSelected: {
    color: COLORS.primary,
    fontFamily: FONTS.body.semibold,
  },
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  scaleButton: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scaleButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scaleText: {
    fontSize: 18,
    fontWeight: '400',
    fontFamily: FONTS.heading.regular,
    color: COLORS.textSecondary,
  },
  scaleTextSelected: {
    color: COLORS.white,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  scaleLabel: {
    fontSize: 11,
    fontFamily: FONTS.body.regular,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  symptomRow: {
    marginBottom: SPACING.xl,
  },
  symptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  symptomLabel: {
    fontSize: 15,
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
  },
  intensityContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  intensityButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  intensityText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: FONTS.body.medium,
    color: COLORS.textSecondary,
  },
  intensityTextSelected: {
    color: COLORS.white,
  },
  notesInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    fontSize: 15,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  buttonContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.body.semibold,
    letterSpacing: 0.3,
  },
});
