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

// ── Correct shields for non-WC national teams + club fixes ─────────────────
// Fixes: code conflicts (BOL=Bolivia/Bologna, COM=Comoros/Como), wrong fd.org IDs
// Applied by /teams/g-fix-other-shields
const OTHER_FIXES: Array<{
  matchBy: 'code' | 'name';
  value: string;
  shieldUrl: string;
  flagUrl?: string;
  note: string;
}> = [
  // ── CODE CONFLICTS: match by name to update only the right team ───────────
  { matchBy: 'name', value: 'Bolivia',  shieldUrl: 'https://flagcdn.com/w160/bo.png', note: 'Bolivia: overridden by Bologna fd(103)' },
  { matchBy: 'name', value: 'Comoros',  shieldUrl: 'https://flagcdn.com/w160/km.png', note: 'Comoros: overridden by Como 1907 fd(5456)' },

  // ── WRONG fd.org CLUB IDs: fix duplicates ────────────────────────────────
  // WOB (VfL Wolfsburg) incorrectly uses id=11 = Stuttgart → use api-sports
  { matchBy: 'code', value: 'WOB',  shieldUrl: 'https://media.api-sports.io/football/teams/162.png', note: 'Wolfsburg: was fd(11)=Stuttgart' },
  // RAY (Rayo Vallecano) incorrectly uses id=87 = Osasuna → correct fd id
  { matchBy: 'code', value: 'RAY',  shieldUrl: 'https://crests.football-data.org/726.png', note: 'Rayo Vallecano: was fd(87)=Osasuna' },
  // PFC (Paris FC) incorrectly uses id=523 = Lyon → ui-avatars
  { matchBy: 'code', value: 'PFC',  shieldUrl: 'https://ui-avatars.com/api/?name=PFC&background=003087&color=fff&size=128&bold=true&font-size=0.45', note: 'Paris FC: was fd(523)=Lyon' },
  // LHC (Le Havre) incorrectly uses id=543 = FC Nantes
  { matchBy: 'code', value: 'LHC',  shieldUrl: 'https://media.api-sports.io/football/teams/111.png', note: 'Le Havre: was fd(543)=Nantes' },

  // ── NON-WC NATIONAL TEAMS: fd.org crests ────────────────────────────────
  { matchBy: 'code', value: 'ITA',  shieldUrl: 'https://crests.football-data.org/784.png', note: 'Italy' },
  { matchBy: 'code', value: 'DEN',  shieldUrl: 'https://crests.football-data.org/807.png', note: 'Denmark' },
  { matchBy: 'code', value: 'POL',  shieldUrl: 'https://crests.football-data.org/778.png', note: 'Poland' },
  { matchBy: 'code', value: 'SRB',  shieldUrl: 'https://crests.football-data.org/793.png', note: 'Serbia' },
  { matchBy: 'code', value: 'CHI',  shieldUrl: 'https://crests.football-data.org/777.png', note: 'Chile' },
  { matchBy: 'code', value: 'PER',  shieldUrl: 'https://crests.football-data.org/785.png', note: 'Peru' },
  { matchBy: 'code', value: 'VEN',  shieldUrl: 'https://crests.football-data.org/786.png', note: 'Venezuela' },
  { matchBy: 'code', value: 'NGA',  shieldUrl: 'https://crests.football-data.org/1028.png', note: 'Nigeria' },
  { matchBy: 'code', value: 'CMR',  shieldUrl: 'https://crests.football-data.org/1022.png', note: 'Cameroon' },
  { matchBy: 'code', value: 'CRC',  shieldUrl: 'https://crests.football-data.org/773.png', note: 'Costa Rica - checking' },
  // Use flagcdn w160 (HD) for less common national teams
  { matchBy: 'code', value: 'CRC',  shieldUrl: 'https://flagcdn.com/w160/cr.png', note: 'Costa Rica HD flag' },
  { matchBy: 'code', value: 'JAM',  shieldUrl: 'https://flagcdn.com/w160/jm.png', note: 'Jamaica HD flag' },
  { matchBy: 'code', value: 'HUN',  shieldUrl: 'https://crests.football-data.org/812.png', note: 'Hungary' },
  { matchBy: 'code', value: 'ALB',  shieldUrl: 'https://flagcdn.com/w160/al.png', note: 'Albania HD flag' },
  { matchBy: 'code', value: 'SVN',  shieldUrl: 'https://crests.football-data.org/814.png', note: 'Slovenia' },
  { matchBy: 'code', value: 'SVK',  shieldUrl: 'https://crests.football-data.org/800.png', note: 'Slovakia' },
  { matchBy: 'code', value: 'ROU',  shieldUrl: 'https://crests.football-data.org/813.png', note: 'Romania' },
  { matchBy: 'code', value: 'UKR',  shieldUrl: 'https://crests.football-data.org/790.png', note: 'Ukraine' },
  { matchBy: 'code', value: 'GEO',  shieldUrl: 'https://crests.football-data.org/1963.png', note: 'Georgia' },
  // Africa/Asia - flagcdn HD for less common
  { matchBy: 'code', value: 'NGA',  shieldUrl: 'https://crests.football-data.org/1028.png', note: 'Nigeria' },
  { matchBy: 'code', value: 'MLI',  shieldUrl: 'https://flagcdn.com/w160/ml.png', note: 'Mali HD flag' },
  { matchBy: 'code', value: 'GAM',  shieldUrl: 'https://flagcdn.com/w160/gm.png', note: 'Gambia HD flag' },
  { matchBy: 'code', value: 'GNB',  shieldUrl: 'https://flagcdn.com/w160/gw.png', note: 'Guinea-Bissau HD flag' },
  { matchBy: 'code', value: 'GUI',  shieldUrl: 'https://flagcdn.com/w160/gn.png', note: 'Guinea HD flag' },
  { matchBy: 'code', value: 'ANG',  shieldUrl: 'https://flagcdn.com/w160/ao.png', note: 'Angola HD flag' },
  { matchBy: 'code', value: 'MOZ',  shieldUrl: 'https://flagcdn.com/w160/mz.png', note: 'Mozambique HD flag' },
  { matchBy: 'code', value: 'NAM',  shieldUrl: 'https://flagcdn.com/w160/na.png', note: 'Namibia HD flag' },
  { matchBy: 'code', value: 'ZAM',  shieldUrl: 'https://flagcdn.com/w160/zm.png', note: 'Zambia HD flag' },
  { matchBy: 'code', value: 'TAN',  shieldUrl: 'https://flagcdn.com/w160/tz.png', note: 'Tanzania HD flag' },
  { matchBy: 'code', value: 'EQG',  shieldUrl: 'https://flagcdn.com/w160/gq.png', note: 'Equatorial Guinea HD flag' },
  { matchBy: 'code', value: 'BFA',  shieldUrl: 'https://flagcdn.com/w160/bf.png', note: 'Burkina Faso HD flag' },
  { matchBy: 'code', value: 'CHN',  shieldUrl: 'https://flagcdn.com/w160/cn.png', note: 'China HD flag' },
  { matchBy: 'code', value: 'IND',  shieldUrl: 'https://flagcdn.com/w160/in.png', note: 'India HD flag' },
  { matchBy: 'code', value: 'VIE',  shieldUrl: 'https://flagcdn.com/w160/vn.png', note: 'Vietnam HD flag' },
  { matchBy: 'code', value: 'TAJ',  shieldUrl: 'https://flagcdn.com/w160/tj.png', note: 'Tajikistan HD flag' },
  { matchBy: 'code', value: 'THA',  shieldUrl: 'https://flagcdn.com/w160/th.png', note: 'Thailand HD flag' },
  { matchBy: 'code', value: 'UAE',  shieldUrl: 'https://flagcdn.com/w160/ae.png', note: 'UAE HD flag' },
  { matchBy: 'code', value: 'SYR',  shieldUrl: 'https://flagcdn.com/w160/sy.png', note: 'Syria HD flag' },
  { matchBy: 'code', value: 'BHR',  shieldUrl: 'https://flagcdn.com/w160/bh.png', note: 'Bahrain HD flag' },
  { matchBy: 'code', value: 'MTN',  shieldUrl: 'https://flagcdn.com/w160/mr.png', note: 'Mauritania HD flag' },
];

