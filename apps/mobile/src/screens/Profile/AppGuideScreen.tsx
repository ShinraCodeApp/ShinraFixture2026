import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

const SECTIONS = [
  {
    icon: 'soccer' as const,
    title: 'Fixture — Tabla',
    color: '#22C55E',
    steps: [
      'Abrí la pestaña Fixture en la barra inferior.',
      'Elegí el torneo (WC 2026, Champions, Copa América, etc.) en las pastillas de arriba.',
      'Tocá la letra del grupo (A–L) para ver las posiciones de ese grupo.',
      'Tocá "Ver detalle del Grupo X" o directamente sobre la tabla para abrir el detalle con partidos y resultados.',
      'Dentro del detalle podés cargar el resultado de un partido con el botón "Cargar resultado" — ingresá goles, tipo (pie/cabeza/penal), asistencias, faltas y lesiones.',
    ],
  },
  {
    icon: 'calendar' as const,
    title: 'Partidos',
    color: '#3B82F6',
    steps: [
      'La pestaña Partidos muestra todos los partidos del torneo organizados por día y hora.',
      'Usá las pastillas del torneo para filtrar (WC 2026, UCL, AFCON, etc.).',
      'Los partidos de hoy se destacan en verde con el cartel 📅 HOY.',
      'Los partidos en vivo muestran el marcador en rojo 🔴.',
      'Tocá cualquier partido para ver el detalle completo.',
    ],
  },
  {
    icon: 'lightning-bolt' as const,
    title: 'Predicciones',
    color: '#F59E0B',
    steps: [
      'Antes de que empiece cada partido podés predecir el resultado.',
      'Ingresá cuántos goles hacés cada equipo (ej: Argentina 2 — Francia 1).',
      'El sistema puntúa según qué tan cerca estuviste:',
      '  🥇 Resultado exacto → 5 puntos',
      '  🥈 Diferencia de goles correcta → 4 puntos',
      '  🥉 Solo acertaste el ganador → 3 puntos',
      'Las predicciones se cierran 15 minutos antes de que empiece el partido.',
      'Acumulá puntos para subir en el ranking global.',
    ],
  },
  {
    icon: 'account-group' as const,
    title: 'Quinielas',
    color: '#8B5CF6',
    steps: [
      'En Predicciones → Quinielas podés crear un grupo privado con amigos.',
      'Tocá el botón "+" para crear una quiniela. Ponele nombre y elegí el premio del torneo (Asado, Fernet+Coca, Birra, o personalizado).',
      'Activá la opción "Mini-apuesta por partido" para que cada partido tenga su propia apuesta.',
      'Compartí el código con tus amigos — ellos entran tocando el botón de ingreso e introduciendo el código.',
      'Todos predicen los mismos partidos. Al terminar un partido se ve quién ganó esa mini-apuesta.',
      'Al final del torneo, quien más puntos acumuló se lleva el premio acordado.',
      'El dueño del grupo puede editar el premio de cualquier partido tocando el lápiz ✏️.',
    ],
  },
  {
    icon: 'trophy' as const,
    title: 'Logros y XP',
    color: '#F59E0B',
    steps: [
      'Con cada predicción correcta ganás XP y subís de nivel (1–10+).',
      'Los logros se desbloquean automáticamente:',
      '  🏆 Primer Pronóstico: tu primera predicción.',
      '  🔥 Racha x5 / x10 / x20: predicciones correctas consecutivas.',
      '  🔮 Clarividente: acertaste al campeón del mundo.',
      '  👑 Rey de la Quiniela: ganaste una quiniela grupal.',
      'Los logros dan XP extra — mirá tu colección en Mis logros.',
    ],
  },
  {
    icon: 'cog' as const,
    title: 'Configuración',
    color: '#6B7280',
    steps: [
      'En Perfil → Configuración podés:',
      '  🌍 Cambiar el idioma: Español (ES) o Inglés (EN). Los nombres de equipos cambian en toda la app.',
      '  🌙 Cambiar entre modo claro y oscuro.',
      '  ⭐ Elegir tu equipo favorito — su bandera aparece como fondo en el Fixture.',
      'Tu foto de perfil: tocá el avatar en Perfil para cambiarla desde la galería.',
    ],
  },
  {
    icon: 'crown' as const,
    title: 'Premium',
    color: '#F59E0B',
    steps: [
      'ShinraFixture Premium desbloquea:',
      '  🤖 Análisis con IA (GPT-4) de cada partido.',
      '  📊 Estadísticas avanzadas de equipos y jugadores.',
      '  🔔 Notificaciones personalizadas en tiempo real.',
      '  🚫 Sin publicidad.',
      'Costo: $4.99/mes o $39.99/año.',
    ],
  },
];

