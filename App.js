import React, { useState, useEffect, createContext, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as Notifications from 'expo-notifications';
import LandingPage from './src/screens/LandingPage';
import OnboardingWelcomeScreen from './src/screens/OnboardingWelcomeScreen';
import OnboardingRolesScreen from './src/screens/OnboardingRolesScreen';
import OnboardingValueScreen from './src/screens/OnboardingValueScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import DailyCheckInScreen from './src/screens/DailyCheckInScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TrendsScreen from './src/screens/TrendsScreen';
import EmotionalJournalScreen from './src/screens/EmotionalJournalScreen';
import AboutScreen from './src/screens/AboutScreen';
import SplashScreen from './src/screens/SplashScreen';
import { setupDeepLinking } from './src/utils/linking';
import { supabase } from './src/lib/supabase';
import { getTranslation } from './src/i18n/translations';
import { COLORS } from './src/constants/theme';
import { runDbHealthCheck } from './src/utils/dbHealthCheck';

export const LanguageContext = createContext();

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [screenStack, setScreenStack] = useState(['loading']); // Stack de navigation
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('en'); // 'en' or 'fr'
  const t = getTranslation(language);

  let [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Afficher le splash screen pendant 2.5 secondes
  useEffect(() => {
    if (currentScreen === 'loading') {
      const timer = setTimeout(() => {
        setCurrentScreen('landing');
        setScreenStack(['landing']);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    setupDeepLinking(supabase);

    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);

      if (session?.user) {
        // Ensure a profile row exists (some DB setups might not have the trigger installed yet).
        // Retry without email if the column isn't present.
        try {
          let upsertError;
          ({ error: upsertError } = await supabase
            .from('profiles')
            .upsert({ id: session.user.id, email: session.user.email }, { onConflict: 'id' }));

          const isUndefinedColumn = upsertError?.code === '42703' || /column .* does not exist/i.test(upsertError?.message || '');
          const isEmailColumnError = /\bemail\b/i.test(upsertError?.message || '');

          if (upsertError && isUndefinedColumn && isEmailColumnError) {
            await supabase
              .from('profiles')
              .upsert({ id: session.user.id }, { onConflict: 'id' });
          }
        } catch (e) {
          console.log('Profile upsert skipped:', e?.message || e);
        }

        // Récupérer le profil de l'utilisateur
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.log('Profil non trouvé, utilisation des données de base');
        }

        setUser({ ...session.user, ...(profile || {}) });

        // Non-UI DB connectivity checklist (logs only)
        // - Read-only in production
        // - In dev, also verifies we can upsert today's daily log
        runDbHealthCheck({
          userId: session.user.id,
          allowWriteTest: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
        });

        setCurrentScreen('home');
        setScreenStack(['home']); // Reset stack à home après connexion
      } else {
        setUser(null);
        setCurrentScreen('landing');
        setScreenStack(['landing']); // Reset stack à landing après déconnexion
      }
    });

    // Écouter les clics sur les notifications
    const notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const screen = response.notification.request.content.data?.screen;
        if (screen) {
          setCurrentScreen(screen);
          setScreenStack(prev => [...prev, screen]);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
      notificationResponseSubscription.remove();
    };
  }, []); // Pas de dépendances pour éviter le cycle infini

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const navigation = {
    navigate: (screen) => {
      setCurrentScreen(screen);
      setScreenStack(prev => [...prev, screen]); // Ajouter à la stack
    },
    goBack: () => {
      if (screenStack.length > 1) {
        const newStack = [...screenStack];
        newStack.pop(); // Retirer l'écran actuel
        const previousScreen = newStack[newStack.length - 1];
        setScreenStack(newStack);
        setCurrentScreen(previousScreen);
      }
    },
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <StatusBar style="dark" />
      {currentScreen === 'loading' ? (
        <SplashScreen />
      ) : currentScreen === 'landing' ? (
        <LandingPage navigation={navigation} />
      ) : currentScreen === 'onboardingWelcome' ? (
        <OnboardingWelcomeScreen navigation={navigation} />
      ) : currentScreen === 'onboardingRoles' ? (
        <OnboardingRolesScreen navigation={navigation} />
      ) : currentScreen === 'onboardingValue' ? (
        <OnboardingValueScreen navigation={navigation} />
      ) : currentScreen === 'signup' ? (
        <OnboardingScreen navigation={navigation} />
      ) : currentScreen === 'checkin' ? (
        <DailyCheckInScreen navigation={navigation} user={user} />
      ) : currentScreen === 'chat' ? (
        <ChatScreen navigation={navigation} user={user} />
      ) : currentScreen === 'profile' ? (
        <ProfileScreen navigation={navigation} user={user} />
      ) : currentScreen === 'trends' ? (
        <TrendsScreen navigation={navigation} user={user} />
      ) : currentScreen === 'journal' ? (
        <EmotionalJournalScreen navigation={navigation} user={user} />
      ) : currentScreen === 'about' ? (
        <AboutScreen navigation={navigation} />
      ) : (
        <HomeScreen navigation={navigation} user={user} />
      )}
    </LanguageContext.Provider>
  );
}
