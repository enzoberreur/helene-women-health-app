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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { LanguageContext } from '../../App';
import { generateDoctorReport } from '../utils/pdfGenerator';
import { generateWeeklyInsights } from '../utils/insightsGenerator';
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelDailyReminder,
  areNotificationsEnabled,
  sendTestNotification,
} from '../utils/notificationManager';

export default function ProfileScreen({ navigation, user }) {
  const { t, language, setLanguage } = useContext(LanguageContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [treatment, setTreatment] = useState(null);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
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
    loadTreatment();
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    const enabled = await areNotificationsEnabled();
    setNotificationsEnabled(enabled);
  };

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

  const loadTreatment = async () => {
    try {
      const { data, error } = await supabase
        .from('hormone_treatment')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setTreatment(data);
    } catch (error) {
      console.error('Erreur chargement traitement:', error);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      // Préparer les données à sauvegarder
      const profileData = {
        id: user.id,
        age: profile.age ? parseInt(profile.age) : null,
        menopause_stage: profile.menopause_stage,
        goals: profile.goals,
        updated_at: new Date().toISOString(),
      };

      // Utiliser upsert pour créer ou mettre à jour
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          returning: 'representation' 
        })
        .select()
        .single();

      if (error) throw error;

      // Recharger le profil pour s'assurer que l'UI est à jour
      if (data) {
        setProfile({
          email: user.email,
          age: data.age?.toString() || '',
          menopause_stage: data.menopause_stage || 'perimenopause',
          goals: data.goals || [],
        });
      }

      Alert.alert('Succès', 'Profil mis à jour avec succès ! ✨');
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      Alert.alert('Erreur', `Impossible de sauvegarder le profil: ${error.message}`);
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

  const handleGeneratePDF = async () => {
    try {
      setLoading(true);
      
      // Charger les 30 derniers jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('log_date', { ascending: false });

      if (error) throw error;

      if (!logs || logs.length === 0) {
        Alert.alert(
          'Pas de données',
          'Vous devez avoir au moins quelques check-ins pour générer un rapport.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Générer les insights
      const insights = generateWeeklyInsights(logs);

      // Générer le PDF
      const result = await generateDoctorReport(profile, logs, insights);

      if (result.success) {
        Alert.alert(
          '✅ Rapport généré',
          'Votre rapport médical a été créé avec succès !',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      Alert.alert(
        'Erreur',
        'Impossible de générer le rapport. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async (value) => {
    if (value) {
      // Activer les notifications
      const granted = await requestNotificationPermissions();
      if (granted) {
        await scheduleDailyReminder();
        setNotificationsEnabled(true);
        Alert.alert(
          '🔔 Notifications activées',
          'Vous recevrez un rappel quotidien à 21h pour faire votre check-in.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Permission refusée',
          'Veuillez autoriser les notifications dans les réglages de votre appareil.',
          [{ text: 'OK' }]
        );
        setNotificationsEnabled(false);
      }
    } else {
      // Désactiver les notifications
      await cancelDailyReminder();
      setNotificationsEnabled(false);
      Alert.alert(
        '🔕 Notifications désactivées',
        'Vous ne recevrez plus de rappels quotidiens.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTestNotification = async () => {
    try {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await sendTestNotification();
        Alert.alert(
          '✅ Test envoyé',
          'Vous devriez recevoir une notification de test dans quelques secondes.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Permission refusée',
          'Veuillez autoriser les notifications pour tester.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erreur test notification:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la notification de test.');
    }
  };

  const getTreatmentTypeLabel = (type) => {
    const labels = {
      oral_estrogen: 'Estrogène oral',
      transdermal_patch: 'Patch transdermique',
      gel: 'Gel',
      vaginal_estrogen: 'Estrogène vaginal',
      combined_continuous: 'Combiné continu (E+P)',
      combined_sequential: 'Combiné séquentiel',
      progestogen_only: 'Progestérone seule',
      tibolone: 'Tibolone',
      other: 'Autre',
    };
    return labels[type] || type;
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
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
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
              <Ionicons name="language" size={22} color={COLORS.textSecondary} />
              <Text style={styles.settingLabel}>Langue</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{language === 'fr' ? 'Français' : 'English'}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Traitement hormonal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medkit" size={24} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Traitement hormonal (THS)</Text>
          </View>
          
          {treatment ? (
            <View style={styles.treatmentCard}>
              <View style={styles.treatmentHeader}>
                <View style={styles.treatmentBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.treatmentBadgeText}>Traitement actif</Text>
                </View>
                <TouchableOpacity onPress={() => setShowTreatmentModal(true)}>
                  <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.treatmentInfo}>
                <View style={styles.treatmentRow}>
                  <Text style={styles.treatmentLabel}>Type</Text>
                  <Text style={styles.treatmentValue}>
                    {getTreatmentTypeLabel(treatment.treatment_type)}
                  </Text>
                </View>
                {treatment.treatment_name && (
                  <View style={styles.treatmentRow}>
                    <Text style={styles.treatmentLabel}>Médicament</Text>
                    <Text style={styles.treatmentValue}>{treatment.treatment_name}</Text>
                  </View>
                )}
                {treatment.dosage && (
                  <View style={styles.treatmentRow}>
                    <Text style={styles.treatmentLabel}>Dosage</Text>
                    <Text style={styles.treatmentValue}>{treatment.dosage}</Text>
                  </View>
                )}
                <View style={styles.treatmentRow}>
                  <Text style={styles.treatmentLabel}>Début</Text>
                  <Text style={styles.treatmentValue}>
                    {new Date(treatment.start_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.treatmentRow}>
                  <Text style={styles.treatmentLabel}>Durée</Text>
                  <Text style={styles.treatmentValue}>
                    {Math.floor((new Date() - new Date(treatment.start_date)) / (1000 * 60 * 60 * 24))} jours
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addTreatmentButton}
              onPress={() => setShowTreatmentModal(true)}
            >
              <View style={styles.addTreatmentIconContainer}>
                <Ionicons name="add-circle" size={32} color={COLORS.primary} />
              </View>
              <View style={styles.addTreatmentContent}>
                <Text style={styles.addTreatmentTitle}>Ajouter un traitement</Text>
                <Text style={styles.addTreatmentSubtitle}>
                  Suivez votre traitement hormonal substitutif
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Export PDF */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rapport médical</Text>
          
          <TouchableOpacity
            style={styles.pdfButton}
            onPress={handleGeneratePDF}
            disabled={loading}
          >
            <View style={styles.pdfIconContainer}>
              <Ionicons name="document-text" size={24} color={COLORS.white} />
            </View>
            <View style={styles.pdfContent}>
              <Text style={styles.pdfTitle}>Générer un rapport PDF</Text>
              <Text style={styles.pdfSubtitle}>
                Créez un rapport détaillé pour votre médecin
              </Text>
            </View>
            <Ionicons name="download" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.notificationCard}>
            <View style={styles.notificationHeader}>
              <View style={styles.notificationIconContainer}>
                <Ionicons name="notifications" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>Rappel quotidien</Text>
                <Text style={styles.notificationSubtitle}>
                  Check-in tous les jours à 21h
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primaryLight }}
                thumbColor={notificationsEnabled ? COLORS.primary : COLORS.gray[100]}
              />
            </View>

            {notificationsEnabled && (
              <TouchableOpacity
                style={styles.testNotificationButton}
                onPress={handleTestNotification}
              >
                <Ionicons name="send" size={16} color={COLORS.primary} />
                <Text style={styles.testNotificationText}>
                  Envoyer une notification de test
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* À propos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={24} color={COLORS.text} />
            <Text style={styles.sectionTitle}>À propos</Text>
          </View>
          <TouchableOpacity
            style={styles.aboutButton}
            onPress={() => navigation.navigate('about')}
          >
            <View style={styles.aboutButtonContent}>
              <Ionicons name="heart" size={20} color={COLORS.primary} />
              <Text style={styles.aboutButtonText}>Comment ça marche ?</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aboutButton}
            onPress={() => navigation.navigate('about')}
          >
            <View style={styles.aboutButtonContent}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
              <Text style={styles.aboutButtonText}>Confidentialité & GDPR</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
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
    color: COLORS.text,
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
    color: COLORS.text,
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
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
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
    color: COLORS.text,
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
    color: COLORS.text,
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
    color: COLORS.text,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  settingValue: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  pdfIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  pdfContent: {
    flex: 1,
  },
  pdfTitle: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    marginBottom: 4,
  },
  pdfSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  testNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  testNotificationText: {
    fontSize: 14,
    fontFamily: FONTS.body.medium,
    color: COLORS.primary,
  },
  aboutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aboutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  aboutButtonText: {
    fontSize: 15,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
  },
  // Treatment Styles
  treatmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  treatmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  treatmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  treatmentBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.body.semibold,
    color: COLORS.success,
  },
  treatmentInfo: {
    gap: SPACING.sm,
  },
  treatmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  treatmentLabel: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
  },
  treatmentValue: {
    fontSize: 14,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
  },
  addTreatmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addTreatmentIconContainer: {
    marginRight: SPACING.md,
  },
  addTreatmentContent: {
    flex: 1,
  },
  addTreatmentTitle: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    marginBottom: 4,
  },
  addTreatmentSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
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
