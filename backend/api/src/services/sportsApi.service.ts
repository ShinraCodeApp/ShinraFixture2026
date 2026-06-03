import axios from 'axios';
import { MatchStatus } from '@prisma/client';
import { config } from '../config';
import { logger } from '../utils/logger';

interface LiveMatchData {
  homeScore: number;
  awayScore: number;
  minute: number;
  status: MatchStatus;
  events?: Array<{ type: string; minute: number; teamId?: string; playerName?: string }>;
}

export class SportsApiService {
  private static client = axios.create({
    baseURL: config.sportsApi.url,
    headers: { 'X-Auth-Token': config.sportsApi.key },
    timeout: 10000,
  });

  static async getMatchData(externalId: string): Promise<LiveMatchData | null> {
    if (!config.sportsApi.key) return null;

    try {
      const response = await this.client.get(`/matches/${externalId}`);
      const data = response.data;

      const statusMap: Record<string, MatchStatus> = {
        'SCHEDULED': MatchStatus.SCHEDULED,
        'IN_PLAY': MatchStatus.LIVE,
        'PAUSED': MatchStatus.HALF_TIME,
        'FINISHED': MatchStatus.FINISHED,
        'POSTPONED': MatchStatus.POSTPONED,
        'CANCELLED': MatchStatus.CANCELLED,
      };

      return {
        homeScore: data.score?.fullTime?.home ?? 0,
        awayScore: data.score?.fullTime?.away ?? 0,
        minute: data.minute ?? 0,
        status: statusMap[data.status] ?? MatchStatus.SCHEDULED,
      };
    } catch (err) {
      logger.warn(`Failed to fetch match data for ${externalId}:`, err);
      return null;
    }
  }

  static async syncTournamentMatches(externalTournamentId: string): Promise<any[]> {
    if (!config.sportsApi.key) return [];

    try {
      const response = await this.client.get(`/competitions/${externalTournamentId}/matches`);
      return response.data.matches ?? [];
    } catch (err) {
      logger.warn('Failed to sync tournament matches:', err);
      return [];
    }
  }

  static async syncTeams(externalTournamentId: string): Promise<any[]> {
    if (!config.sportsApi.key) return [];

    try {
      const response = await this.client.get(`/competitions/${externalTournamentId}/teams`);
      return response.data.teams ?? [];
    } catch (err) {
      logger.warn('Failed to sync teams:', err);
      return [];
    }
  }
}