export function AppGuideScreen() {
  const { appColors } = useAppTheme();
  const navigation = useNavigation();
  const [openSection, setOpenSection] = useState<number | null>(0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={appColors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: appColors.text }]}>Cómo usar la app</Text>
          <Text style={[styles.subtitle, { color: appColors.textSecondary }]}>Guía completa de ShinraFixture 2026</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Intro */}
        <View style={[styles.introBanner, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
          <Text style={styles.introEmoji}>🌍</Text>
          <Text style={[styles.introText, { color: appColors.text }]}>
            ShinraFixture 2026 es tu app para seguir el Mundial, competir con amigos en quinielas y predecir resultados.
          </Text>
        </View>

        {/* Accordion sections */}
        {SECTIONS.map((section, idx) => {
          const isOpen = openSection === idx;
          return (
            <View key={idx} style={[styles.card, { backgroundColor: appColors.surface }]}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setOpenSection(isOpen ? null : idx)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: section.color + '22' }]}>
                  <MaterialCommunityIcons name={section.icon} size={20} color={section.color} />
                </View>
                <Text style={[styles.cardTitle, { color: appColors.text }]}>{section.title}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={appColors.textSecondary}
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={[styles.cardBody, { borderTopColor: appColors.border }]}>
                  {section.steps.map((step, si) => (
                    <View key={si} style={styles.stepRow}>
                      {!step.startsWith('  ') && (
                        <View style={[styles.stepDot, { backgroundColor: section.color }]} />
                      )}
                      <Text style={[
                        styles.stepText,
                        { color: step.startsWith('  ') ? appColors.textSecondary : appColors.text },
                        step.startsWith('  ') && styles.stepIndented,
                      ]}>
                        {step.trim()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Points table */}
        <View style={[styles.card, { backgroundColor: appColors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#F59E0B22' }]}>
              <MaterialCommunityIcons name="star" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.cardTitle, { color: appColors.text }]}>Sistema de puntos</Text>
          </View>
          <View style={[styles.cardBody, { borderTopColor: appColors.border }]}>
            {[
              { medal: '🥇', desc: 'Resultado exacto (ej: 2–1)', pts: '5 pts' },
              { medal: '🥈', desc: 'Diferencia de goles correcta', pts: '4 pts' },
              { medal: '🥉', desc: 'Ganador correcto', pts: '3 pts' },
              { medal: '❌', desc: 'Resultado incorrecto', pts: '0 pts' },
            ].map((row) => (
              <View key={row.desc} style={styles.pointsRow}>
                <Text style={styles.pointsMedal}>{row.medal}</Text>
                <Text style={[styles.pointsDesc, { color: appColors.textSecondary }]}>{row.desc}</Text>
                <Text style={[styles.pointsPts, { color: colors.primary }]}>{row.pts}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.footer, { color: appColors.textSecondary }]}>
          ShinraFixture 2026 v1.0.0 · Hecho con ❤️ para el Mundial
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  title: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  subtitle: { fontSize: typography.fontSize.xs },
  content: { padding: spacing.base, gap: spacing.sm, paddingBottom: 60 },
  introBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1,
    marginBottom: spacing.xs,
  },
  introEmoji: { fontSize: 28 },
  introText: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, lineHeight: 20 },
  card: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.base,
  },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { flex: 1, fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold },
  cardBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.base,
    gap: spacing.sm,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stepDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  stepText: { flex: 1, fontSize: typography.fontSize.sm, lineHeight: 20 },
  stepIndented: { paddingLeft: spacing.sm, fontSize: typography.fontSize.xs, lineHeight: 18 },
  pointsRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pointsMedal: { fontSize: 20, width: 28, textAlign: 'center' },
  pointsDesc: { flex: 1, fontSize: typography.fontSize.sm },
  pointsPts: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  footer: { textAlign: 'center', fontSize: typography.fontSize.xs, marginTop: spacing.sm },
});
