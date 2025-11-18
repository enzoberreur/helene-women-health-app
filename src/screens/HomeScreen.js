import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { LanguageContext } from '../../App';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const CALENDAR_DAYS = Array.from({ length: 35 }, (_, i) => {
  const day = i - 5; // Start from day -5 to have proper offset
  return day > 0 && day <= 30 ? day : null;
});

export default function HomeScreen({ navigation, user }) {
  const { t, language } = useContext(LanguageContext);
  
  const handleLogout = async () => {
    Alert.alert(
      t.home.logout,
      t.home.logoutConfirm,
      [
        {
          text: t.home.cancel,
          style: 'cancel',
        },
        {
          text: t.home.logout,
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              console.error('Erreur déconnexion:', error);
              Alert.alert(t.common.error, language === 'fr' ? 'Impossible de se déconnecter' : 'Unable to log out');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t.home.hello}</Text>
            <Text style={styles.userName}>{user?.name || 'Hélène'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>{t.home.november} 2025</Text>
            <View style={styles.calendarNav}>
              <TouchableOpacity style={styles.navButton}>
                <Ionicons name="chevron-back" size={20} color={COLORS.secondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Days of week */}
          <View style={styles.daysRow}>
            {DAYS.map((day, index) => (
              <View key={index} style={styles.dayCell}>
                <Text style={styles.dayLabel}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {CALENDAR_DAYS.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateCell,
                  day === 13 && styles.dateCellToday,
                  day && styles.dateCellActive,
                ]}
                disabled={!day}
              >
                {day ? (
                  <>
                    <Text style={[
                      styles.dateText,
                      day === 13 && styles.dateTextToday
                    ]}>
                      {day}
                    </Text>
                    {day === 13 && <View style={styles.todayDot} />}
                  </>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={28} color={COLORS.primary} />
            <Text style={styles.statValue}>--</Text>
            <Text style={styles.statLabel}>{t.home.symptoms}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="moon-outline" size={28} color={COLORS.primary} />
            <Text style={styles.statValue}>--</Text>
            <Text style={styles.statLabel}>{t.home.sleep}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="heart-outline" size={28} color={COLORS.primary} />
            <Text style={styles.statValue}>--</Text>
            <Text style={styles.statLabel}>{t.home.mood}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.gray[500],
  },
  userName: {
    fontSize: 32,
    fontFamily: 'Times New Roman',
    fontStyle: 'italic',
    color: COLORS.secondary,
    fontWeight: '400',
    marginTop: SPACING.xs,
  },
  profileButton: {
    padding: SPACING.sm,
  },
  calendarSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  calendarNav: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray[400],
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  dateCellActive: {
    borderRadius: 12,
  },
  dateCellToday: {
    backgroundColor: COLORS.primary,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  dateTextToday: {
    color: COLORS.white,
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.white,
    marginTop: 2,
  },
  statsSection: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.secondary,
    marginVertical: SPACING.sm,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
});
