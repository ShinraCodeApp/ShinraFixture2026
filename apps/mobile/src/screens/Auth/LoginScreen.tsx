import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '../../store';
import { login, setHasSeenOnboarding, clearError } from '../../store/slices/authSlice';
import { colors, spacing, typography, borderRadius } from '../../theme';

type LoginMode = 'email' | 'username';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);

  const [mode, setMode] = useState<LoginMode>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    dispatch(clearError());
  }, []);

  // Persist error locally so it doesn't disappear when user retries
  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    setIdentifier('');
    setLocalError(null);
    dispatch(clearError());
    setTimeout(() => identifierRef.current?.focus(), 100);
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) return;
    setLocalError(null);
    await dispatch(login({ identifier: identifier.trim(), password, rememberMe }));
  };

  const displayError = localError;

  return (
    <LinearGradient colors={['#0D47A1', '#1565C0', '#0F172A']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Text style={styles.logoText}>S</Text>
                </View>
              </View>
              <Text style={styles.title}>ShinraFixture</Text>
              <Text style={styles.subtitle}>Copa Mundial 2026</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.formTitle}>Iniciar sesión</Text>

              {/* Mode toggle */}
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeTab, mode === 'email' && styles.modeTabActive]}
                  onPress={() => switchMode('email')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail-outline" size={14} color={mode === 'email' ? 'white' : 'rgba(255,255,255,0.5)'} />
                  <Text style={[styles.modeTabText, mode === 'email' && styles.modeTabTextActive]}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeTab, mode === 'username' && styles.modeTabActive]}
                  onPress={() => switchMode('username')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="at-outline" size={14} color={mode === 'username' ? 'white' : 'rgba(255,255,255,0.5)'} />
                  <Text style={[styles.modeTabText, mode === 'username' && styles.modeTabTextActive]}>Usuario</Text>
                </TouchableOpacity>
              </View>

              {displayError && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{displayError}</Text>
                  <TouchableOpacity onPress={() => setLocalError(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={14} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Ionicons
                  name={mode === 'email' ? 'mail-outline' : 'at-outline'}
                  size={18}
                  color="rgba(255,255,255,0.5)"
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={identifierRef}
                  style={styles.input}
                  placeholder={mode === 'email' ? 'Correo electrónico' : 'Nombre de usuario'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={identifier}
                  onChangeText={(t) => { setIdentifier(t); setLocalError(null); }}
                  keyboardType={mode === 'email' ? 'email-address' : 'default'}
                  autoCapitalize="none"
                  autoComplete={mode === 'email' ? 'email' : 'username'}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Contraseña"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setLocalError(null); }}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>

              <View style={styles.rememberRow}>
                <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={12} color="white" />}
                  </View>
                  <Text style={styles.rememberText}>Recordarme</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => (navigation as any).navigate('ForgotPassword')}>
                  <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, (isLoading || !identifier.trim() || !password) && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading || !identifier.trim() || !password}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.loginButtonText}>Entrar</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerText}>
                  ¿No tienes cuenta? <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.bold }}>Regístrate gratis</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.guestLink} onPress={() => dispatch(setHasSeenOnboarding())}>
                <Text style={styles.guestText}>Continuar sin cuenta</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.screen },
  header: { alignItems: 'center', marginBottom: spacing.xxxl },
  logoContainer: { marginBottom: spacing.base },
  logo: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: 'white', fontSize: 32, fontFamily: typography.fontFamily.black },
  title: { color: 'white', fontSize: typography.fontSize.xxxl, fontFamily: typography.fontFamily.black },
  subtitle: { color: colors.accent, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  form: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  formTitle: { color: 'white', fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, marginBottom: spacing.base },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.base,
  },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  modeTabActive: { backgroundColor: colors.primary },
  modeTabText: { color: 'rgba(255,255,255,0.5)', fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  modeTabTextActive: { color: 'white', fontFamily: typography.fontFamily.bold },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: borderRadius.md,
    padding: spacing.sm, marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)',
  },
  errorText: { color: '#fca5a5', fontSize: typography.fontSize.sm, flex: 1 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.base,
  },
  inputIcon: { marginRight: spacing.sm },
  input: {
    flex: 1, paddingVertical: spacing.md,
    color: 'white', fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
  },
  eyeButton: { padding: spacing.xs },
  rememberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  rememberText: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.sm },
  forgotText: { color: 'rgba(255,255,255,0.6)', fontSize: typography.fontSize.sm },
  loginButton: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  loginButtonText: { color: 'white', fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.base },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.2)' },
  dividerText: { color: 'rgba(255,255,255,0.4)', fontSize: typography.fontSize.sm },
  registerLink: { alignItems: 'center', marginBottom: spacing.sm },
  registerText: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.sm },
  guestLink: { alignItems: 'center' },
  guestText: { color: 'rgba(255,255,255,0.4)', fontSize: typography.fontSize.xs, textDecorationLine: 'underline' },
});
