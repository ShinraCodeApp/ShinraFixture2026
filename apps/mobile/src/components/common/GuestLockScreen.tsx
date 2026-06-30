import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { clearGuest } from '../../store/slices/authSlice';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface Props {
  title?: string;
  message?: string;
}

export function GuestLockScreen({
  title = 'Creá tu cuenta gratis',
  message = 'Para acceder a esta sección necesitás una cuenta. ¡Es rápido y gratis!',
}: Props) {
  const dispatch = useDispatch<AppDispatch>();

  return (
    <View style={s.container}>
      <View style={s.iconCircle}>
        <Ionicons name="lock-closed" size={36} color={colors.primary} />
      </View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.message}>{message}</Text>
      <TouchableOpacity
        style={s.btnPrimary}
        onPress={() => dispatch(clearGuest())}
        activeOpacity={0.85}
      >
        <Ionicons name="person-add-outline" size={18} color="white" />
        <Text style={s.btnPrimaryText}>Registrarse / Iniciar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.base,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
    color: '#1a1a2e',
  },
  message: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  btnPrimaryText: {
    color: 'white',
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
  },
});
