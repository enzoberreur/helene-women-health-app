import React, { useState, useEffect, createContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import LandingPage from './src/screens/LandingPage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import DailyCheckInScreen from './src/screens/DailyCheckInScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { setupDeepLinking } from './src/utils/linking';
import { supabase } from './src/lib/supabase';
import { getTranslation } from './src/i18n/translations';

export const LanguageContext = createContext();

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [screenStack, setScreenStack] = useState(['landing']); // Stack de navigation
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('en'); // 'en' or 'fr'
  const t = getTranslation(language);

  useEffect(() => {
    setupDeepLinking(supabase);

    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);

      if (session?.user) {
        // Récupérer le profil de l'utilisateur
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setUser({ ...session.user, ...profile });
        setCurrentScreen('home');
        setScreenStack(['home']); // Reset stack à home après connexion
      } else {
        setUser(null);
        setCurrentScreen('landing');
        setScreenStack(['landing']); // Reset stack à landing après déconnexion
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

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
      {currentScreen === 'landing' ? (
        <LandingPage navigation={navigation} />
      ) : currentScreen === 'signup' ? (
        <OnboardingScreen navigation={navigation} />
      ) : currentScreen === 'checkin' ? (
        <DailyCheckInScreen navigation={navigation} user={user} />
      ) : currentScreen === 'chat' ? (
        <ChatScreen navigation={navigation} user={user} />
      ) : currentScreen === 'profile' ? (
        <ProfileScreen navigation={navigation} user={user} />
      ) : (
        <HomeScreen navigation={navigation} user={user} />
      )}
    </LanguageContext.Provider>
  );
}