// ── WC2026 national team crests: football-data.org verified IDs + flagcdn fallback
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

// Maintenance: fix code conflicts (BOL/COM) + wrong club fd.org IDs + non-WC national teams
teamRoutes.get('/g-fix-other-shields', async (req, res) => {
  try {
    const results: Array<{ matched: string; id: string; shieldUrl: string; note: string }> = [];
    const notFound: string[] = [];

    for (const fix of OTHER_FIXES) {
      let teams: Array<{ id: string; code: string; name: string }> = [];

      if (fix.matchBy === 'code') {
        teams = await prisma.team.findMany({
          where: { code: fix.value },
          select: { id: true, code: true, name: true },
        });
      } else {
        teams = await prisma.team.findMany({
          where: { name: { contains: fix.value, mode: 'insensitive' } },
          select: { id: true, code: true, name: true },
        });
      }

      if (teams.length === 0) {
        notFound.push(`${fix.matchBy}=${fix.value}`);
        continue;
      }

      for (const team of teams) {
        const data: any = { shieldUrl: fix.shieldUrl };
        if (fix.flagUrl) data.flagUrl = fix.flagUrl;
        await prisma.team.update({ where: { id: team.id }, data });
        results.push({ matched: `${team.code}|${team.name}`, id: team.id, shieldUrl: fix.shieldUrl, note: fix.note });
      }
    }

    res.json({ success: true, data: { updated: results.length, notFound, results } });
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
