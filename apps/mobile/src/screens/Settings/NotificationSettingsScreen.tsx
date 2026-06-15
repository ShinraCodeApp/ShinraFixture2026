import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';
import {
  NotifPrefs, DEFAULT_PREFS, getNotifPrefs, saveNotifPrefs,
} from '../../utils/notifPrefs';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

const ITEMS: {
  key: keyof NotifPrefs;
  icon: string;
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    key: 'partidos',
    icon: 'soccer',
    label: 'Partidos',
    desc: 'Aviso 15 min antes de cada partido y al iniciar',
    color: colors.primary,
  },
  {
    key: 'goles',
    icon: 'lightning-bolt',
    label: 'Goles',
    desc: 'Notificación inmediata cuando se marca un gol',
    color: '#FF9800',
  },
  {
    key: 'resultados',
    icon: 'flag-checkered',
    label: 'Resultados finales',
    desc: 'Cuando el árbitro pita el final del partido',
    color: '#4CAF50',
  },
  {
    key: 'predicciones',
    icon: 'target',
    label: 'Mis predicciones',
    desc: 'Resultado de tus pronósticos y puntos ganados',
    color: '#9C27B0',
  },
];

export function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const { appColors } = useAppTheme();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifPrefs().then((p) => { setPrefs(p); setLoading(false); });
  }, []);

  const toggle = async (key: keyof NotifPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await saveNotifPrefs(next);
  };

  const allOn = Object.values(prefs).every(Boolean);
  const toggleAll = async () => {
    const next: NotifPrefs = { partidos: !allOn, goles: !allOn, resultados: !allOn, predicciones: !allOn };
    setPrefs(next);
    await saveNotifPrefs(next);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <LinearGradient colors={['#1565C0', '#0D47A1']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={{ width: 26 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: appColors.textSecondary }]}>CONTROL GENERAL</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface }, shadows.sm]}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="bell" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: appColors.text }]}>
                {allOn ? 'Desactivar todas' : 'Activar todas'}
              </Text>
              <Text style={[styles.rowDesc, { color: appColors.textSecondary }]}>
                Toggle rápido para todas las categorías
              </Text>
            </View>
            <Switch
              value={allOn}
              onValueChange={toggleAll}
              trackColor={{ false: appColors.border, true: colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: appColors.textSecondary }]}>POR CATEGORÍA</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface }, shadows.sm]}>
          {ITEMS.map((item, i) => (
            <View key={item.key}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: appColors.border }]} />}
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: appColors.text }]}>{item.label}</Text>
                  <Text style={[styles.rowDesc, { color: appColors.textSecondary }]}>{item.desc}</Text>
                </View>
                <Switch
                  value={loading ? true : prefs[item.key]}
                  onValueChange={(v) => toggle(item.key, v)}
                  trackColor={{ false: appColors.border, true: item.color }}
                  thumbColor="white"
                />
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.hint, { color: appColors.textSecondary }]}>
          Las notificaciones mientras la app está cerrada dependen de los permisos del sistema operativo. Podés gestionarlos desde Ajustes del teléfono.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.screen, paddingBottom: spacing.lg,
  },
  headerTitle: { color: 'white', fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  scroll: { padding: spacing.screen, paddingBottom: 60, gap: spacing.sm },
  sectionLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold, letterSpacing: 0.5, marginTop: spacing.sm },
  card: { borderRadius: borderRadius.xl, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.base },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  rowDesc: { fontSize: typography.fontSize.xs, marginTop: 2, lineHeight: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.base },
  hint: { fontSize: typography.fontSize.xs, lineHeight: 18, textAlign: 'center', paddingHorizontal: spacing.sm, marginTop: spacing.sm },
});
