import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';

export function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const token: string = route.params?.token ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      Alert.alert('Enlace inválido', 'El enlace de recuperación no es válido o ya expiró.', [
        { text: 'Volver', onPress: () => navigation.replace('Login') },
      ]);
    }
  }, [token]);

  const handleReset = async () => {
    if (password.length < 8) {
      Alert.alert('Contraseña muy corta', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('No coinciden', 'Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await apiService.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.response?.data?.message ?? 'El enlace expiró o ya fue usado. Solicitá uno nuevo.',
      );
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
          <TouchableOpacity style={styles.back} onPress={() => navigation.replace('Login')}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Ionicons name={done ? 'checkmark-circle' : 'lock-open'} size={40} color={done ? colors.success ?? '#10B981' : colors.primary} />
            </View>

            {!done ? (
              <>
                <Text style={styles.title}>Nueva contraseña</Text>
                <Text style={styles.subtitle}>
                  Ingresá tu nueva contraseña. Debe tener al menos 8 caracteres.
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Nueva contraseña"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Repetir contraseña"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btn, (loading || !password || !confirm) && styles.btnDisabled]}
                  onPress={handleReset}
                  disabled={loading || !password || !confirm}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator size="small" color="white" />
                    : <Text style={styles.btnText}>Cambiar contraseña</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>¡Contraseña cambiada!</Text>
                <Text style={styles.subtitle}>
                  Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión.
                </Text>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => navigation.replace('Login')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnText}>Ir al login</Text>
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.base,
    width: '100%',
    marginTop: spacing.xs,
  },
  inputIcon: { marginRight: spacing.sm },
  input: {
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
    minHeight: 50,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: 'white',
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
  },
});
