import { LinkingOptions } from '@react-navigation/native';

export const linking: LinkingOptions<any> = {
  prefixes: [
    'shinrafixture://',
    'https://shinrafixture.com',
    'https://shinrafixture2026.netlify.app',
  ],
  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: 'home',
          FixtureTab: {
            screens: {
              Fixture: 'fixture',
              MatchDetail: 'match/:matchId',
              TeamDetail: 'team/:teamId',
            },
          },
          MatchesTab: {
            screens: {
              Matches: 'matches',
              MatchDetail: 'matches/match/:matchId',
            },
          },
          PredictionsTab: {
            screens: {
              Predictions: 'predictions',
              Quiniela: 'quiniela',
              QuinielaDetail: 'quiniela/:groupId',
              QuinielaInvite: 'quiniela/join/:code',
            },
          },
          CommunityTab: 'community',
          ProfileTab: {
            screens: {
              Profile: 'profile',
              Duels: 'profile/duels',
            },
          },
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
        },
      },
    },
  },
};
