import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { colors } from '../theme';

// Screens
import { HomeScreen } from '../screens/Home/HomeScreen';
import { FixtureScreen } from '../screens/Fixture/FixtureScreen';
import { MatchDetailScreen } from '../screens/Match/MatchDetailScreen';
import { TeamsScreen } from '../screens/Teams/TeamsScreen';
import { TeamDetailScreen } from '../screens/Teams/TeamDetailScreen';
import { PredictionsScreen } from '../screens/Predictions/PredictionsScreen';
import { CommunityScreen } from '../screens/Community/CommunityScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { SimulatorScreen } from '../screens/Simulator/SimulatorScreen';
import { StatsScreen } from '../screens/Stats/StatsScreen';
import { NewsScreen } from '../screens/News/NewsScreen';
import { QuinielaScreen } from '../screens/Quiniela/QuinielaScreen';

export type MainTabParamList = {
  HomeTab: undefined;
  FixtureTab: undefined;
  PredictionsTab: undefined;
  CommunityTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="News" component={NewsScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="Simulator" component={SimulatorScreen} />
    </Stack.Navigator>
  );
}

function FixtureStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Fixture" component={FixtureScreen} />
      <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
      <Stack.Screen name="Teams" component={TeamsScreen} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
    </Stack.Navigator>
  );
}

function PredictionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Predictions" component={PredictionsScreen} />
      <Stack.Screen name="Quiniela" component={QuinielaScreen} />
    </Stack.Navigator>
  );
}

interface TabIconProps {
  focused: boolean;
  color: string;
  size: number;
}

function HomeIcon({ focused, color, size }: TabIconProps) {
  return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />;
}
function FixtureIcon({ focused, color, size }: TabIconProps) {
  return <MaterialCommunityIcons name={focused ? 'soccer' : 'soccer'} size={size} color={color} />;
}
function PredictionsIcon({ focused, color, size }: TabIconProps) {
  return <MaterialCommunityIcons name={focused ? 'lightning-bolt' : 'lightning-bolt-outline'} size={size} color={color} />;
}
function CommunityIcon({ focused, color, size }: TabIconProps) {
  return <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />;
}
function ProfileIcon({ focused, color, size }: TabIconProps) {
  return <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />;
}

export function MainNavigator() {
  const { appColors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: appColors.textSecondary,
        tabBarStyle: {
          backgroundColor: appColors.surface,
          borderTopColor: appColors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8,
          paddingTop: 8,
          height: 60 + (insets.bottom > 0 ? insets.bottom - 4 : 8),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter_500Medium',
          marginTop: -2,
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ tabBarLabel: 'Inicio', tabBarIcon: HomeIcon }}
      />
      <Tab.Screen
        name="FixtureTab"
        component={FixtureStack}
        options={{ tabBarLabel: 'Fixture', tabBarIcon: FixtureIcon }}
      />
      <Tab.Screen
        name="PredictionsTab"
        component={PredictionsStack}
        options={{ tabBarLabel: 'Predicciones', tabBarIcon: PredictionsIcon }}
      />
      <Tab.Screen
        name="CommunityTab"
        component={CommunityScreen}
        options={{ tabBarLabel: 'Comunidad', tabBarIcon: CommunityIcon }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: ProfileIcon }}
      />
    </Tab.Navigator>
  );
}
