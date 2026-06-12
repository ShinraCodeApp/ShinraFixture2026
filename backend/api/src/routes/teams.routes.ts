import { Router } from 'express';
import axios from 'axios';
import { TeamController } from '../controllers/teams.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { prisma } from '../config/database';
import { config } from '../config';

export const teamRoutes = Router();

// Cache ESPN IDs in memory (reset on server restart)
const espnIdCache: Record<string, number | null> = {};

async function resolveESPNId(teamCode: string, teamName: string): Promise<number | null> {
  if (teamCode in espnIdCache) return espnIdCache[teamCode];

  try {
    const res = await axios.get(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams',
      { timeout: 5000 }
    );
    const teams: any[] = res.data?.sports?.[0]?.leagues?.[0]?.teams ?? [];

    for (const entry of teams) {
      const t = entry.team;
      const abbr: string = (t.abbreviation ?? '').toUpperCase();
      const display: string = (t.displayName ?? '').toLowerCase();
      const code = teamCode.toUpperCase();
      const nameLower = teamName.toLowerCase();

      if (abbr === code || display === nameLower || display.includes(nameLower.split(' ')[0])) {
        const id = parseInt(t.id, 10);
        espnIdCache[teamCode] = id;
        return id;
      }
    }
  } catch (_) { /* ESPN unreachable */ }

  espnIdCache[teamCode] = null;
  return null;
}

// Resolve ESPN URL (legacy)
teamRoutes.get('/:id/espn-url', async (req, res) => {
  const { type = 'squad' } = req.query as { type?: string };
  const team = await prisma.team.findUnique({ where: { id: req.params.id }, select: { code: true, name: true } });
  if (!team) return res.status(404).json({ success: false });
  const espnId = await resolveESPNId(team.code, team.name);
  if (!espnId) return res.status(404).json({ success: false, message: 'No encontrado en ESPN' });
  const url = type === 'stats'
    ? `https://www.espn.com.ar/futbol/equipo/estadisticas/_/id/${espnId}`
    : `https://www.espn.com.ar/futbol/equipo/plantilla/_/id/${espnId}`;
  res.json({ success: true, data: { espnId, url } });
});

