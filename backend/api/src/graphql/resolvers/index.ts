import { GraphQLScalarType, Kind } from 'graphql';
import { MatchService } from '../../services/matches.service';
import { TeamService } from '../../services/teams.service';
import { PlayerService } from '../../services/players.service';
import { PredictionService } from '../../services/predictions.service';
import { AIService } from '../../services/ai.service';
import { NewsService } from '../../services/news.service';
import { QuinielaService } from '../../services/quiniela.service';
import { UsersService } from '../../services/users.service';
import { prisma } from '../../config/database';
import { GraphQLContext } from '../context';
import { ApiError } from '../../utils/ApiError';

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  serialize: (value: any) => (value instanceof Date ? value.toISOString() : value),
  parseValue: (value: any) => new Date(value as string),
  parseLiteral: (ast: any) => ast.kind === Kind.STRING ? new Date(ast.value) : null,
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  serialize: (value: any) => value,
  parseValue: (value: any) => value,
  parseLiteral: (ast: any) => ast,
});

export const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  Query: {
    // Matches
    matches: (_: any, args: any) => MatchService.list({ ...args, page: args.page ?? 1, limit: args.limit ?? 20 }),
    match: (_: any, { id }: { id: string }, ctx: GraphQLContext) => MatchService.getById(id, ctx.userId),
    liveMatches: () => MatchService.getLive(),
    todayMatches: () => MatchService.getToday(),
    upcomingMatches: (_: any, { days }: { days?: number }) => MatchService.getUpcoming(days ?? 7),

    // Teams
    teams: (_: any, args: any) => TeamService.list(args),
    team: (_: any, { id }: { id: string }) => TeamService.getById(id),
    standings: (_: any, { tournamentId }: { tournamentId: string }) => TeamService.getStandings(tournamentId),

    // Players
    players: (_: any, args: any) => PlayerService.list({ ...args, page: 1, limit: 30 }),
    player: (_: any, { id }: { id: string }) => PlayerService.getById(id),
    topScorers: (_: any, { tournamentId }: { tournamentId: string }) => PlayerService.getTopScorers(tournamentId),

    // Tournaments
    tournaments: () => prisma.tournament.findMany({ orderBy: { year: 'desc' } }),
    activeTournament: () => prisma.tournament.findFirst({ where: { isActive: true } }),

    // Predictions (authenticated)
    myPredictions: (_: any, args: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new ApiError(401, 'Authentication required');
      return PredictionService.getUserPredictions(ctx.userId, args.page ?? 1, args.limit ?? 20);
    },
    globalRanking: (_: any, { tournamentId, page, limit }: any) =>
      PredictionService.getGlobalRanking(tournamentId, page ?? 1, limit ?? 20),

    // AI
    aiPrediction: (_: any, { matchId }: { matchId: string }) => AIService.predictMatch(matchId),
    topScorerPredictions: (_: any, { tournamentId }: { tournamentId: string }) =>
      AIService.predictTopScorer(tournamentId),

    // News
    news: (_: any, args: any, ctx: GraphQLContext) =>
      NewsService.list({ ...args, page: args.page ?? 1, limit: args.limit ?? 12, userId: ctx.userId }),
    newsItem: (_: any, { slug }: { slug: string }, ctx: GraphQLContext) => NewsService.getBySlug(slug, ctx.userId),

    // User
    me: (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.userId) return null;
      return UsersService.getPublicProfile(ctx.userId);
    },
    user: (_: any, { id }: { id: string }) => UsersService.getPublicProfile(id),
    leaderboard: (_: any, args: any) => UsersService.leaderboard(args.page ?? 1, args.limit ?? 20),

    // Quiniela
    myQuinielaGroups: (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new ApiError(401, 'Authentication required');
      return QuinielaService.myGroups(ctx.userId);
    },
    quinielaGroup: (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new ApiError(401, 'Authentication required');
      return QuinielaService.getById(id, ctx.userId);
    },
  },

  Mutation: {
    // Auth
    register: (_: any, args: any) => {
      const { AuthService } = require('../../services/auth.service');
      return AuthService.register(args);
    },
    login: (_: any, { email, password }: any) => {
      const { AuthService } = require('../../services/auth.service');
      return AuthService.login(email, password);
    },
    logout: (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.userId) return false;
      return true;
    },
    refreshToken: (_: any, { refreshToken }: any) => {
      const { AuthService } = require('../../services/auth.service');
      return AuthService.refreshTokens(refreshToken);
    },

    // Predictions
    savePrediction: (_: any, args: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new ApiError(401, 'Authentication required');
      return PredictionService.createOrUpdate(ctx.userId, args);
    },
    deletePrediction: async (_: any, { matchId }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new ApiError(401, 'Authentication required');
      await PredictionService.delete(ctx.userId, matchId);
      return true;
    },

    // Profile
    updateProfile: (_: any, args: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new ApiError(401, 'Authentication required');
      return UsersService.updateProfile(ctx.userId, args);
    },
    addFavoriteTeam: async (_: any, { teamId }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new ApiError(401, 'Authentication required');
      await UsersService.addFavoriteTeam(ctx.userId, teamId);
      return true;
    },
    removeFavoriteTeam: async (_: any, { teamId }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new ApiError(401, 'Authentication required');
      await UsersService.removeFavoriteTeam(ctx.userId, teamId);
      return true;
    },

    // Quiniela
    createQuinielaGroup: (_: any, args: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new ApiError(401, 'Authentication required');
      return QuinielaService.create(ctx.userId, args);
    },
    joinQuinielaGroup: (_: any, { inviteCode }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new ApiError(401, 'Authentication required');
      return QuinielaService.join(ctx.userId, inviteCode);
    },
    leaveQuinielaGroup: async (_: any, { groupId }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new ApiError(401, 'Authentication required');
      await QuinielaService.leave(groupId, ctx.userId);
      return true;
    },
  },
};
