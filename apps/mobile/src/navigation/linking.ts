import { LinkingOptions } from '@react-navigation/native';

export const linking: LinkingOptions<any> = {
  prefixes: ['shinrafixture://', 'https://shinrafixture.com'],
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
          PredictionsTab: {
            screens: {
              Predictions: 'predictions',
              Quiniela: 'quiniela/:groupId?',
            },
          },
          CommunityTab: 'community',
          ProfileTab: 'profile',
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