// ESPN squad (native structured data)
teamRoutes.get('/:id/espn-squad', async (req, res) => {
  const team = await prisma.team.findUnique({ where: { id: req.params.id }, select: { code: true, name: true } });
  if (!team) return res.status(404).json({ success: false });

  const espnId = await resolveESPNId(team.code, team.name);
  if (!espnId) return res.status(404).json({ success: false, message: 'No disponible' });

  const rosterRes = await axios.get(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${espnId}/roster`,
    { timeout: 8000 }
  );

  const POSITION_ORDER = ['GK', 'GR', 'DEF', 'MF', 'FW', 'MID', 'ATT', 'DF'];
  const athletes: any[] = rosterRes.data.athletes ?? [];

  const squad = athletes.map((a: any) => ({
    id: a.id,
    name: a.displayName ?? a.fullName ?? '',
    number: a.jersey ? parseInt(a.jersey) : null,
    position: a.position?.displayName ?? 'Jugador',
    positionAbbr: a.position?.abbreviation ?? '',
    age: a.age ?? null,
    nationality: a.birthPlace?.country ?? null,
    photoUrl: a.headshot?.href ?? null,
  }));

  const GROUPS: Record<string, { label: string; abbrs: string[] }> = {
    GK: { label: 'Porteros', abbrs: ['GK', 'GR', 'POR', 'G'] },
    DF: { label: 'Defensas', abbrs: ['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'DEF', 'DF', 'D'] },
    MF: { label: 'Centrocampistas', abbrs: ['CM', 'DM', 'AM', 'LM', 'RM', 'CAM', 'CDM', 'MF', 'MID', 'M'] },
    FW: { label: 'Delanteros', abbrs: ['CF', 'LW', 'RW', 'SS', 'FW', 'ST', 'ATT', 'F'] },
  };

  const grouped: Record<string, { label: string; players: any[] }> = {};
  for (const key of Object.keys(GROUPS)) grouped[key] = { label: GROUPS[key].label, players: [] };

  for (const player of squad) {
    const abbr = (player.positionAbbr ?? '').toUpperCase();
    let placed = false;
    for (const [key, g] of Object.entries(GROUPS)) {
      if (g.abbrs.includes(abbr)) { grouped[key].players.push(player); placed = true; break; }
    }
    if (!placed) grouped['FW'].players.push(player);
  }

  res.json({ success: true, data: { squad, grouped } });
});

// ESPN team tournament stats (native structured data)
teamRoutes.get('/:id/espn-team-stats', async (req, res) => {
  const team = await prisma.team.findUnique({ where: { id: req.params.id }, select: { code: true, name: true } });
  if (!team) return res.status(404).json({ success: false });

  const espnId = await resolveESPNId(team.code, team.name);
  if (!espnId) return res.status(404).json({ success: false, message: 'No disponible' });

  const teamRes = await axios.get(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${espnId}`,
    { timeout: 8000 }
  );

  const t = teamRes.data.team ?? {};
  const record = t.record?.items?.[0]?.stats ?? [];

  const getStat = (name: string) => {
    const s = record.find((r: any) => r.name === name || r.shortDisplayName === name);
    return s ? (parseFloat(s.value) || 0) : 0;
  };

  const stats = {
    matchesPlayed: getStat('gamesPlayed') || getStat('GP'),
    wins: getStat('wins') || getStat('W'),
    draws: getStat('ties') || getStat('ties') || getStat('D'),
    losses: getStat('losses') || getStat('L'),
    goalsFor: getStat('pointsFor') || getStat('GF') || getStat('goals'),
    goalsAgainst: getStat('pointsAgainst') || getStat('GA'),
    points: getStat('points') || getStat('PTS') || getStat('pts'),
    rawStats: record,
  };

  // Top scorers from ESPN
  let topScorers: any[] = [];
  try {
    const statsRes = await axios.get(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${espnId}/statistics`,
      { timeout: 5000 }
    );
    const cats = statsRes.data.results?.[0]?.stats ?? [];
    topScorers = cats.slice(0, 5).map((s: any) => ({
      name: s.athlete?.displayName ?? '—',
      goals: s.stats?.find((x: any) => x.name === 'goals')?.value ?? 0,
      assists: s.stats?.find((x: any) => x.name === 'goalAssists')?.value ?? 0,
      photoUrl: s.athlete?.headshot?.href ?? null,
    }));
  } catch (_) {}

  res.json({ success: true, data: { stats, topScorers } });
});

// WC2026 national team crests: football-data.org verified IDs + flagcdn fallback
const WC_SHIELDS: Record<string, string> = {
  // fd.org confirmed
  ARG: 'https://crests.football-data.org/762.png',
  AUS: 'https://crests.football-data.org/825.png',
  AUT: 'https://crests.football-data.org/816.png',
  BEL: 'https://crests.football-data.org/805.png',
  BRA: 'https://crests.football-data.org/764.png',
  CAN: 'https://crests.football-data.org/769.png',
  COL: 'https://crests.football-data.org/779.png',
  CRO: 'https://crests.football-data.org/799.png',
  CZE: 'https://crests.football-data.org/798.png',
  ECU: 'https://crests.football-data.org/774.png',
  ENG: 'https://crests.football-data.org/770.png',
  ESP: 'https://crests.football-data.org/760.png',
  FRA: 'https://crests.football-data.org/773.png',
  GER: 'https://crests.football-data.org/759.png',
  IRN: 'https://crests.football-data.org/794.png',
  JPN: 'https://crests.football-data.org/827.png',
  KOR: 'https://crests.football-data.org/788.png',
  KSA: 'https://crests.football-data.org/1030.png',
  MAR: 'https://crests.football-data.org/1031.png',
  MEX: 'https://crests.football-data.org/772.png',
  NED: 'https://crests.football-data.org/776.png',
  NOR: 'https://crests.football-data.org/782.png',
  NZL: 'https://crests.football-data.org/826.png',
  PAR: 'https://crests.football-data.org/775.png',
  POR: 'https://crests.football-data.org/765.png',
  QAT: 'https://crests.football-data.org/1029.png',
  SCO: 'https://crests.football-data.org/833.png',
  SEN: 'https://crests.football-data.org/907.png',
  SUI: 'https://crests.football-data.org/781.png',
  SWE: 'https://crests.football-data.org/784.png',
  TUN: 'https://crests.football-data.org/1024.png',
  TUR: 'https://crests.football-data.org/792.png',
  URU: 'https://crests.football-data.org/780.png',
  USA: 'https://crests.football-data.org/771.png',
  BIH: 'https://crests.football-data.org/811.png',
  CIV: 'https://crests.football-data.org/1021.png',
  EGY: 'https://crests.football-data.org/1016.png',
  GHA: 'https://crests.football-data.org/1920.png',
  RSA: 'https://crests.football-data.org/1019.png',
  // flagcdn fallback (HD w160) for less common nations
  ALG: 'https://flagcdn.com/w160/dz.png',
  COD: 'https://flagcdn.com/w160/cd.png',
  CPV: 'https://flagcdn.com/w160/cv.png',
  CUW: 'https://flagcdn.com/w160/cw.png',
  HTI: 'https://flagcdn.com/w160/ht.png',
  IRQ: 'https://flagcdn.com/w160/iq.png',
  JOR: 'https://flagcdn.com/w160/jo.png',
  PAN: 'https://flagcdn.com/w160/pa.png',
  UZB: 'https://flagcdn.com/w160/uz.png',
};

// Maintenance: update WC2026 national team shields to proper federation crests
teamRoutes.get('/g-sync-shields', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { type: 'WORLD_CUP', year: 2026 },
      include: { groups: { include: { teams: { include: { team: true } } } } },
    });

    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    const ourTeams: Array<{ id: string; code: string; name: string }> = [];
    for (const g of tournament.groups) {
      for (const gt of g.teams) {
        if (!ourTeams.find((t) => t.id === gt.team.id)) {
          ourTeams.push({ id: gt.team.id, code: gt.team.code, name: gt.team.name });
        }
      }
    }

    const updates: Array<{ code: string; name: string; crest: string }> = [];
    const skipped: string[] = [];

    for (const team of ourTeams) {
      const crest = WC_SHIELDS[team.code];
      if (crest) {
        await prisma.team.update({ where: { id: team.id }, data: { shieldUrl: crest } });
        updates.push({ code: team.code, name: team.name, crest });
      } else {
        skipped.push(`${team.code} (${team.name})`);
      }
    }

    res.json({ success: true, data: { updated: updates.length, skipped: skipped.length, updates, skipped } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

teamRoutes.get('/', TeamController.list);
teamRoutes.get('/standings/:tournamentId', TeamController.getStandings);
teamRoutes.get('/group/:group', TeamController.getByGroup);
teamRoutes.get('/:id', TeamController.getById);
teamRoutes.get('/:id/players', TeamController.getPlayers);
teamRoutes.get('/:id/matches', TeamController.getMatches);
teamRoutes.get('/:id/stats', TeamController.getStats);
