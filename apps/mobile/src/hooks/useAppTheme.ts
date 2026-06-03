import { useColorScheme } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { toggleTheme as toggleThemeAction } from '../store/slices/settingsSlice';
import { lightColors, darkColors, type AppColors } from '../theme';
import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { colors } from '../theme';

export function useAppTheme() {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme: userScheme } = useSelector((state: RootState) => state.settings);
  const systemScheme = useColorScheme();
  const isDark = userScheme === 'dark' || (userScheme === 'system' && systemScheme === 'dark');

  const appColors: AppColors = isDark ? darkColors : lightColors;

  const theme: Theme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: appColors.background,
      card: appColors.surface,
      text: appColors.text,
      border: appColors.border,
    },
  };

  const toggleTheme = () => dispatch(toggleThemeAction());

  return { appColors, isDark, theme, colorScheme: isDark ? 'dark' : 'light', toggleTheme };
}
