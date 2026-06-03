import React from 'react';
import { ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { useAppTheme } from '../../hooks/useAppTheme';

interface LoadingSkeletonProps {
  style?: ViewStyle;
  width?: number | string;
  height?: number;
}

export function LoadingSkeleton({ style, width, height = 16 }: LoadingSkeletonProps) {
  const { appColors } = useAppTheme();

  return (
    <MotiView
      from={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 800, loop: true }}
      style={[
        { height, width: width as any, backgroundColor: appColors.border, borderRadius: 6 },
        style,
      ]}
    />
  );
}
