import axios from 'axios';
import dayjs from 'dayjs';
import { MatchStatus, Region } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { CacheService } from '../config/redis';
import { LEAGUES, LeagueConfig, leagueByType } from '../config/leagues';

const cache = new CacheService();
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

// Ventana que se importa/actualiza en cada sincronización:
// la última semana (resultados) y las próximas 4 (fixture).
const DAYS_BACK = 7;
const DAYS_AHEAD = 28;

function mapStatus(stateStr: string): MatchStatus {
  if (stateStr === 'post') return MatchStatus.FINISHED;
  if (stateStr === 'in')   return MatchStatus.LIVE;
  return MatchStatus.SCHEDULED;
}

async function espnGet(url: string): Promise<any | null> {
  try {
    const r = await axios.get(url, { timeout: 15000 });
    return r.data;
  } catch (err: any) {
    logger.warn(`ESPN ${url}: ${err.message}`);
    return null;
  }
}

function firstWord(s: string): string {
  return s.toLowerCase().split(/\s+/)[0] ?? '';
}

/**
 * Busca el equipo de ESPN en la base: por id de ESPN, después por nombre, y por
 * sigla solo si es el mismo club (INT puede ser Inter o Internacional).
 */
async function findOrCreateTeam(competitor: any, region: Region) {
  const t = competitor?.team ?? {};
  const espnId: string | null = t.id ? String(t.id) : null;
  const abbr = String(t.abbreviation ?? '').toUpperCase();
  const displayName: string = t.displayName ?? abbr;
  if (!espnId && !abbr) return null;

  if (espnId) {
    const byId = await prisma.team.findUnique({ where: { espnId } });
    if (byId) return byId;
  }

  let team = displayName
    ? await prisma.team.findFirst({
        where: { name: { equals: displayName, mode: 'insensitive' }, espnId: null },
      })
    : null;
  if (!team && abbr) {
    const byCode = await prisma.team.findUnique({ where: { code: abbr } });
    if (byCode && !byCode.espnId && firstWord(byCode.name) === firstWord(displayName)) team = byCode;
  }
  if (team) {
    return espnId ? prisma.team.update({ where: { id: team.id }, data: { espnId } }) : team;
  }

  // Equipo nuevo: si la sigla ya la usa otro club, se desambigua con el id de ESPN
  let code = abbr || `ESPN${espnId}`;
  if (await prisma.team.findUnique({ where: { code } })) code = `${code}-${espnId}`;
  const logo = t.logos?.[0]?.href ?? t.logo ?? null;
  logger.debug(`Created team: ${code} — ${displayName}`);
  return prisma.team.create({
    data: {
      code,
      espnId,
      name: displayName,
      shortName: t.shortDisplayName ?? (abbr || displayName),
      flagUrl: logo,
      shieldUrl: logo,
      region,
    },
  });
}

/** Torneo de la temporada que informa ESPN (se crea solo cuando empieza una nueva). */
async function ensureTournament(league: LeagueConfig, espnLeague: any) {
  const season = espnLeague?.season ?? {};
  const year: number = season.year ?? dayjs().year();
  const startDate = season.startDate ? new Date(season.startDate) : dayjs().startOf('year').toDate();
  const endDate = season.endDate ? new Date(season.endDate) : dayjs().endOf('year').toDate();
  const seasonLabel = /\d{4}-\d{2}/.exec(season.displayName ?? '')?.[0] ?? String(year);
  const logo: string | null = espnLeague?.logos?.[0]?.href ?? null;

  return prisma.tournament.upsert({
    where: { type_year: { type: league.type as any, year } },
    update: { name: `${league.name} ${seasonLabel}`, isActive: true, startDate, endDate, ...(logo ? { logo } : {}) },
    create: {
      type: league.type as any,
      year,
      name: `${league.name} ${seasonLabel}`,
      shortName: league.shortName,
      startDate,
      endDate,
      hostCountries: [league.country],
      logo,
      isActive: true,
      isFeatured: !!league.featured,
    },
  });
}

