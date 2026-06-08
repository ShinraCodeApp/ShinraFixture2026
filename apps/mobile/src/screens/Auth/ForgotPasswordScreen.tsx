import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';

export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Ingresá tu email');
      return;
    }
    setLoading(true);
    try {
      await apiService.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch {
      // Always show success to avoid email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0D47A1', '#1A237E']} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Ionicons name={sent ? 'mail' : 'lock-open'} size={40} color={colors.primary} />
            </View>

            {!sent ? (
              <>
                <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
                <Text style={styles.subtitle}>
                  Ingresá tu email y te enviamos un enlace para restablecerla.
                </Text>

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
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btn, loading && styles.btnDisabled]}
                  onPress={handleSend}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnText}>
                    {loading ? 'Enviando...' : 'Enviar enlace'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>¡Revisá tu email!</Text>
                <Text style={styles.subtitle}>
                  Si existe una cuenta con <Text style={styles.emailHighlight}>{email}</Text>, vas a recibir un enlace para restablecer tu contraseña en los próximos minutos.
                </Text>
                <Text style={styles.tip}>
                  No lo encontrás? Revisá la carpeta de spam.
                </Text>

                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnText}>Volver al login</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: { flex: 1 },
  back: { padding: spacing.base },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
  emailHighlight: {
    color: 'white',
    fontFamily: typography.fontFamily.semiBold,
  },
  tip: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
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
    marginTop: spacing.sm,
  },
  inputIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    color: 'white',
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.md,
  },
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
});
