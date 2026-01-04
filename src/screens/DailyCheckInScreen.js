import React, { useState, useContext, useEffect } from 'react';
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
import { COLORS, SPACING } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { LanguageContext } from '../../App';

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Très mauvais' },
  { value: 2, emoji: '😕', label: 'Mauvais' },
  { value: 3, emoji: '😐', label: 'Moyen' },
  { value: 4, emoji: '🙂', label: 'Bien' },
  { value: 5, emoji: '😊', label: 'Excellent' },
];

const INTENSITY_OPTIONS = [
  { value: 0, label: 'Aucun' },
  { value: 1, label: 'Léger' },
  { value: 2, label: 'Modéré' },
  { value: 3, label: 'Sévère' },
];

const PHYSICAL_SYMPTOMS = [
  { id: 'hot_flashes', label: 'Bouffées de chaleur', icon: 'flame' },
  { id: 'night_sweats', label: 'Sueurs nocturnes', icon: 'moon' },
  { id: 'headaches', label: 'Maux de tête', icon: 'sad' },
  { id: 'joint_pain', label: 'Douleurs articulaires', icon: 'body' },
  { id: 'fatigue', label: 'Fatigue', icon: 'battery-dead' },
];

const MENTAL_SYMPTOMS = [
  { id: 'anxiety', label: 'Anxiété', icon: 'alert-circle' },
  { id: 'irritability', label: 'Irritabilité', icon: 'flash' },
  { id: 'brain_fog', label: 'Brouillard mental', icon: 'cloud' },
  { id: 'low_mood', label: 'Humeur basse', icon: 'sad' },
];

export default function DailyCheckInScreen({ navigation, user }) {
  const { t } = useContext(LanguageContext);
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

      const logData = {
        user_id: user.id,
        log_date: today,
        mood,
        energy_level: energyLevel,
        sleep_quality: sleepQuality,
        ...physicalSymptoms,
        ...mentalSymptoms,
        notes: notes.trim() || null,
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

      Alert.alert(
        '✅ Enregistré !',
        'Votre suivi quotidien a été enregistré.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('home'),
          },
        ]
      );
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', error.message);
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
            <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Check-in quotidien</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Mood */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comment vous sentez-vous aujourd'hui ?</Text>
            <View style={styles.moodContainer}>
              {MOOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.moodButton, mood === option.value && styles.moodButtonSelected]}
                  onPress={() => setMood(option.value)}
                >
                  <Text style={styles.moodEmoji}>{option.emoji}</Text>
                  <Text style={styles.moodLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Energy & Sleep */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Niveau d'énergie</Text>
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
              <Text style={styles.scaleLabel}>Très faible</Text>
              <Text style={styles.scaleLabel}>Excellent</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Qualité du sommeil</Text>
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
              <Text style={styles.scaleLabel}>Très mauvaise</Text>
              <Text style={styles.scaleLabel}>Excellente</Text>
            </View>
          </View>

          {/* Physical Symptoms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Symptômes physiques</Text>
            {PHYSICAL_SYMPTOMS.map((symptom) => (
              <View key={symptom.id} style={styles.symptomRow}>
                <View style={styles.symptomHeader}>
                  <Ionicons name={symptom.icon} size={20} color={COLORS.primary} />
                  <Text style={styles.symptomLabel}>{symptom.label}</Text>
                </View>
                <View style={styles.intensityContainer}>
                  {INTENSITY_OPTIONS.map((option) => (
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
            <Text style={styles.sectionTitle}>État mental & émotionnel</Text>
            {MENTAL_SYMPTOMS.map((symptom) => (
              <View key={symptom.id} style={styles.symptomRow}>
                <View style={styles.symptomHeader}>
                  <Ionicons name={symptom.icon} size={20} color={COLORS.primary} />
                  <Text style={styles.symptomLabel}>{symptom.label}</Text>
                </View>
                <View style={styles.intensityContainer}>
                  {INTENSITY_OPTIONS.map((option) => (
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
            <Text style={styles.sectionTitle}>Notes (optionnel)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Comment s'est passée votre journée ? Notez ce que vous voulez..."
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
              {loading ? 'Enregistrement...' : existingLog ? 'Mettre à jour' : 'Enregistrer'}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  moodButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  moodLabel: {
    fontSize: 11,
    color: COLORS.gray[600],
    textAlign: 'center',
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  scaleButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  scaleText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  scaleTextSelected: {
    color: COLORS.white,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  scaleLabel: {
    fontSize: 12,
    color: COLORS.gray[400],
  },
  symptomRow: {
    marginBottom: SPACING.lg,
  },
  symptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  symptomLabel: {
    fontSize: 15,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  intensityContainer: {
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
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  intensityText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  intensityTextSelected: {
    color: COLORS.white,
  },
  notesInput: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    fontSize: 15,
    color: COLORS.secondary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 4,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
