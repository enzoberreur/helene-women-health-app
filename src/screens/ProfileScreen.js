import React, { useState, useEffect, useContext, useMemo } from 'react';
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
  Modal,
  KeyboardAvoidingView,
  Platform,
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
  const [treatmentSaving, setTreatmentSaving] = useState(false);
  const [treatmentDraft, setTreatmentDraft] = useState({
    id: null,
    treatment_type: 'oral_estrogen',
    treatment_name: '',
    dosage: '',
    start_date: new Date().toISOString().slice(0, 10),
  });
  const [profile, setProfile] = useState({
    email: user?.email || '',
    age: '',
    menopause_stage: 'perimenopause',
    goals: [],
  });

  const logSupabaseError = (context, error) => {
    const code = error?.code ? ` (${error.code})` : '';
    const message = error?.message ? `: ${error.message}` : '';
    // Keep logs concise to avoid noisy in-app overlays.
    console.log(`${context}${message}${code}`);
  };

  const menopauseStages = useMemo(() => [
    { value: 'perimenopause', label: t.profile.perimenopause },
    { value: 'menopause', label: t.profile.menopause },
    { value: 'postmenopause', label: t.profile.postmenopause },
  ], [t]);

  const availableGoals = useMemo(() => {
    const labels = t?.profile?.goalLabels || {};
    return [
      { id: 'sleep', label: labels?.sleep ?? 'Improve my sleep', icon: 'moon' },
      { id: 'energy', label: labels?.energy ?? 'Increase my energy', icon: 'flash' },
      { id: 'mood', label: labels?.mood ?? 'Stabilize my mood', icon: 'happy' },
      { id: 'weight', label: labels?.weight ?? 'Manage my weight', icon: 'fitness' },
      { id: 'stress', label: labels?.stress ?? 'Reduce stress', icon: 'leaf' },
      { id: 'symptoms', label: labels?.symptoms ?? 'Manage symptoms', icon: 'medical' },
    ];
  }, [t]);

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
      logSupabaseError('Erreur chargement profil', error);
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

      // Ignorer l'erreur si la table n'existe pas encore (migration pas exécutée)
      if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        logSupabaseError('Erreur chargement traitement', error);
      }

      setTreatment(data);
    } catch (error) {
      // Erreur silencieuse pour ne pas bloquer le reste de l'app
      console.log('Table hormone_treatment pas encore créée (migration en attente)');
    }
  };

  const openTreatmentModal = () => {
    setTreatmentDraft({
      id: treatment?.id ?? null,
      treatment_type: treatment?.treatment_type ?? 'oral_estrogen',
      treatment_name: treatment?.treatment_name ?? '',
      dosage: treatment?.dosage ?? '',
      start_date: treatment?.start_date ?? new Date().toISOString().slice(0, 10),
    });
    setShowTreatmentModal(true);
  };

  const isValidISODate = (value) => /^\d{4}-\d{2}-\d{2}$/.test((value || '').trim());

  const saveTreatment = async () => {
    const startDate = (treatmentDraft.start_date || '').trim();
    if (!isValidISODate(startDate)) {
      Alert.alert(t.common.error, t.profile.startDate);
      return;
    }

    setTreatmentSaving(true);
    try {
      // If creating a new active treatment, deactivate previous active treatments.
      if (!treatmentDraft.id) {
        await supabase
          .from('hormone_treatment')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('is_active', true);
      }

      const payload = {
        user_id: user.id,
        treatment_type: treatmentDraft.treatment_type,
        treatment_name: treatmentDraft.treatment_name?.trim() || null,
        dosage: treatmentDraft.dosage?.trim() || null,
        start_date: startDate,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const query = supabase.from('hormone_treatment');
      const { error } = treatmentDraft.id
        ? await query.update(payload).eq('id', treatmentDraft.id)
        : await query.insert(payload);

      if (error) throw error;

      setShowTreatmentModal(false);
      await loadTreatment();
    } catch (error) {
      logSupabaseError('Erreur sauvegarde traitement', error);
      Alert.alert(t.common.error, t.profile.saveError);
    } finally {
      setTreatmentSaving(false);
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

      Alert.alert(t.common.success, t.profile.saveSuccess);
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      Alert.alert(t.common.error, t.profile.saveError);
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
      t.profile.signOut,
      t.profile.signOutConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.profile.signOut,
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
          t.profile.noDataTitle,
          t.profile.noDataMessage,
          [{ text: t.common.ok }]
        );
        return;
      }

      // Générer les insights
      const insights = generateWeeklyInsights(logs, language);

      // Générer le PDF
      const result = await generateDoctorReport(profile, logs, insights);

      if (result.success) {
        Alert.alert(
          t.common.success,
          t.profile.reportSuccess,
          [{ text: t.common.ok }]
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      Alert.alert(
        t.common.error,
        t.profile.reportError,
        [{ text: t.common.ok }]
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
          t.profile.notificationsEnabledTitle,
          t.profile.notificationsEnabledMessage,
          [{ text: t.common.ok }]
        );
      } else {
        Alert.alert(
          t.profile.permissionDeniedTitle,
          t.profile.permissionDeniedMessage,
          [{ text: t.common.ok }]
        );
        setNotificationsEnabled(false);
      }
    } else {
      // Désactiver les notifications
      await cancelDailyReminder();
      setNotificationsEnabled(false);
      Alert.alert(
        t.profile.notificationsDisabledTitle,
        t.profile.notificationsDisabledMessage,
        [{ text: t.common.ok }]
      );
    }
  };

  const handleTestNotification = async () => {
    try {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await sendTestNotification();
        Alert.alert(
          t.profile.testSentTitle,
          t.profile.testSentMessage,
          [{ text: t.common.ok }]
        );
      } else {
        Alert.alert(
          t.profile.permissionDeniedTitle,
          t.profile.permissionDeniedTestMessage,
          [{ text: t.common.ok }]
        );
      }
    } catch (error) {
      console.error('Erreur test notification:', error);
      Alert.alert(t.common.error, t.profile.testErrorMessage);
    }
  };

  const getTreatmentTypeLabel = (type) => {
    const labels = t?.profile?.treatmentTypes || {};
    return labels?.[type] || type;
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
        <Text style={styles.headerTitle}>{t.profile.title}</Text>
        <TouchableOpacity onPress={saveProfile} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="checkmark" size={24} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <View style={styles.section}>
          <View style={styles.groupContainer}>
            <View style={styles.groupRow}>
              <Text style={styles.rowLabel}>{t.profile.email}</Text>
              <Text style={styles.rowValueMuted} numberOfLines={1}>
                {profile.email}
              </Text>
            </View>
            <View style={styles.groupDivider} />
            <View style={styles.groupRow}>
              <Text style={styles.rowLabel}>{t.profile.age}</Text>
              <TextInput
                style={styles.rowInput}
                value={profile.age}
                onChangeText={(text) => setProfile((prev) => ({ ...prev, age: text }))}
                placeholder={t.profile.agePlaceholder}
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="numeric"
                maxLength={2}
                returnKeyType="done"
                textAlign="right"
              />
            </View>
          </View>
        </View>

        {/* Stade de ménopause */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.profile.menopauseStage}</Text>
          <View style={styles.groupContainer}>
            {menopauseStages.map((stage, index) => {
              const selected = profile.menopause_stage === stage.value;
              return (
                <TouchableOpacity
                  key={stage.value}
                  style={styles.groupRow}
                  onPress={() => setProfile((prev) => ({ ...prev, menopause_stage: stage.value }))}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>
                    {stage.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  ) : (
                    <View style={styles.rowRightPlaceholder} />
                  )}
                  {index !== menopauseStages.length - 1 && <View style={styles.groupDivider} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Objectifs */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.profile.goals}</Text>
          <Text style={styles.sectionHint}>{t.profile.goalsSubtitle}</Text>

          <View style={styles.groupContainer}>
            {availableGoals.map((goal, index) => {
              const selected = profile.goals.includes(goal.id);
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.groupRow}
                  onPress={() => toggleGoal(goal.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.rowIconBadge}>
                      <Ionicons name={goal.icon} size={16} color={COLORS.primary} />
                    </View>
                    <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>
                      {goal.label}
                    </Text>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  ) : (
                    <View style={styles.rowRightPlaceholder} />
                  )}
                  {index !== availableGoals.length - 1 && <View style={styles.groupDivider} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Langue */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.profile.settings}</Text>
          <View style={styles.groupContainer}>
            <TouchableOpacity
              style={styles.groupRow}
              onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              activeOpacity={0.85}
            >
              <View style={styles.rowLeft}>
                <View style={styles.rowIconBadge}>
                  <Ionicons name="language" size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.rowLabel}>{t.profile.language}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{language === 'fr' ? t.profile.french : t.profile.english}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Traitement hormonal */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.profile.hormoneTreatment}</Text>
          <View style={styles.groupContainer}>
            <TouchableOpacity
              style={styles.groupRow}
              onPress={openTreatmentModal}
              activeOpacity={0.85}
            >
              <View style={styles.rowLeft}>
                <View style={styles.rowIconBadge}>
                  <Ionicons name="medkit" size={16} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>
                    {treatment ? t.profile.treatmentActive : t.profile.addTreatment}
                  </Text>
                  {treatment && (
                    <Text style={styles.rowSubValue} numberOfLines={1}>
                      {getTreatmentTypeLabel(treatment.treatment_type)}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {treatment && (
              <>
                <View style={styles.groupDivider} />
                <View style={styles.groupRow}>
                  <Text style={styles.rowLabel}>{t.profile.startDate}</Text>
                  <Text style={styles.rowValue}>
                    {new Date(treatment.start_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Export PDF */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.profile.medicalReport}</Text>
          <View style={styles.groupContainer}>
            <TouchableOpacity
              style={styles.groupRow}
              onPress={handleGeneratePDF}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={styles.rowLeft}>
                <View style={styles.rowIconBadge}>
                  <Ionicons name="document-text" size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t.profile.generateReport}</Text>
                  <Text style={styles.rowSubValue} numberOfLines={2}>
                    {t.profile.reportDescription}
                  </Text>
                </View>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.profile.notifications}</Text>
          <View style={styles.groupContainer}>
            <View style={styles.groupRow}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconBadge}>
                  <Ionicons name="notifications" size={16} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>{t.profile.enableNotifications}</Text>
                  <Text style={styles.rowSubValue}>{t.profile.notificationDescription}</Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primaryLight }}
                thumbColor={notificationsEnabled ? COLORS.primary : COLORS.gray[100]}
              />
            </View>

            {notificationsEnabled && (
              <>
                <View style={styles.groupDivider} />
                <TouchableOpacity
                  style={styles.groupRow}
                  onPress={handleTestNotification}
                  activeOpacity={0.85}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.rowIconBadge}>
                      <Ionicons name="send" size={16} color={COLORS.primary} />
                    </View>
                    <Text style={styles.rowLabel}>{t.profile.testNotification}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* À propos */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.about.title}</Text>
          <View style={styles.groupContainer}>
            <TouchableOpacity
              style={styles.groupRow}
              onPress={() => navigation.navigate('about')}
              activeOpacity={0.85}
            >
              <View style={styles.rowLeft}>
                <View style={styles.rowIconBadge}>
                  <Ionicons name="heart" size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.rowLabel}>{t.about.howItWorks}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.groupDivider} />
            <TouchableOpacity
              style={styles.groupRow}
              onPress={() => navigation.navigate('about')}
              activeOpacity={0.85}
            >
              <View style={styles.rowLeft}>
                <View style={styles.rowIconBadge}>
                  <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.rowLabel}>{t.about.privacy}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Déconnexion */}
        <View style={styles.section}>
          <View style={styles.groupContainer}>
            <TouchableOpacity style={[styles.groupRow, styles.centerRow]} onPress={handleSignOut}>
              <Text style={styles.destructiveText}>{t.profile.signOut}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Treatment Modal */}
      <Modal
        visible={showTreatmentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTreatmentModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowTreatmentModal(false)}
                style={styles.modalHeaderButton}
              >
                <Text style={styles.modalHeaderButtonText}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t.profile.hormoneTreatment}</Text>
              <TouchableOpacity
                onPress={saveTreatment}
                style={styles.modalHeaderButton}
                disabled={treatmentSaving}
              >
                {treatmentSaving ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={[styles.modalHeaderButtonText, styles.modalHeaderButtonTextPrimary]}>
                    {t.common.save}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>{t.profile.treatmentType}</Text>
              <View style={styles.groupContainer}>
                {Object.keys(t.profile.treatmentTypes).map((typeKey, index, arr) => {
                  const selected = treatmentDraft.treatment_type === typeKey;
                  return (
                    <TouchableOpacity
                      key={typeKey}
                      style={styles.groupRow}
                      onPress={() => setTreatmentDraft((prev) => ({ ...prev, treatment_type: typeKey }))}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>
                        {t.profile.treatmentTypes[typeKey]}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                      ) : (
                        <View style={styles.rowRightPlaceholder} />
                      )}
                      {index !== arr.length - 1 && <View style={styles.groupDivider} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ height: SPACING.lg }} />

              <Text style={styles.sectionLabel}>{t.profile.medication}</Text>
              <View style={styles.groupContainer}>
                <View style={styles.groupRow}>
                  <TextInput
                    style={[styles.modalTextInput]}
                    value={treatmentDraft.treatment_name}
                    onChangeText={(text) => setTreatmentDraft((prev) => ({ ...prev, treatment_name: text }))}
                    placeholder={t.profile.medication}
                    placeholderTextColor={COLORS.gray[400]}
                  />
                </View>
              </View>

              <View style={{ height: SPACING.lg }} />

              <Text style={styles.sectionLabel}>{t.profile.dosage}</Text>
              <View style={styles.groupContainer}>
                <View style={styles.groupRow}>
                  <TextInput
                    style={[styles.modalTextInput]}
                    value={treatmentDraft.dosage}
                    onChangeText={(text) => setTreatmentDraft((prev) => ({ ...prev, dosage: text }))}
                    placeholder={t.profile.dosage}
                    placeholderTextColor={COLORS.gray[400]}
                  />
                </View>
              </View>

              <View style={{ height: SPACING.lg }} />

              <Text style={styles.sectionLabel}>{t.profile.startDate}</Text>
              <View style={styles.groupContainer}>
                <View style={styles.groupRow}>
                  <TextInput
                    style={[styles.modalTextInput]}
                    value={treatmentDraft.start_date}
                    onChangeText={(text) => setTreatmentDraft((prev) => ({ ...prev, start_date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.gray[400]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                  />
                </View>
              </View>

              <View style={{ height: SPACING.xl }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
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
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.body.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  groupContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  groupRow: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.lg,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
    paddingRight: SPACING.md,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rowIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
  },
  rowLabelSelected: {
    fontFamily: FONTS.body.semibold,
    color: COLORS.primary,
  },
  rowValue: {
    fontSize: 15,
    fontFamily: FONTS.body.medium,
    color: COLORS.textSecondary,
  },
  rowValueMuted: {
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.md,
    fontSize: 15,
    fontFamily: FONTS.body.medium,
    color: COLORS.gray[500],
  },
  rowSubValue: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
  },
  rowInput: {
    minWidth: 72,
    fontSize: 15,
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  rowRightPlaceholder: {
    width: 20,
  },
  centerRow: {
    justifyContent: 'center',
  },
  destructiveText: {
    fontSize: 16,
    fontFamily: FONTS.body.semibold,
    color: COLORS.error,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.body.semibold,
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  modalHeaderButton: {
    minWidth: 72,
  },
  modalHeaderButtonText: {
    fontSize: 16,
    fontFamily: FONTS.body.medium,
    color: COLORS.textSecondary,
  },
  modalHeaderButtonTextPrimary: {
    color: COLORS.primary,
    fontFamily: FONTS.body.semibold,
  },
  modalContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
    paddingVertical: 0,
  },
});
