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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, SPACING } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RotatingLogo = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.logoContainer, { transform: [{ rotate }] }]}>
      <Svg width={200} height={200} viewBox="0 0 400 400">
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

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <RotatingLogo />
          <Text style={styles.logoText}>Hélène</Text>
          <Text style={styles.tagline}>Votre bien-être au quotidien</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formSection}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.gray[400]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={COLORS.gray[400]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />

          <TouchableOpacity style={styles.loginButton} activeOpacity={0.8}>
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupButton} activeOpacity={0.7}>
            <Text style={styles.signupButtonText}>Créer un compte</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logoText: {
    fontSize: 48,
    fontStyle: 'italic',
    color: COLORS.secondary,
    fontWeight: '400',
    marginTop: SPACING.lg,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.gray[600],
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  formSection: {
    width: '100%',
    paddingBottom: SPACING.xl,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    fontSize: 16,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  signupButtonText: {
    color: COLORS.secondary,
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  forgotPasswordText: {
    color: COLORS.gray[500],
    fontSize: 14,
    fontStyle: 'italic',
  },
});
