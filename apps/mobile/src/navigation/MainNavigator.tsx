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
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { SimulatorScreen } from '../screens/Simulator/SimulatorScreen';
import { StatsScreen } from '../screens/Stats/StatsScreen';
import { NewsScreen } from '../screens/News/NewsScreen';
import { QuinielaScreen } from '../screens/Quiniela/QuinielaScreen';
import { QuinielaDetailScreen } from '../screens/Quiniela/QuinielaDetailScreen';
import { QuinielaInviteScreen } from '../screens/Quiniela/QuinielaInviteScreen';
import { MatchesScreen } from '../screens/Matches/MatchesScreen';
import { GroupDetailScreen } from '../screens/Fixture/GroupDetailScreen';
import { AppGuideScreen } from '../screens/Profile/AppGuideScreen';
import { FriendsScreen } from '../screens/Profile/FriendsScreen';
import { FavoriteTeamsScreen } from '../screens/Profile/FavoriteTeamsScreen';
import { PrivacyPolicyScreen } from '../screens/Settings/PrivacyPolicyScreen';
import { NotificationsScreen } from '../screens/Notifications/NotificationsScreen';
import { LiveRadarScreen } from '../screens/Match/LiveRadarScreen';
import { LocalLeaguesScreen } from '../screens/LocalLeague/LocalLeaguesScreen';
import { LocalLeagueDetailScreen } from '../screens/LocalLeague/LocalLeagueDetailScreen';
import { EditLocalTeamScreen } from '../screens/LocalLeague/EditLocalTeamScreen';
import { BracketScreen } from '../screens/Bracket/BracketScreen';
import { BracketPredictorScreen } from '../screens/Bracket/BracketPredictorScreen';
import { AchievementsScreen } from '../screens/Profile/AchievementsScreen';
import { PersonalStatsScreen } from '../screens/Profile/PersonalStatsScreen';
import { PublicProfileScreen } from '../screens/Profile/PublicProfileScreen';
import { NewPostScreen } from '../screens/Community/NewPostScreen';
import { PostDetailScreen } from '../screens/Community/PostDetailScreen';
import { NotificationSettingsScreen } from '../screens/Settings/NotificationSettingsScreen';
import { DuelsScreen } from '../screens/Profile/DuelsScreen';
import { UserSearchScreen } from '../screens/Profile/UserSearchScreen';

export type MainTabParamList = {
  HomeTab: undefined;
  FixtureTab: undefined;
  MatchesTab: undefined;
  PredictionsTab: undefined;
  LigaTab: undefined;
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
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Community" component={CommunityScreen} />
      <Stack.Screen name="NewPost" component={NewPostScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
    </Stack.Navigator>
  );
}

function FixtureStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Fixture" component={FixtureScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
      <Stack.Screen name="LiveRadar" component={LiveRadarScreen} />
      <Stack.Screen name="Teams" component={TeamsScreen} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
      <Stack.Screen name="Bracket" component={BracketScreen} />
      <Stack.Screen name="BracketPredictor" component={BracketPredictorScreen} />
    </Stack.Navigator>
  );
}

function MatchesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Matches" component={MatchesScreen} />
      <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
      <Stack.Screen name="LiveRadar" component={LiveRadarScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
    </Stack.Navigator>
  );
}

function PredictionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Predictions" component={PredictionsScreen} />
      <Stack.Screen name="Quiniela" component={QuinielaScreen} />
      <Stack.Screen name="QuinielaDetail" component={QuinielaDetailScreen} />
      <Stack.Screen name="QuinielaInvite" component={QuinielaInviteScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AppGuide" component={AppGuideScreen} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="FavoriteTeams" component={FavoriteTeamsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="PersonalStats" component={PersonalStatsScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="Duels" component={DuelsScreen} />
      <Stack.Screen name="UserSearch" component={UserSearchScreen} />
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
function MatchesIcon({ focused, color, size }: TabIconProps) {
  return <MaterialCommunityIcons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />;
}
function LigaIcon({ focused, color, size }: TabIconProps) {
  return <MaterialCommunityIcons name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />;
}
function ProfileIcon({ focused, color, size }: TabIconProps) {
  return <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />;
}

function LigaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LocalLeagues" component={LocalLeaguesScreen} />
      <Stack.Screen name="LocalLeagueDetail" component={LocalLeagueDetailScreen} />
      <Stack.Screen name="EditLocalTeam" component={EditLocalTeamScreen} />
    </Stack.Navigator>
  );
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
        name="MatchesTab"
        component={MatchesStack}
        options={{ tabBarLabel: 'Partidos', tabBarIcon: MatchesIcon }}
      />
      <Tab.Screen
        name="PredictionsTab"
        component={PredictionsStack}
        options={{ tabBarLabel: 'Predicciones', tabBarIcon: PredictionsIcon }}
      />
      <Tab.Screen
        name="LigaTab"
        component={LigaStack}
        options={{ tabBarLabel: 'Mi Liga', tabBarIcon: LigaIcon }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: ProfileIcon }}
      />
    </Tab.Navigator>
  );
}
