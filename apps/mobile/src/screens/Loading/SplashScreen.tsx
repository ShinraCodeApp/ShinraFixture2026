import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { colors, typography } from '../../theme';

export function SplashScreen() {
  return (
    <LinearGradient colors={['#001489', '#0D47A1', '#0F172A']} style={styles.container}>
      <MotiView from={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>S</Text>
        </View>
      </MotiView>
      <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 300 }}>
        <Text style={styles.title}>ShinraFixture</Text>
        <Text style={styles.subtitle}>FIFA World Cup 2026™</Text>
      </MotiView>
      <ActivityIndicator color={colors.primary} size="small" style={styles.loader} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  logo: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: 'white', fontSize: 40, fontFamily: typography.fontFamily.black },
  title: { color: 'white', fontSize: typography.fontSize.xxxl, fontFamily: typography.fontFamily.black, textAlign: 'center' },
  subtitle: { color: colors.accent, fontSize: typography.fontSize.sm, textAlign: 'center', fontFamily: typography.fontFamily.medium },
  loader: { position: 'absolute', bottom: 60 },
});
