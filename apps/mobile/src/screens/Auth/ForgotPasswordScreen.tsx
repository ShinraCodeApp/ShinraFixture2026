import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';

type Step = 'email' | 'code' | 'done';

export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const codeRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSendCode = async () => {
    if (!email.trim()) { setError('Ingresá tu email'); return; }
    setError('');
    setLoading(true);
    try {
      await apiService.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
    } catch {
      // Always proceed to avoid email enumeration
    } finally {
      setLoading(false);
    }
    setStep('code');
  };

  const handleReset = async () => {
    if (!code.trim() || code.length !== 6) { setError('Ingresá el código de 6 dígitos'); return; }
    if (password.length < 8) { setError('La contraseña debe tener mínimo 8 caracteres'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    setError('');
    setLoading(true);
    try {
      await apiService.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
      });
      setStep('done');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Código inválido o expirado';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0D47A1', '#1A237E']} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.content}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={step === 'done' ? 'checkmark-circle' : step === 'code' ? 'keypad' : 'lock-open'}
                  size={40}
                  color={step === 'done' ? '#00C851' : colors.primary}
                />
              </View>

              {/* Step: Email */}
              {step === 'email' && (
                <>
                  <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
                  <Text style={styles.subtitle}>
                    Ingresá tu email y te enviamos un código de 6 dígitos para restablecerla.
                  </Text>
                  {error ? <Text style={styles.error}>{error}</Text> : null}
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="tu@email.com"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="send"
                      onSubmitEditing={handleSendCode}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.btn, loading && styles.btnDisabled]}
                    onPress={handleSendCode}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading
                      ? <ActivityIndicator color="white" />
                      : <Text style={styles.btnText}>Enviar código</Text>
                    }
                  </TouchableOpacity>
                </>
              )}

              {/* Step: Code + New Password */}
              {step === 'code' && (
                <>
                  <Text style={styles.title}>Revisá tu email</Text>
                  <Text style={styles.subtitle}>
                    Enviamos un código de 6 dígitos a{' '}
                    <Text style={styles.emailHighlight}>{email}</Text>.{'\n'}
                    Ingresalo junto con tu nueva contraseña.
                  </Text>
                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <View style={styles.inputWrapper}>
                    <Ionicons name="keypad-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                    <TextInput
                      ref={codeRef}
                      style={[styles.input, styles.codeInput]}
                      placeholder="000000"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={code}
                      onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      returnKeyType="next"
                      onSubmitEditing={() => passRef.current?.focus()}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                    <TextInput
                      ref={passRef}
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Nueva contraseña (mín. 8 caracteres)"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPass}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                    />
                    <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eye}>
                      <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                    <TextInput
                      ref={confirmRef}
                      style={styles.input}
                      placeholder="Confirmar contraseña"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPass}
                      returnKeyType="done"
                      onSubmitEditing={handleReset}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.btn, loading && styles.btnDisabled]}
                    onPress={handleReset}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading
                      ? <ActivityIndicator color="white" />
                      : <Text style={styles.btnText}>Restablecer contraseña</Text>
                    }
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.resend} onPress={handleSendCode} disabled={loading}>
                    <Text style={styles.resendText}>¿No recibiste el código? Reenviar</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Step: Done */}
              {step === 'done' && (
                <>
                  <Text style={styles.title}>¡Contraseña restablecida!</Text>
                  <Text style={styles.subtitle}>
                    Tu contraseña fue cambiada exitosamente. Ya podés iniciar sesión con la nueva contraseña.
                  </Text>
                  <TouchableOpacity
                    style={styles.btn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnText}>Ir al login</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1 },
  back: { padding: spacing.base },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: 'white',
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: { color: 'white', fontFamily: typography.fontFamily.semiBold },
  error: {
    color: '#fca5a5',
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.base,
    width: '100%',
  },
  inputIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    color: 'white',
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.md,
    fontFamily: typography.fontFamily.regular,
  },
  codeInput: {
    fontSize: 28,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 8,
    textAlign: 'center',
  },
  eye: { padding: spacing.xs },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: 'white',
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
  },
  resend: { marginTop: spacing.sm },
  resendText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: typography.fontSize.sm,
    textDecorationLine: 'underline',
  },
});
