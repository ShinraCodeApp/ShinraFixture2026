import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';
import { useSelector } from 'react-redux';

import { RootState } from '../../store';
import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { track } from '../../utils/analytics';

export const PENDING_INVITE_KEY = 'pendingQuinielaCode';
export const INVITE_BASE_URL = 'https://shinracode.github.io/ShinraFixture2026/quiniela/join/?code=';

export function QuinielaInviteScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);

  const code: string = route.params?.code ?? '';

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['quiniela-invite', code],
    queryFn: async () => {
      const r = await apiService.get(`/quiniela/invite-info/${encodeURIComponent(code)}`);
      return r.data.data;
    },
    enabled: code.length > 0,
    retry: 1,
  });

  const joinMutation = useMutation({
    mutationFn: async () =>
      (await apiService.post('/quiniela/join', { inviteCode: code.toUpperCase() })).data.data,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['quinielas'] });
      track('quiniela_joined_via_invite', { groupId: group.id });
      showMessage({ message: `¡Entraste a "${group.name}"!`, type: 'success' });
      navigation.navigate('PredictionsTab', {
        screen: 'QuinielaDetail',
        params: { quinielaId: group.id },
      });
    },
    onError: (e: any) => {
      showMessage({ message: e?.response?.data?.error ?? 'No se pudo unir', type: 'danger' });
    },
  });

  const handleJoin = async () => {
    if (!isAuthenticated) {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, code);
      navigation.navigate('Auth', { screen: 'Register' });
      return;
    }
    joinMutation.mutate();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={26} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: appColors.text }]}>Invitación</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: appColors.textSecondary }]}>
              Cargando quiniela...
            </Text>
          </View>
        )}

        {isError && (
          <View style={styles.center}>
            <MaterialCommunityIcons name="link-off" size={64} color={appColors.textSecondary} />
            <Text style={[styles.errorTitle, { color: appColors.text }]}>Enlace inválido</Text>
            <Text style={[styles.errorSub, { color: appColors.textSecondary }]}>
              El código de invitación no existe o la quiniela ya no está activa.
            </Text>
            <TouchableOpacity style={styles.goBack} onPress={() => navigation.goBack()}>
              <Text style={styles.goBackText}>Volver</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !isError && preview && (
          <View style={styles.card}>
            <LinearGradient
              colors={[colors.primary + '22', colors.primary + '05']}
              style={styles.gradient}
            >
              <MaterialCommunityIcons name="account-group" size={56} color={colors.primary} />
              <Text style={[styles.groupName, { color: appColors.text }]}>{preview.name}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {preview.memberCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: appColors.textSecondary }]}>
                    miembros
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: appColors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {preview.maxMembers}
                  </Text>
                  <Text style={[styles.statLabel, { color: appColors.textSecondary }]}>
                    máximo
                  </Text>
                </View>
              </View>

              {preview.prizeDescription && (
                <View style={[styles.prizeRow, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '44' }]}>
                  <MaterialCommunityIcons name="trophy" size={16} color={colors.accent} />
                  <Text style={[styles.prizeText, { color: colors.accent }]}>
                    Premio: {preview.prizeDescription}
                  </Text>
                </View>
              )}

              {preview.isFull && (
                <View style={[styles.fullBadge, { backgroundColor: '#EF444422', borderColor: '#EF444444' }]}>
                  <Ionicons name="lock-closed" size={14} color="#EF4444" />
                  <Text style={[styles.fullText, { color: '#EF4444' }]}>Quiniela llena</Text>
                </View>
              )}
            </LinearGradient>

            <TouchableOpacity
              style={[
                styles.joinBtn,
                { backgroundColor: preview.isFull ? appColors.border : colors.primary },
              ]}
              onPress={handleJoin}
              disabled={preview.isFull || joinMutation.isPending}
            >
              {joinMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="enter-outline" size={20} color="white" />
                  <Text style={styles.joinBtnText}>
                    {!isAuthenticated
                      ? 'Registrate para unirte'
                      : preview.isFull
                      ? 'Quiniela llena'
                      : 'Unirse a la quiniela'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!isAuthenticated && (
              <TouchableOpacity
                style={styles.loginLink}
                onPress={async () => {
                  await AsyncStorage.setItem(PENDING_INVITE_KEY, code);
                  navigation.navigate('Auth', { screen: 'Login' });
                }}
              >
                <Text style={[styles.loginLinkText, { color: colors.primary }]}>
                  ¿Ya tenés cuenta? Iniciar sesión
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.semiBold },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.screen },

  center: { alignItems: 'center', gap: spacing.md, paddingVertical: 40 },
  loadingText: { fontSize: typography.fontSize.sm },
  errorTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  errorSub: { fontSize: typography.fontSize.sm, textAlign: 'center' },
  goBack: {
    marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: colors.primary,
  },
  goBackText: { color: 'white', fontFamily: typography.fontFamily.semiBold },

  card: { gap: spacing.md },
  gradient: {
    borderRadius: borderRadius.xl, padding: spacing.xl,
    alignItems: 'center', gap: spacing.md,
  },
  groupName: {
    fontSize: 22, fontFamily: typography.fontFamily.bold, textAlign: 'center',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 22, fontFamily: typography.fontFamily.bold },
  statLabel: { fontSize: 11 },
  divider: { width: 1, height: 32 },
  prizeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full, borderWidth: 1,
  },
  prizeText: { fontSize: 13, fontFamily: typography.fontFamily.medium },
  fullBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full, borderWidth: 1,
  },
  fullText: { fontSize: 13, fontFamily: typography.fontFamily.medium },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg, minHeight: 52,
  },
  joinBtnText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.md },
  loginLink: { alignItems: 'center', paddingVertical: spacing.sm },
  loginLinkText: { fontSize: 13, fontFamily: typography.fontFamily.medium },
});
