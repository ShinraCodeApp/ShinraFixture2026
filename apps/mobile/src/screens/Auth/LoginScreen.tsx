import React, { useState, useEffect } from 'react';
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

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    dispatch(clearError());
  }, []);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    await dispatch(login({ email: email.trim().toLowerCase(), password }));
  };

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

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Contraseña"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.forgotLink} onPress={() => (navigation as any).navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginButton, (isLoading || !email || !password) && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading || !email || !password}
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
  formTitle: { color: 'white', fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, marginBottom: spacing.lg },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: borderRadius.md,
    padding: spacing.sm, marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: colors.error, fontSize: typography.fontSize.sm, flex: 1 },
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
  forgotLink: { alignSelf: 'flex-end', marginBottom: spacing.base },
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
