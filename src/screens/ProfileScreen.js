import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { LanguageContext } from '../../App';

export default function ProfileScreen({ navigation, user }) {
  const { t, language, setLanguage } = useContext(LanguageContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    email: user?.email || '',
    age: '',
    menopause_stage: 'perimenopause',
    goals: [],
  });

  const menopauseStages = [
    { value: 'perimenopause', label: 'Périménopause' },
    { value: 'menopause', label: 'Ménopause' },
    { value: 'postmenopause', label: 'Post-ménopause' },
  ];

  const availableGoals = [
    { id: 'sleep', label: 'Améliorer mon sommeil', icon: 'moon' },
    { id: 'energy', label: 'Augmenter mon énergie', icon: 'flash' },
    { id: 'mood', label: 'Stabiliser mon humeur', icon: 'happy' },
    { id: 'weight', label: 'Gérer mon poids', icon: 'fitness' },
    { id: 'stress', label: 'Réduire le stress', icon: 'leaf' },
    { id: 'symptoms', label: 'Gérer les symptômes', icon: 'medical' },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          email: user.email,
          age: data.age?.toString() || '',
          menopause_stage: data.menopause_stage || 'perimenopause',
          goals: data.goals || [],
        });
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          age: profile.age ? parseInt(profile.age) : null,
          menopause_stage: profile.menopause_stage,
          goals: profile.goals,
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Succès', 'Profil mis à jour avec succès ! ✨');
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    } finally {
      setSaving(false);
    }
  };

  const toggleGoal = (goalId) => {
    setProfile(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(g => g !== goalId)
        : [...prev.goals, goalId]
    }));
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr(e) de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <TouchableOpacity onPress={saveProfile} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="checkmark" size={24} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Email */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledText}>{profile.email}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Âge</Text>
            <TextInput
              style={styles.input}
              value={profile.age}
              onChangeText={(text) => setProfile(prev => ({ ...prev, age: text }))}
              placeholder="Ex: 45"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
        </View>

        {/* Stade de ménopause */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon parcours</Text>
          <Text style={styles.label}>Stade de ménopause</Text>
          
          {menopauseStages.map((stage) => (
            <TouchableOpacity
              key={stage.value}
              style={[
                styles.radioOption,
                profile.menopause_stage === stage.value && styles.radioOptionSelected
              ]}
              onPress={() => setProfile(prev => ({ ...prev, menopause_stage: stage.value }))}
            >
              <View style={styles.radio}>
                {profile.menopause_stage === stage.value && <View style={styles.radioInner} />}
              </View>
              <Text style={[
                styles.radioLabel,
                profile.menopause_stage === stage.value && styles.radioLabelSelected
              ]}>
                {stage.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Objectifs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes objectifs</Text>
          <Text style={styles.subtitle}>Sélectionne ce sur quoi tu souhaites te concentrer</Text>
          
          <View style={styles.goalsGrid}>
            {availableGoals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalCard,
                  profile.goals.includes(goal.id) && styles.goalCardSelected
                ]}
                onPress={() => toggleGoal(goal.id)}
              >
                <Ionicons
                  name={goal.icon}
                  size={24}
                  color={profile.goals.includes(goal.id) ? COLORS.primary : COLORS.textLight}
                />
                <Text style={[
                  styles.goalLabel,
                  profile.goals.includes(goal.id) && styles.goalLabelSelected
                ]}>
                  {goal.label}
                </Text>
                {profile.goals.includes(goal.id) && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={16} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Langue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="language" size={22} color={COLORS.textLight} />
              <Text style={styles.settingLabel}>Langue</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{language === 'fr' ? 'Français' : 'English'}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.signOutText}>Déconnexion</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.secondary,
  },
  disabledInput: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
  },
  disabledText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  radioOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: 15,
    color: COLORS.secondary,
  },
  radioLabelSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  goalCard: {
    width: '48%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    position: 'relative',
  },
  goalCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  goalLabel: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  goalLabelSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  settingLabel: {
    fontSize: 15,
    color: COLORS.secondary,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  settingValue: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 12,
    padding: SPACING.md,
    margin: SPACING.lg,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
});
