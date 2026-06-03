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

  if (!uri || error) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.35 }]}>
          {code?.slice(0, 2) ?? '🏳️'}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
      onError={() => setError(true)}
    />
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
