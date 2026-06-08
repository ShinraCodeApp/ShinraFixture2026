import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { setHasSeenOnboarding } from '../../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius } from '../../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    icon: 'soccer',
    title: 'Fixture en tiempo real',
    subtitle: 'Los 80 partidos del Mundial 2026. Resultados en vivo, goles y estadísticas al instante.',
    gradient: ['#001489', '#1565C0'],
  },
  {
    key: '2',
    icon: 'lightning-bolt',
    title: 'Predice y gana puntos',
    subtitle: 'Pronostica marcadores y compite en el ranking global. Hasta 5 puntos por acierto exacto.',
    gradient: ['#0D47A1', '#00C851'],
  },
  {
    key: '3',
    icon: 'robot',
    title: 'IA a tu servicio',
    subtitle: 'Predicciones basadas en estadísticas y GPT-4. Simula el camino al título.',
    gradient: ['#1A237E', '#7B1FA2'],
  },
  {
    key: '4',
    icon: 'trophy',
    title: 'Quiniela con amigos',
    subtitle: 'Crea grupos privados, invita amigos y compite por el título de mejor pronosticador.',
    gradient: ['#B71C1C', '#C9A84C'],
  },
];

export function OnboardingScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const [current, setCurrent] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const next = () => {
    if (current < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: current + 1 });
      setCurrent(current + 1);
    } else {
      dispatch(setHasSeenOnboarding());
    }
  };

  const skip = () => dispatch(setHasSeenOnboarding());

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={(e) => {
          setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <LinearGradient colors={item.gradient as any} style={styles.slide}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name={item.icon as any} size={80} color="white" />
            </View>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          </LinearGradient>
        )}
      />

      {/* Bottom */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={next}>
          <Text style={styles.nextText}>
            {current === SLIDES.length - 1 ? '¡Comenzar!' : 'Siguiente'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>

        {current < SLIDES.length - 1 && (
          <TouchableOpacity onPress={skip} style={styles.skipButton}>
            <Text style={styles.skipText}>Saltar</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  iconContainer: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xxxl,
  },
  slideTitle: { color: 'white', fontSize: typography.fontSize.xxxl, fontFamily: typography.fontFamily.black, textAlign: 'center', marginBottom: spacing.base },
  slideSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: typography.fontSize.base, textAlign: 'center', lineHeight: 24 },
  bottom: { padding: spacing.screen, paddingBottom: spacing.xl, gap: spacing.base, backgroundColor: '#0F172A' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 24, backgroundColor: colors.primary },
  nextButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md,
  },
  nextText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
  skipButton: { alignItems: 'center' },
  skipText: { color: 'rgba(255,255,255,0.4)', fontSize: typography.fontSize.sm },
});
