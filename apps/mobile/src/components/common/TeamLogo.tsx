import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, borderRadius } from '../../theme';

interface TeamLogoProps {
  uri?: string | null;
  size?: number;
  code?: string;
}

export function TeamLogo({ uri, size = 32, code }: TeamLogoProps) {
  const [error, setError] = useState(false);
  const isChampion = code === 'ARG';

  const core = !uri || error ? (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.35 }]}>
        {code?.slice(0, 2) ?? '🏳️'}
      </Text>
    </View>
  ) : (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );

  if (!isChampion) return core;

  return (
    <View style={{ width: size, height: size }}>
      {core}
      {/* Crown badge — top-right */}
      <Text style={{
        position: 'absolute',
        top: -size * 0.3,
        right: -size * 0.15,
        fontSize: size * 0.42,
        lineHeight: size * 0.48,
      }}>
        👑
      </Text>
      {/* 3 stars — bottom center */}
      <Text style={{
        position: 'absolute',
        bottom: -size * 0.22,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: size * 0.2,
        lineHeight: size * 0.25,
        color: '#FFD700',
        fontFamily: 'Inter_700Bold',
      }}>
        ★★★
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: { fontFamily: 'Inter_700Bold' },
});
