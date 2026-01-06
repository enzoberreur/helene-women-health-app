import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react';
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
      { value: 1, icon: 'sad', label: labels?.veryLow ?? 'Very low', color: COLORS.error },
      { value: 2, icon: 'sad-outline', label: labels?.low ?? 'Low', color: COLORS.warning },
      { value: 3, icon: 'remove-circle-outline', label: labels?.neutral ?? 'Neutral', color: COLORS.gray[500] },
      { value: 4, icon: 'happy-outline', label: labels?.good ?? 'Good', color: COLORS.primary },
      { value: 5, icon: 'happy', label: labels?.excellent ?? 'Excellent', color: COLORS.success },
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
  const [activeDate, setActiveDate] = useState(() => new Date().toISOString().split('T')[0]);

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

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const resetFormToDefaults = useCallback(() => {
    setMood(3);
    setEnergyLevel(3);
    setSleepQuality(3);
    setPhysicalSymptoms({
      hot_flashes: 0,
      night_sweats: 0,
      headaches: 0,
      joint_pain: 0,
      fatigue: 0,
    });
    setMentalSymptoms({
      anxiety: 0,
      irritability: 0,
      brain_fog: 0,
      low_mood: 0,
    });
    setNotes('');
  }, []);

  // Charger le log du jour si il existe
  useEffect(() => {
    loadTodayLog();
  }, []);

  // Si l'app reste ouverte sur l'écran pendant minuit, recharger automatiquement.
  useEffect(() => {
    const intervalId = setInterval(() => {
      const today = getTodayString();
      if (today !== activeDate) {
        setActiveDate(today);
        loadTodayLog();
      }
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [activeDate]);

  const loadTodayLog = async () => {
    try {
      const today = getTodayString();
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      if (error) throw error;

      // Important: si aucun log aujourd'hui, on reset le formulaire
      if (!data) {
        setExistingLog(null);
        resetFormToDefaults();
        return;
      }

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
    } catch (error) {
      console.error('Erreur chargement log:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const today = getTodayString();

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

      // Upsert = 1 log / jour / utilisatrice, sans risque d'écraser l'historique
      let saved;
      let error;

      ({ data: saved, error } = await supabase
        .from('daily_logs')
        .upsert(logData, { onConflict: 'user_id,log_date' })
        .select()
        .single());

      // Fallback: if the sentiment migration hasn't been applied yet,
      // retry without sentiment columns so users can still save their logs.
      const isUndefinedColumn = error?.code === '42703' || /column .* does not exist/i.test(error?.message || '');
      const isSentimentColumnError = /notes_sentiment|notes_sentiment_score|notes_sentiment_emoji/i.test(error?.message || '');

      if (error && isUndefinedColumn && isSentimentColumnError) {
        const fallbackLogData = { ...logData };
        delete fallbackLogData.notes_sentiment;
        delete fallbackLogData.notes_sentiment_score;
        delete fallbackLogData.notes_sentiment_emoji;

        ({ data: saved, error } = await supabase
          .from('daily_logs')
          .upsert(fallbackLogData, { onConflict: 'user_id,log_date' })
          .select()
          .single());
      }

      if (error) throw error;
      setExistingLog(saved ?? null);

      // Message personnalisé avec encouragement
      const alertMessage = sentimentAnalysis
        ? (td?.savedMessageWithEncouragement ?? 'Your daily check-in has been saved.\n\n{message}')
            .replace('{message}', encouragementMessage)
        : (td?.savedMessage ?? 'Your daily check-in has been saved.');

      Alert.alert(
        td?.savedTitle ?? 'Saved',
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
            <View style={styles.groupContainer}>
              <View style={styles.moodRow}>
                {moodOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.moodPill,
                      index !== moodOptions.length - 1 && styles.moodPillDivider,
                      mood === option.value && styles.moodPillSelected,
                    ]}
                    onPress={() => setMood(option.value)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.moodIconCircle,
                        mood === option.value && { backgroundColor: option.color },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={mood === option.value ? COLORS.white : option.color}
                      />
                    </View>
                    <Text
                      style={[styles.moodPillLabel, mood === option.value && styles.moodPillLabelSelected]}
                      numberOfLines={2}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Energy & Sleep */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{td?.energyTitle ?? 'Energy level'}</Text>
            <View style={styles.groupContainer}>
              <View style={styles.segmentRow}>
                {[1, 2, 3, 4, 5].map((value, index, arr) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.segment,
                      index !== arr.length - 1 && styles.segmentDivider,
                      energyLevel === value && styles.segmentSelected,
                    ]}
                    onPress={() => setEnergyLevel(value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.segmentText, energyLevel === value && styles.segmentTextSelected]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>{td?.energyLow ?? 'Very low'}</Text>
              <Text style={styles.scaleLabel}>{td?.energyHigh ?? 'Excellent'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{td?.sleepTitle ?? 'Sleep quality'}</Text>
            <View style={styles.groupContainer}>
              <View style={styles.segmentRow}>
                {[1, 2, 3, 4, 5].map((value, index, arr) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.segment,
                      index !== arr.length - 1 && styles.segmentDivider,
                      sleepQuality === value && styles.segmentSelected,
                    ]}
                    onPress={() => setSleepQuality(value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.segmentText, sleepQuality === value && styles.segmentTextSelected]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>{td?.sleepLow ?? 'Very poor'}</Text>
              <Text style={styles.scaleLabel}>{td?.sleepHigh ?? 'Excellent'}</Text>
            </View>
          </View>

          {/* Physical Symptoms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{td?.physicalSymptoms ?? 'Physical symptoms'}</Text>
            <View style={styles.groupContainer}>
              {PHYSICAL_SYMPTOMS.map((symptom, index) => (
                <View
                  key={symptom.id}
                  style={[styles.symptomRow, index !== PHYSICAL_SYMPTOMS.length - 1 && styles.symptomRowDivider]}
                >
                  <View style={styles.symptomHeader}>
                    <View style={styles.symptomIconBadge}>
                      <Ionicons name={symptom.icon} size={16} color={COLORS.primary} />
                    </View>
                    <Text style={styles.symptomLabel}>{getSymptomLabel(symptom.id)}</Text>
                  </View>
                  <View style={styles.intensitySegmented}>
                    {intensityOptions.map((option, i, arr) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.intensitySegment,
                          i !== arr.length - 1 && styles.intensitySegmentDivider,
                          physicalSymptoms[symptom.id] === option.value && styles.intensitySegmentSelected,
                        ]}
                        onPress={() => updateSymptom('physical', symptom.id, option.value)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.intensitySegmentText,
                            physicalSymptoms[symptom.id] === option.value && styles.intensitySegmentTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Mental Symptoms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{td?.mentalSymptoms ?? 'Mental & emotional state'}</Text>
            <View style={styles.groupContainer}>
              {MENTAL_SYMPTOMS.map((symptom, index) => (
                <View
                  key={symptom.id}
                  style={[styles.symptomRow, index !== MENTAL_SYMPTOMS.length - 1 && styles.symptomRowDivider]}
                >
                  <View style={styles.symptomHeader}>
                    <View style={styles.symptomIconBadge}>
                      <Ionicons name={symptom.icon} size={16} color={COLORS.primary} />
                    </View>
                    <Text style={styles.symptomLabel}>{getSymptomLabel(symptom.id)}</Text>
                  </View>
                  <View style={styles.intensitySegmented}>
                    {intensityOptions.map((option, i, arr) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.intensitySegment,
                          i !== arr.length - 1 && styles.intensitySegmentDivider,
                          mentalSymptoms[symptom.id] === option.value && styles.intensitySegmentSelected,
                        ]}
                        onPress={() => updateSymptom('mental', symptom.id, option.value)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.intensitySegmentText,
                            mentalSymptoms[symptom.id] === option.value && styles.intensitySegmentTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{td?.notesTitle ?? 'Notes (optional)'}</Text>
            <View style={styles.groupContainer}>
              <TextInput
                style={styles.notesInput}
                placeholder={td?.notesPlaceholder ?? 'How was your day? Write anything you want...'}
                placeholderTextColor={COLORS.gray[400]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />
            </View>
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
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    marginBottom: SPACING.md,
    letterSpacing: -0.2,
  },
  groupContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  moodRow: {
    flexDirection: 'row',
  },
  moodPill: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodPillDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: COLORS.border,
  },
  moodPillSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  moodIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  moodPillLabel: {
    fontSize: 10,
    fontFamily: FONTS.body.semibold,
    color: COLORS.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  moodPillLabelSelected: {
    color: COLORS.primary,
  },
  segmentRow: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: COLORS.border,
  },
  segmentSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  segmentText: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: COLORS.textSecondary,
  },
  segmentTextSelected: {
    color: COLORS.primary,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  scaleLabel: {
    fontSize: 11,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  symptomRow: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  symptomRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  symptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  symptomIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  symptomLabel: {
    fontSize: 15,
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
  },
  intensitySegmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  intensitySegment: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  intensitySegmentDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: COLORS.border,
  },
  intensitySegmentSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  intensitySegmentText: {
    fontSize: 12,
    fontFamily: FONTS.body.semibold,
    color: COLORS.textSecondary,
  },
  intensitySegmentTextSelected: {
    color: COLORS.primary,
  },
  notesInput: {
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.body.semibold,
    letterSpacing: 0.2,
  },
});
