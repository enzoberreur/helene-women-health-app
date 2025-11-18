import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { LanguageContext } from '../../App';

const { width, height } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RotatingLogo = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { iterations: -1 }
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.logoContainer, { transform: [{ rotate }] }]}>
      <Svg width={90} height={90} viewBox="0 0 400 400">
        {/* Center circle */}
        <Circle cx="200" cy="200" r="30" fill="#FF006E"/>
        
        {/* Top circle */}
        <Circle cx="200" cy="80" r="60" fill="#FF6BA7"/>
        
        {/* Top right circle */}
        <Circle cx="284.85" cy="115.15" r="50" fill="#FFB3D4"/>
        
        {/* Right circle */}
        <Circle cx="320" cy="200" r="60" fill="#FF6BA7"/>
        
        {/* Bottom right circle */}
        <Circle cx="284.85" cy="284.85" r="50" fill="#FFB3D4"/>
        
        {/* Bottom circle */}
        <Circle cx="200" cy="320" r="60" fill="#FF6BA7"/>
        
        {/* Bottom left circle */}
        <Circle cx="115.15" cy="284.85" r="50" fill="#FFB3D4"/>
        
        {/* Left circle */}
        <Circle cx="80" cy="200" r="60" fill="#FF6BA7"/>
        
        {/* Top left circle */}
        <Circle cx="115.15" cy="115.15" r="50" fill="#FFB3D4"/>
      </Svg>
    </Animated.View>
  );
};

export default function LandingPage({ navigation }) {
  const { t, language, setLanguage } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) throw error;

      console.log('Connexion réussie!', data.user);
      // La redirection se fera automatiquement via onAuthStateChange

    } catch (error) {
      setError(error.message);
      console.error('Erreur connexion:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(
        t.common.error,
        language === 'fr' 
          ? 'Veuillez entrer votre email pour réinitialiser votre mot de passe.'
          : 'Please enter your email to reset your password.',
        [{ text: t.common.ok }]
      );
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: 'helene://reset-password',
        }
      );

      if (error) throw error;

      Alert.alert(
        language === 'fr' ? 'Email envoyé' : 'Email sent',
        language === 'fr' 
          ? 'Un lien de réinitialisation a été envoyé à votre adresse email.'
          : 'A reset link has been sent to your email address.',
        [{ text: t.common.ok }]
      );
    } catch (error) {
      Alert.alert(t.common.error, error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = () => {
    Alert.alert(
      language === 'fr' ? 'Bientôt disponible' : 'Coming soon',
      language === 'fr' 
        ? 'La connexion avec Apple arrive dans une prochaine mise à jour.'
        : 'Apple sign-in is coming in a future update.',
      [{ text: t.common.ok }]
    );
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      language === 'fr' ? 'Bientôt disponible' : 'Coming soon',
      language === 'fr'
        ? 'La connexion avec Google arrive dans une prochaine mise à jour.'
        : 'Google sign-in is coming in a future update.',
      [{ text: t.common.ok }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <RotatingLogo />
            <Text style={styles.logoText}>{t.landing.title}</Text>
            <Text style={styles.tagline}>{t.landing.tagline}</Text>
            
            {/* Language Toggle */}
            <View style={styles.languageToggle}>
              <TouchableOpacity 
                style={[styles.langButton, language === 'fr' && styles.langButtonActive]}
                onPress={() => setLanguage('fr')}
              >
                <Text style={[styles.langText, language === 'fr' && styles.langTextActive]}>FR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.langButton, language === 'en' && styles.langButtonActive]}
                onPress={() => setLanguage('en')}
              >
                <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>EN</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Form */}
          <View style={styles.formSection}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder={t.landing.email}
              placeholderTextColor={COLORS.gray[300]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t.landing.password}
                placeholderTextColor={COLORS.gray[300]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={22} 
                  color={COLORS.gray[400]} 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.continueButton, loading && styles.buttonDisabled]} 
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={loading || !email || !password}
            >
              <Text style={styles.continueButtonText}>
                {loading ? t.landing.loggingIn : t.landing.login}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>{t.landing.forgotPassword}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.signupButton} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('signup')}
            >
              <Text style={styles.signupButtonText}>{t.landing.createAccount}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl * 1.5,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxl * 2,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logoText: {
    fontSize: 48,
    fontFamily: 'Times New Roman',
    fontStyle: 'italic',
    color: COLORS.secondary,
    fontWeight: '400',
    marginTop: SPACING.lg,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.gray[400],
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  languageToggle: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  langButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
  },
  langButtonActive: {
    backgroundColor: COLORS.primary,
  },
  langText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[400],
  },
  langTextActive: {
    color: COLORS.white,
  },
  formSection: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.lg,
    fontSize: 16,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  passwordInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.lg,
    paddingRight: 50,
    fontSize: 16,
    color: COLORS.secondary,
  },
  eyeIcon: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.md + 6,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  forgotPasswordText: {
    color: COLORS.gray[400],
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: SPACING.lg,
  },
  signupButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  signupButtonText: {
    color: COLORS.gray[500],
    fontSize: 15,
    fontWeight: '500',
  },
});
