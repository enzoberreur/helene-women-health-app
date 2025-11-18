import React, { useState, useEffect, createContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import LandingPage from './src/screens/LandingPage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import { setupDeepLinking } from './src/utils/linking';
import { supabase } from './src/lib/supabase';
import { getTranslation } from './src/i18n/translations';

export const LanguageContext = createContext();

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
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
      } else {
        setUser(null);
        setCurrentScreen('landing');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const navigation = {
    navigate: (screen) => setCurrentScreen(screen),
    goBack: () => setCurrentScreen('landing'),
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <StatusBar style="dark" />
      {currentScreen === 'landing' ? (
        <LandingPage navigation={navigation} />
      ) : currentScreen === 'signup' ? (
        <OnboardingScreen navigation={navigation} />
      ) : (
        <HomeScreen navigation={navigation} user={user} />
      )}
    </LanguageContext.Provider>
  );
}
