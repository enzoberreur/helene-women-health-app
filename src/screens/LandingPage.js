import React, { useEffect, useRef, useState } from 'react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleAppleLogin = () => {
    Alert.alert(
      'Bientôt disponible',
      'La connexion avec Apple arrive dans une prochaine mise à jour.',
      [{ text: 'OK' }]
    );
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      'Bientôt disponible',
      'La connexion avec Google arrive dans une prochaine mise à jour.',
      [{ text: 'OK' }]
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
            <Text style={styles.logoText}>Hélène</Text>
            <Text style={styles.tagline}>Votre compagne ménopause</Text>
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
              placeholder="Email"
              placeholderTextColor={COLORS.gray[300]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor={COLORS.gray[300]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
            />

            <TouchableOpacity 
              style={[styles.continueButton, loading && styles.buttonDisabled]} 
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={loading || !email || !password}
            >
              <Text style={styles.continueButtonText}>
                {loading ? 'Connexion...' : 'CONTINUER →'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity 
                style={styles.socialButton} 
                activeOpacity={0.8}
                onPress={handleAppleLogin}
                disabled={loading}
              >
                <Ionicons name="logo-apple" size={20} color={COLORS.secondary} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButton} 
                activeOpacity={0.8}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Ionicons name="logo-google" size={20} color={COLORS.secondary} />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.signupButton} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('signup')}
            >
              <Text style={styles.signupButtonText}>Créer un compte</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
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
    justifyContent: 'space-evenly',
    paddingHorizontal: SPACING.xl,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  logoContainer: {
    marginBottom: SPACING.md,
  },
  logoText: {
    fontSize: 40,
    fontFamily: 'Times New Roman',
    fontStyle: 'italic',
    color: COLORS.secondary,
    fontWeight: '400',
    marginTop: SPACING.md,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: COLORS.gray[400],
    marginTop: SPACING.xs,
  },
  formSection: {
    width: '100%',
    paddingBottom: SPACING.lg,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 0,
    borderRadius: 14,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    fontSize: 15,
    color: COLORS.secondary,
    marginBottom: SPACING.sm + 4,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray[200],
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: 13,
    color: COLORS.gray[400],
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm + 4,
    marginBottom: SPACING.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
    paddingVertical: SPACING.md + 2,
    borderRadius: 14,
    gap: SPACING.sm,
  },
  socialButtonText: {
    color: COLORS.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm + 4,
  },
  signupButtonText: {
    color: COLORS.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  forgotPasswordText: {
    color: COLORS.gray[400],
    fontSize: 14,
  },
});