/** Días (YYYYMMDD) a consultar: los del calendario de ESPN dentro de la ventana. */
function datesToFetch(espnLeague: any): string[] {
  const from = dayjs().subtract(DAYS_BACK, 'day').startOf('day');
  const to = dayjs().add(DAYS_AHEAD, 'day').endOf('day');
  const cal: unknown[] = Array.isArray(espnLeague?.calendar) ? espnLeague.calendar : [];
  const fromCalendar = cal
    .filter((c): c is string => typeof c === 'string')
    .map((c) => dayjs(c))
    .filter((d) => !d.isBefore(from) && !d.isAfter(to))
    .map((d) => d.format('YYYYMMDD'));
  if (fromCalendar.length > 0) return [...new Set(fromCalendar)];
  // Las copas publican el calendario por fases (objetos), no por días: día por día
  if (cal.some((c) => typeof c === 'string')) return []; // liga sin fechas en la ventana
  const days: string[] = [];
  for (let d = from; !d.isAfter(to); d = d.add(1, 'day')) days.push(d.format('YYYYMMDD'));
  return days;
}

/**
 * Importa/actualiza los partidos de una liga desde ESPN. ESPN ya no acepta
 * rangos de fechas (responde 400), así que se consulta una fecha por pedido.
 */
export async function importLeagueFixtures(tournamentType: string): Promise<string> {
  const league = leagueByType(tournamentType);
  if (!league) throw new Error(`Tipo de torneo no soportado: ${tournamentType}`);

  const head = await espnGet(`${ESPN}/${league.slug}/scoreboard`);
  const espnLeague = head?.leagues?.[0];
  if (!espnLeague) return `ESPN no respondió para ${tournamentType}`;
  const tournament = await ensureTournament(league, espnLeague);

  const events = new Map<string, any>();
  for (const ev of head.events ?? []) events.set(String(ev.id), ev);
  const dates = datesToFetch(espnLeague);
  // de a 4 pedidos en paralelo para no saturar a ESPN
  for (let i = 0; i < dates.length; i += 4) {
    const batch = await Promise.all(
      dates.slice(i, i + 4).map((d) => espnGet(`${ESPN}/${league.slug}/scoreboard?dates=${d}&limit=100`)),
    );
    for (const data of batch) for (const ev of data?.events ?? []) events.set(String(ev.id), ev);
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const event of events.values()) {
    const comp = event.competitions?.[0];
    const homeComp = comp?.competitors?.find((c: any) => c.homeAway === 'home');
    const awayComp = comp?.competitors?.find((c: any) => c.homeAway === 'away');
    if (!homeComp || !awayComp) { skipped++; continue; }

    const homeTeam = await findOrCreateTeam(homeComp, league.region);
    const awayTeam = await findOrCreateTeam(awayComp, league.region);
    if (!homeTeam || !awayTeam) { skipped++; continue; }

    const status = mapStatus(comp.status?.type?.state ?? 'pre');
    const started = status !== MatchStatus.SCHEDULED;
    const data = {
      matchDate: new Date(comp.date ?? event.date),
      status,
      homeScore: started ? parseInt(homeComp.score ?? '0') || 0 : null,
      awayScore: started ? parseInt(awayComp.score ?? '0') || 0 : null,
      minute: status === MatchStatus.LIVE ? parseInt(comp.status?.displayClock ?? '') || null : null,
      venue: comp.venue?.fullName ?? null,
      city: comp.venue?.address?.city ?? null,
      round: event.week?.number ?? null,
    };
    const externalId = String(event.id);

    const existing = await prisma.match.findFirst({ where: { externalId, tournamentId: tournament.id } });
    if (existing) {
      await prisma.match.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.match.create({
        data: {
          ...data,
          tournamentId: tournament.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          stage: 'GROUP',
          externalId,
        },
      });
      imported++;
    }
  }

  const standings = await importLeagueStandings(league, tournament.id);

  await cache.delPattern(`tournament:${tournament.id}*`);
  await cache.delPattern('matches:*');
  await cache.del(`standings:${tournament.id}`);
  lastSync.set(tournamentType, Date.now());

  return `✓ ${tournament.name}: ${imported} nuevos · ${updated} actualizados · ${skipped} saltados (${dates.length} fechas consultadas) · tabla: ${standings} equipos`;
}

