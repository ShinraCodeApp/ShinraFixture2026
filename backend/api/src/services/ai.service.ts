import OpenAI from 'openai';
import { MatchStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';
import { config } from '../config';
import { logger } from '../utils/logger';

const cache = new CacheService(3600); // 1 hour

interface TeamStats {
  name: string;
  code: string;
  fifaRanking: number;
  recentMatches: Array<{ opponent: string; result: string; score: string }>;
  goalAvg: number;
  concededAvg: number;
  wins: number;
  draws: number;
  losses: number;
}

interface MatchPrediction {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: string;
  keyFactors: string[];
  aiAnalysis: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface SimulationResult {
  winner: string | null;
  homeScore: number;
  awayScore: number;
  events: Array<{ minute: number; type: string; team: string; player?: string }>;
}

export class AIService {
  private static client: OpenAI | null = null;

  private static getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({ apiKey: config.openai.apiKey });
    }
    return this.client;
  }

  // ── Core Prediction ─────────────────────────────────

  static async predictMatch(matchId: string): Promise<MatchPrediction> {
    const cacheKey = `ai:predict:${matchId}`;
    const cached = await cache.get<MatchPrediction>(cacheKey);
    if (cached) return cached;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: {
          include: {
            stats: { take: 1 },
            homeMatches: {
              where: { status: MatchStatus.FINISHED },
              orderBy: { matchDate: 'desc' },
              take: 5,
              include: { awayTeam: { select: { name: true, code: true } } },
            },
            awayMatches: {
              where: { status: MatchStatus.FINISHED },
              orderBy: { matchDate: 'desc' },
              take: 5,
              include: { homeTeam: { select: { name: true, code: true } } },
            },
          },
        },
        awayTeam: {
          include: {
            stats: { take: 1 },
            homeMatches: {
              where: { status: MatchStatus.FINISHED },
              orderBy: { matchDate: 'desc' },
              take: 5,
              include: { awayTeam: { select: { name: true, code: true } } },
            },
            awayMatches: {
              where: { status: MatchStatus.FINISHED },
              orderBy: { matchDate: 'desc' },
              take: 5,
              include: { homeTeam: { select: { name: true, code: true } } },
            },
          },
        },
      },
    });

    if (!match) throw new Error('Match not found');

    // Statistical prediction (always available)
    const statsPrediction = this.calculateStatisticalProbabilities(match);

    if (!config.openai.enabled || !config.openai.apiKey) {
      const result = { ...statsPrediction, aiAnalysis: 'AI analysis unavailable', confidence: 'MEDIUM' as const };
      await cache.set(cacheKey, result, 3600);
      return result;
    }

    try {
      const aiPrediction = await this.getAIPrediction(match, statsPrediction);
      await cache.set(cacheKey, aiPrediction, 3600);
      await prisma.match.update({
        where: { id: matchId },
        data: {
          homeWinProb: aiPrediction.homeWinProb,
          drawProb: aiPrediction.drawProb,
          awayWinProb: aiPrediction.awayWinProb,
          aiAnalysis: aiPrediction.aiAnalysis,
        },
      });
      return aiPrediction;
    } catch (err) {
      logger.warn('OpenAI prediction failed, using statistical model', err);
      return statsPrediction;
    }
  }

  private static calculateStatisticalProbabilities(match: any): MatchPrediction {
    const home = match.homeTeam;
    const away = match.awayTeam;

    // FIFA ranking difference factor
    const rankDiff = (away.fifaRanking ?? 50) - (home.fifaRanking ?? 50);
    const rankFactor = Math.tanh(rankDiff / 20) * 0.15;

    // Recent form factor
    const homeForm = this.calculateFormFactor(home.homeMatches, home.awayMatches, home.id);
    const awayForm = this.calculateFormFactor(away.homeMatches, away.awayMatches, away.id);

    // Stats-based
    const homeStats = home.stats[0];
    const awayStats = away.stats[0];

    let homeBase = 0.4 + rankFactor + homeForm * 0.1;
    let awayBase = 0.4 - rankFactor + awayForm * 0.1;

    if (homeStats && awayStats) {
      const homeGoalRatio = (homeStats.goalsScored + 0.1) / (homeStats.goalsConceded + 0.1);
      const awayGoalRatio = (awayStats.goalsScored + 0.1) / (awayStats.goalsConceded + 0.1);
      homeBase += Math.tanh(Math.log(homeGoalRatio)) * 0.1;
      awayBase += Math.tanh(Math.log(awayGoalRatio)) * 0.1;
    }

    // Normalize to sum to 1
    const drawBase = 0.22;
    const total = homeBase + drawBase + awayBase;
    const homeWinProb = Math.min(0.85, Math.max(0.05, homeBase / total));
    const awayWinProb = Math.min(0.85, Math.max(0.05, awayBase / total));
    const drawProb = Math.min(0.45, Math.max(0.05, 1 - homeWinProb - awayWinProb));

    // Re-normalize
    const norm = homeWinProb + drawProb + awayWinProb;

    return {
      homeWinProb: Math.round((homeWinProb / norm) * 100) / 100,
      drawProb: Math.round((drawProb / norm) * 100) / 100,
      awayWinProb: Math.round((awayWinProb / norm) * 100) / 100,
      predictedScore: this.predictScore(homeWinProb / norm, awayWinProb / norm),
      keyFactors: this.getKeyFactors(match),
      aiAnalysis: `Statistical analysis based on FIFA rankings and historical performance.`,
      confidence: 'MEDIUM',
    };
  }

  private static calculateFormFactor(homeMatches: any[], awayMatches: any[], teamId: string): number {
    const all = [...homeMatches, ...awayMatches]
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, 5);

    if (!all.length) return 0;

    let points = 0;
    for (const m of all) {
      const isHome = m.homeTeamId === teamId;
      const scored = isHome ? m.homeScore : m.awayScore;
      const conceded = isHome ? m.awayScore : m.homeScore;
      if (scored > conceded) points += 3;
      else if (scored === conceded) points += 1;
    }
    return (points / (all.length * 3) - 0.5) * 2; // -1 to 1
  }

  private static predictScore(homeProb: number, awayProb: number): string {
    if (homeProb > 0.5) return '2-0';
    if (homeProb > 0.4) return '1-0';
    if (awayProb > 0.5) return '0-2';
    if (awayProb > 0.4) return '0-1';
    return '1-1';
  }

  private static getKeyFactors(match: any): string[] {
    const factors: string[] = [];
    const home = match.homeTeam;
    const away = match.awayTeam;

    if (home.fifaRanking && away.fifaRanking) {
      if (home.fifaRanking < away.fifaRanking - 10) {
        factors.push(`${home.name} has a significantly better FIFA ranking (#${home.fifaRanking} vs #${away.fifaRanking})`);
      } else if (away.fifaRanking < home.fifaRanking - 10) {
        factors.push(`${away.name} has a significantly better FIFA ranking (#${away.fifaRanking} vs #${home.fifaRanking})`);
      }
    }

    if (match.stage === 'GROUP') {
      factors.push('Group stage match - both teams need points');
    } else {
      factors.push(`Elimination round - ${match.stage.replace('_', ' ')}`);
    }

    return factors;
  }

  private static async getAIPrediction(match: any, statsPrediction: MatchPrediction): Promise<MatchPrediction> {
    const client = this.getClient();

    const prompt = `You are a professional football analyst. Analyze this FIFA World Cup 2026 match and provide predictions.

Match: ${match.homeTeam.name} vs ${match.awayTeam.name}
Stage: ${match.stage}
Date: ${match.matchDate}
Venue: ${match.venue}, ${match.city}

Home Team (${match.homeTeam.name}):
- FIFA Ranking: ${match.homeTeam.fifaRanking ?? 'N/A'}
- Recent matches: ${match.homeTeam.homeMatches.slice(0, 3).map((m: any) => `vs ${m.awayTeam.name} ${m.homeScore}-${m.awayScore}`).join(', ')}

Away Team (${match.awayTeam.name}):
- FIFA Ranking: ${match.awayTeam.fifaRanking ?? 'N/A'}
- Recent matches: ${match.awayTeam.homeMatches.slice(0, 3).map((m: any) => `vs ${m.awayTeam.name} ${m.homeScore}-${m.awayScore}`).join(', ')}

Statistical probabilities: Home ${Math.round(statsPrediction.homeWinProb * 100)}%, Draw ${Math.round(statsPrediction.drawProb * 100)}%, Away ${Math.round(statsPrediction.awayWinProb * 100)}%

Provide a JSON response with:
{
  "homeWinProb": <0-1>,
  "drawProb": <0-1>,
  "awayWinProb": <0-1>,
  "predictedScore": "<home>-<away>",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "analysis": "<2-3 paragraph analysis in Spanish>",
  "confidence": "<LOW|MEDIUM|HIGH>"
}

Ensure homeWinProb + drawProb + awayWinProb = 1.0`;

    const response = await client.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000,
    });

    const data = JSON.parse(response.choices[0].message.content ?? '{}');
    return {
      homeWinProb: parseFloat(data.homeWinProb) || statsPrediction.homeWinProb,
      drawProb: parseFloat(data.drawProb) || statsPrediction.drawProb,
      awayWinProb: parseFloat(data.awayWinProb) || statsPrediction.awayWinProb,
      predictedScore: data.predictedScore || statsPrediction.predictedScore,
      keyFactors: data.keyFactors || statsPrediction.keyFactors,
      aiAnalysis: data.analysis || statsPrediction.aiAnalysis,
      confidence: data.confidence || 'MEDIUM',
    };
  }

  // ── Match Analysis (post-match) ─────────────────────

  static async generateMatchAnalysis(matchId: string): Promise<string> {
    const cacheKey = `ai:analysis:${matchId}`;
    const cached = await cache.get<string>(cacheKey);
    if (cached) return cached;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { name: true, code: true } },
        awayTeam: { select: { name: true, code: true } },
        events: { orderBy: { minute: 'asc' }, take: 30 },
        stats: true,
      },
    });

    if (!match || match.status !== MatchStatus.FINISHED) return '';
    if (!config.openai.enabled) return 'AI analysis not available';

    try {
      const client = this.getClient();
      const events = match.events.map(e => `${e.minute}' - ${e.type}`).join('\n');

      const response = await client.chat.completions.create({
        model: config.openai.model,
        messages: [{
          role: 'user',
          content: `Analiza este partido del Mundial 2026 en español (2-3 párrafos):
${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name}
Posesión: ${match.stats?.homePossession ?? 50}% - ${match.stats?.awayPossession ?? 50}%
Eventos: ${events}
Proporciona un análisis narrativo profesional de periodismo deportivo.`,
        }],
        temperature: 0.7,
        max_tokens: 500,
      });

      const analysis = response.choices[0].message.content ?? '';
      await cache.set(cacheKey, analysis, 86400); // Cache for 24h
      await prisma.match.update({ where: { id: matchId }, data: { aiAnalysis: analysis } });
      return analysis;
    } catch (err) {
      logger.warn('Failed to generate match analysis', err);
      return '';
    }
  }

  // ── Tournament Simulation ───────────────────────────

  static async simulateTournament(tournamentId: string, useAI = false): Promise<Record<string, any>> {
    const matches = await prisma.match.findMany({
      where: { tournamentId, status: MatchStatus.SCHEDULED },
      include: {
        homeTeam: { select: { id: true, name: true, code: true, fifaRanking: true } },
        awayTeam: { select: { id: true, name: true, code: true, fifaRanking: true } },
      },
      orderBy: { matchDate: 'asc' },
    });

    const results: Record<string, SimulationResult> = {};

    for (const match of matches) {
      results[match.id] = this.simulateMatch(
        match.homeTeam.fifaRanking ?? 50,
        match.awayTeam.fifaRanking ?? 50
      );
    }

    return results;
  }

  static simulateMatch(homeRanking: number, awayRanking: number): SimulationResult {
    const rankDiff = awayRanking - homeRanking; // positive = home is better
    const homeAdvantage = 0.1;
    const factor = Math.tanh(rankDiff / 15) + homeAdvantage;

    const homeWinP = (1 + factor) / 3;
    const drawP = 0.25;
    const awayWinP = 1 - homeWinP - drawP;

    const rand = Math.random();
    let homeScore = 0;
    let awayScore = 0;

    if (rand < homeWinP) {
      homeScore = Math.floor(Math.random() * 3) + 1;
      awayScore = Math.floor(Math.random() * homeScore);
    } else if (rand < homeWinP + drawP) {
      const goals = Math.floor(Math.random() * 3);
      homeScore = goals;
      awayScore = goals;
    } else {
      awayScore = Math.floor(Math.random() * 3) + 1;
      homeScore = Math.floor(Math.random() * awayScore);
    }

    const winner = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : null;
    return { winner, homeScore, awayScore, events: this.generateEventTimeline(homeScore, awayScore) };
  }

  private static generateEventTimeline(homeGoals: number, awayGoals: number) {
    const events: Array<{ minute: number; type: string; team: string }> = [];
    const usedMinutes = new Set<number>();

    const addGoal = (team: string) => {
      let minute: number;
      do { minute = Math.floor(Math.random() * 90) + 1; } while (usedMinutes.has(minute));
      usedMinutes.add(minute);
      events.push({ minute, type: 'GOAL', team });
    };

    for (let i = 0; i < homeGoals; i++) addGoal('home');
    for (let i = 0; i < awayGoals; i++) addGoal('away');

    // Random cards
    if (Math.random() > 0.6) {
      const minute = Math.floor(Math.random() * 90) + 1;
      events.push({ minute, type: 'YELLOW_CARD', team: Math.random() > 0.5 ? 'home' : 'away' });
    }

    return events.sort((a, b) => a.minute - b.minute);
  }

  // ── Top Scorer Prediction ───────────────────────────

  static async predictTopScorer(tournamentId: string): Promise<Array<{ player: any; probability: number }>> {
    const cacheKey = `ai:topscorer:${tournamentId}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached) return cached;

    const players = await prisma.player.findMany({
      where: { position: 'FORWARD', isActive: true },
      include: {
        team: { select: { name: true, code: true, fifaRanking: true, group: true } },
        stats: { take: 1 },
      },
      take: 20,
    });

    const ranked = players
      .map((p) => {
        const stats = p.stats[0];
        const baseScore = stats ? (stats.goals * 0.6 + stats.assists * 0.2) / Math.max(stats.matchesPlayed, 1) : 0;
        const rankBonus = p.team.fifaRanking ? Math.max(0, (50 - p.team.fifaRanking) / 100) : 0;
        return { player: { id: p.id, name: p.name, photoUrl: p.photoUrl, team: p.team }, probability: Math.round((baseScore + rankBonus) * 100) / 100 };
      })
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10);

    await cache.set(cacheKey, ranked, 3600);
    return ranked;
  }
}
