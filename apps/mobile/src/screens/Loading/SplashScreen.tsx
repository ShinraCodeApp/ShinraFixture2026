import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../../theme';

export function SplashScreen() {
  return (
    <LinearGradient colors={['#001489', '#0D47A1', '#0F172A']} style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>S</Text>
      </View>
      <Text style={styles.title}>ShinraFixture</Text>
      <Text style={styles.subtitle}>FIFA World Cup 2026™</Text>
      <ActivityIndicator color={colors.accent} size="small" style={styles.loader} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  logo: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: 'white', fontSize: 40, fontWeight: 'bold' },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#FFD700', fontSize: 14, textAlign: 'center' },
  loader: { position: 'absolute', bottom: 60 },
});