function statValue(entry: any, name: string): number {
  return Math.round(entry.stats?.find((s: any) => s.name === name)?.value ?? 0);
}

function groupName(name: string): string {
  return name.replace(/^Group /, 'Grupo ').replace(/^League Phase$/, 'Fase de liga');
}

/**
 * Tabla de posiciones oficial de ESPN (con zonas/grupos/conferencias). Se toma
 * de ESPN en vez de calcularla porque solo guardamos los partidos de la ventana.
 * Devuelve cuántos equipos quedaron en la tabla.
 */
async function importLeagueStandings(league: LeagueConfig, tournamentId: string): Promise<number> {
  const data = await espnGet(`https://site.api.espn.com/apis/v2/sports/soccer/${league.slug}/standings`);
  const children: any[] = data?.children ?? [];
  let count = 0;

  for (let g = 0; g < children.length; g++) {
    const entries: any[] = children[g].standings?.entries ?? [];
    if (entries.length === 0) continue;
    const letter = String.fromCharCode(65 + g);
    const name = children.length === 1 ? 'General' : groupName(children[g].name ?? `Grupo ${letter}`);
    let group = await prisma.tournamentGroup.findFirst({ where: { tournamentId, letter } });
    group = group
      ? await prisma.tournamentGroup.update({ where: { id: group.id }, data: { name } })
      : await prisma.tournamentGroup.create({ data: { tournamentId, letter, name } });

    const teamIds: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const team = await findOrCreateTeam({ team: e.team }, league.region);
      if (!team) continue;
      teamIds.push(team.id);
      const row = {
        played: statValue(e, 'gamesPlayed'),
        won: statValue(e, 'wins'),
        drawn: statValue(e, 'ties'),
        lost: statValue(e, 'losses'),
        goalsFor: statValue(e, 'pointsFor'),
        goalsAgainst: statValue(e, 'pointsAgainst'),
        goalDifference: statValue(e, 'pointDifferential'),
        points: statValue(e, 'points'),
        position: statValue(e, 'rank') || i + 1,
      };
      await prisma.tournamentGroupTeam.upsert({
        where: { groupId_teamId: { groupId: group.id, teamId: team.id } },
        update: row,
        create: { groupId: group.id, teamId: team.id, ...row },
      });
      count++;
    }
    // equipos que ya no están en ese grupo (descensos, cambios de zona)
    await prisma.tournamentGroupTeam.deleteMany({ where: { groupId: group.id, teamId: { notIn: teamIds } } });
  }
  return count;
}

// ── Sincronización a demanda ───────────────────────────────────────────────
// El servidor gratis de Render se duerme sin uso, así que un cron nocturno no
// alcanza: se actualiza al arrancar y cada vez que alguien pide datos y alguna
// liga tiene más de STALE_MS. Corre en segundo plano, sin demorar la respuesta.
const STALE_MS = 3 * 60 * 60 * 1000;
const lastSync = new Map<string, number>();
let running: Promise<void> | null = null;

function isStale(type: string): boolean {
  return Date.now() - (lastSync.get(type) ?? 0) >= STALE_MS;
}

export function syncAllLeagues(onlyStale = false): Promise<void> {
  if (running) return running;
  running = (async () => {
    for (const league of LEAGUES) {
      if (onlyStale && !isStale(league.type)) continue;
      try {
        logger.info(`League sync: ${await importLeagueFixtures(league.type)}`);
      } catch (err: any) {
        logger.warn(`League sync failed [${league.type}]: ${err.message}`);
      }
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Actualiza en segundo plano las ligas con datos viejos (no espera el resultado). */
export function syncStaleLeaguesInBackground(): void {
  if (!running && LEAGUES.some((l) => isStale(l.type))) void syncAllLeagues(true);
}
