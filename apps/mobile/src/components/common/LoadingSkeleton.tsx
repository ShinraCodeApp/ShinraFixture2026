import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';

interface LoadingSkeletonProps {
  style?: ViewStyle;
  width?: number | string;
  height?: number;
}

export function LoadingSkeleton({ style, width, height = 16 }: LoadingSkeletonProps) {
  const { appColors } = useAppTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ])
    ).start();
    return () => opacity.stopAnimation();
  }, []);

  return (
    <Animated.View
      style={[
        { height, width: width as any, backgroundColor: appColors.border, borderRadius: 6, opacity },
        style,
      ]}
    />
  );
}
