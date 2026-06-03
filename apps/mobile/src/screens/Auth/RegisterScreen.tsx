import React, { useState } from 'react';
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
import { register } from '../../store/slices/authSlice';
import { colors, spacing, typography, borderRadius } from '../../theme';

export function RegisterScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);

  const [form, setForm] = useState({ email: '', username: '', displayName: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);

  const isValid = form.email && form.username && form.displayName && form.password.length >= 8 && form.password === form.confirmPassword;

  const handleRegister = async () => {
    if (!isValid) return;
    const { confirmPassword, ...dto } = form;
    await dispatch(register({ ...dto, email: dto.email.toLowerCase(), username: dto.username.toLowerCase() }));
  };

  const update = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <LinearGradient colors={['#0F172A', '#1E293B', '#0D47A1']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>

            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>Únete a la comunidad del Mundial 2026 ⚽</Text>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {[
              { key: 'email', label: 'Correo electrónico', icon: 'mail-outline', keyboard: 'email-address', autocap: 'none' },
              { key: 'username', label: 'Nombre de usuario', icon: 'at-outline', keyboard: 'default', autocap: 'none' },
              { key: 'displayName', label: 'Nombre para mostrar', icon: 'person-outline', keyboard: 'default', autocap: 'words' },
            ].map(({ key, label, icon, keyboard, autocap }) => (
              <View key={key} style={styles.inputContainer}>
                <Ionicons name={icon as any} size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={label}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={form[key as keyof typeof form]}
                  onChangeText={update(key as keyof typeof form)}
                  keyboardType={keyboard as any}
                  autoCapitalize={autocap as any}
                />
              </View>
            ))}

            {[
              { key: 'password', label: 'Contraseña (min. 8 caracteres)' },
              { key: 'confirmPassword', label: 'Confirmar contraseña' },
            ].map(({ key, label }) => (
              <View key={key} style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={label}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={form[key as keyof typeof form]}
                  onChangeText={update(key as keyof typeof form)}
                  secureTextEntry={!showPass}
                />
                {key === 'password' && (
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: spacing.xs }}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
              <Text style={styles.matchError}>Las contraseñas no coinciden</Text>
            )}

            <TouchableOpacity
              style={[styles.button, (!isValid || isLoading) && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={!isValid || isLoading}
            >
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Crear cuenta gratis</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>
                ¿Ya tienes cuenta? <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.bold }}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.screen, paddingTop: spacing.xl },
  back: { marginBottom: spacing.lg },
  title: { color: 'white', fontSize: typography.fontSize.xxxl, fontFamily: typography.fontFamily.black, marginBottom: spacing.xs },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: typography.fontSize.sm, marginBottom: spacing.xl },
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
  },
  matchError: { color: colors.error, fontSize: typography.fontSize.xs, marginBottom: spacing.sm, marginLeft: spacing.xs },
  button: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.base,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  loginLink: { alignItems: 'center', marginTop: spacing.lg, paddingBottom: spacing.xl },
  loginText: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.sm },
});
