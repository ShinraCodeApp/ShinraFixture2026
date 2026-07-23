import axios from 'axios';
import dayjs from 'dayjs';
import { MatchStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { CacheService } from '../config/redis';

const cache = new CacheService();

const ESPN_SLUGS: Record<string, { slug: string; region: string }> = {
  LIGA_ARG:       { slug: 'arg.1',  region: 'CONMEBOL' },
  LA_LIGA:        { slug: 'esp.1',  region: 'UEFA' },
  PREMIER_LEAGUE: { slug: 'eng.1',  region: 'UEFA' },
  BUNDESLIGA:     { slug: 'ger.1',  region: 'UEFA' },
  SERIE_A:        { slug: 'ita.1',  region: 'UEFA' },
  LIGUE_1:        { slug: 'fra.1',  region: 'UEFA' },
};

function mapStatus(stateStr: string): MatchStatus {
  if (stateStr === 'post') return MatchStatus.FINISHED;
  if (stateStr === 'in')   return MatchStatus.LIVE;
  return MatchStatus.SCHEDULED;
}

async function findOrCreateTeam(code: string, competitor: any, region: string) {
  if (!code) return null;
  let team = await prisma.team.findFirst({ where: { code } });
  if (!team) {
    // Try by full name (ESPN display name may differ from stored name)
    const displayName: string = competitor.team?.displayName ?? '';
    if (displayName) {
      team = await prisma.team.findFirst({
        where: { name: { contains: displayName, mode: 'insensitive' } },
      });
    }
  }
  if (!team) {
    team = await prisma.team.create({
      data: {
        code,
        name: competitor.team?.displayName ?? code,
        shortName: competitor.team?.shortDisplayName ?? competitor.team?.abbreviation ?? code,
        flagUrl: competitor.team?.logos?.[0]?.href ?? competitor.team?.logo ?? null,
        region,
      },
    });
    logger.debug(`Created team: ${code} — ${competitor.team?.displayName}`);
  }
  return team;
}

export async function importLeagueFixtures(tournamentType: string): Promise<string> {
  const leagueInfo = ESPN_SLUGS[tournamentType];
  if (!leagueInfo) throw new Error(`Tipo de torneo no soportado: ${tournamentType}`);

  const tournament = await prisma.tournament.findFirst({
    where: { type: tournamentType as any, year: 2026 },
  });
  if (!tournament) throw new Error(`Torneo ${tournamentType} no existe en DB — hacé click en "Activar Ligas" primero`);

  // Fetch next 3 months from tournament start (or today if already started)
  const fromDate = dayjs().isAfter(dayjs(tournament.startDate))
    ? dayjs()
    : dayjs(tournament.startDate);
  const toDate = fromDate.add(90, 'day');

  // Build 2-week chunks to avoid ESPN timeouts
  const chunks: Array<[string, string]> = [];
  let cur = fromDate;
  while (cur.isBefore(toDate)) {
    const end = cur.add(13, 'day').isAfter(toDate) ? toDate : cur.add(13, 'day');
    chunks.push([cur.format('YYYYMMDD'), end.format('YYYYMMDD')]);
    cur = cur.add(14, 'day');
  }

  // Collect unique events from ESPN
  const seenIds = new Set<string>();
  const allEvents: any[] = [];

  for (const [start, end] of chunks) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueInfo.slug}/scoreboard?dates=${start}-${end}&limit=100`;
    try {
      const r = await axios.get(url, { timeout: 12000 });
      for (const ev of (r.data.events ?? [])) {
        if (!seenIds.has(ev.id)) {
          seenIds.add(ev.id);
          allEvents.push(ev);
        }
      }
    } catch (err: any) {
      logger.warn(`ESPN fetch failed for ${leagueInfo.slug} ${start}-${end}: ${err.message}`);
    }
  }

  if (allEvents.length === 0) {
    return `ESPN no devolvió partidos para ${tournamentType} (la liga quizás aún no tiene fixture publicado)`;
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const event of allEvents) {
    const comp = event.competitions?.[0];
    if (!comp) continue;

    const homeComp = comp.competitors?.find((c: any) => c.homeAway === 'home');
    const awayComp = comp.competitors?.find((c: any) => c.homeAway === 'away');
    if (!homeComp || !awayComp) continue;

    const homeCode = homeComp.team?.abbreviation?.toUpperCase();
    const awayCode = awayComp.team?.abbreviation?.toUpperCase();
    if (!homeCode || !awayCode) { skipped++; continue; }

    const [homeTeam, awayTeam] = await Promise.all([
      findOrCreateTeam(homeCode, homeComp, leagueInfo.region),
      findOrCreateTeam(awayCode, awayComp, leagueInfo.region),
    ]);
    if (!homeTeam || !awayTeam) { skipped++; continue; }

    const matchDate = new Date(comp.date ?? event.date);
    const stateStr  = comp.status?.type?.state ?? 'pre';
    const status    = mapStatus(stateStr);
    const homeScore = status !== MatchStatus.SCHEDULED ? (parseInt(homeComp.score ?? '0') || 0) : null;
    const awayScore = status !== MatchStatus.SCHEDULED ? (parseInt(awayComp.score ?? '0') || 0) : null;
    const venue     = comp.venue?.fullName ?? null;
    const city      = comp.venue?.address?.city ?? null;
    // ESPN matchday: event.week?.number or notes[0]?.headline like "Jornada 1"
    const round: number | null = event.week?.number ?? null;
    const externalId = String(event.id);

    const existing = await prisma.match.findFirst({
      where: { externalId, tournamentId: tournament.id },
    });

    if (existing) {
      await prisma.match.update({
        where: { id: existing.id },
        data: { homeScore, awayScore, status, venue, city, matchDate, round },
      });
      updated++;
    } else {
      await prisma.match.create({
        data: {
          tournamentId: tournament.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          matchDate,
          status,
          stage: 'GROUP',
          homeScore,
          awayScore,
          venue,
          city,
          round,
          externalId,
        },
      });
      imported++;
    }
  }

  await cache.delPattern(`tournament:${tournament.id}*`);
  await cache.delPattern('matches:*');

  return `✓ ${imported} importados · ${updated} actualizados · ${skipped} saltados (${allEvents.length} eventos ESPN)`;
}
