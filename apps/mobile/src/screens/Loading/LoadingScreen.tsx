import React from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../theme';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/branding/SCFixture1.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator color={colors.accent} size="small" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#001489',
  },
  logo: {
    width: 220,
    height: 220,
  },
  loader: {
    position: 'absolute',
    bottom: 60,
  },
});
