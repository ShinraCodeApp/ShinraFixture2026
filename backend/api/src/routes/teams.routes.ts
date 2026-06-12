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

  // ── NON-WC NATIONAL TEAMS: ESPN country logos (verified 200 on ESPN CDN) ─
  // URL pattern: https://a.espncdn.com/i/teamlogos/countries/500/{abbr}.png
  { matchBy: 'code', value: 'ITA', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/ita.png', note: 'Italy ESPN' },
  { matchBy: 'code', value: 'DEN', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/den.png', note: 'Denmark ESPN' },
  { matchBy: 'code', value: 'POL', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/pol.png', note: 'Poland ESPN' },
  { matchBy: 'code', value: 'SRB', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/srb.png', note: 'Serbia ESPN' },
  { matchBy: 'code', value: 'CHI', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/chi.png', note: 'Chile ESPN' },
  { matchBy: 'code', value: 'PER', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/per.png', note: 'Peru ESPN' },
  { matchBy: 'code', value: 'VEN', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/ven.png', note: 'Venezuela ESPN' },
  { matchBy: 'code', value: 'NGA', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/nga.png', note: 'Nigeria ESPN' },
  { matchBy: 'code', value: 'CMR', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/cmr.png', note: 'Cameroon ESPN' },
  { matchBy: 'code', value: 'CRC', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/crc.png', note: 'Costa Rica ESPN' },
  { matchBy: 'code', value: 'JAM', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/jam.png', note: 'Jamaica ESPN' },
  { matchBy: 'code', value: 'HUN', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/hun.png', note: 'Hungary ESPN' },
  { matchBy: 'code', value: 'ALB', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/alb.png', note: 'Albania ESPN' },
  { matchBy: 'code', value: 'SVN', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/svn.png', note: 'Slovenia ESPN' },
  { matchBy: 'code', value: 'SVK', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/svk.png', note: 'Slovakia ESPN' },
  { matchBy: 'code', value: 'ROU', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/rou.png', note: 'Romania ESPN' },
  { matchBy: 'code', value: 'UKR', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/ukr.png', note: 'Ukraine ESPN' },
  { matchBy: 'code', value: 'GEO', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/geo.png', note: 'Georgia ESPN' },
  { matchBy: 'code', value: 'MLI', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/mli.png', note: 'Mali ESPN' },
  { matchBy: 'code', value: 'GAM', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/gam.png', note: 'Gambia ESPN' },
  { matchBy: 'code', value: 'GNB', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/gnb.png', note: 'Guinea-Bissau ESPN' },
  { matchBy: 'code', value: 'GUI', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/gui.png', note: 'Guinea ESPN' },
  { matchBy: 'code', value: 'ANG', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/ang.png', note: 'Angola ESPN' },
  { matchBy: 'code', value: 'MOZ', shieldUrl: 'https://flagcdn.com/w160/mz.png', note: 'Mozambique flag HD' },
  { matchBy: 'code', value: 'NAM', shieldUrl: 'https://flagcdn.com/w160/na.png', note: 'Namibia flag HD' },
  { matchBy: 'code', value: 'ZAM', shieldUrl: 'https://flagcdn.com/w160/zm.png', note: 'Zambia flag HD' },
  { matchBy: 'code', value: 'TAN', shieldUrl: 'https://flagcdn.com/w160/tz.png', note: 'Tanzania flag HD' },
  { matchBy: 'code', value: 'EQG', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/eqg.png', note: 'Equatorial Guinea ESPN' },
  { matchBy: 'code', value: 'BFA', shieldUrl: 'https://flagcdn.com/w160/bf.png', note: 'Burkina Faso flag HD' },
  { matchBy: 'code', value: 'CHN', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/chn.png', note: 'China ESPN' },
  { matchBy: 'code', value: 'IND', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/ind.png', note: 'India ESPN' },
  { matchBy: 'code', value: 'VIE', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/vie.png', note: 'Vietnam ESPN' },
  { matchBy: 'code', value: 'TAJ', shieldUrl: 'https://flagcdn.com/w160/tj.png', note: 'Tajikistan flag HD' },
  { matchBy: 'code', value: 'THA', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/tha.png', note: 'Thailand ESPN' },
  { matchBy: 'code', value: 'UAE', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/uae.png', note: 'UAE ESPN' },
  { matchBy: 'code', value: 'SYR', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/syr.png', note: 'Syria ESPN' },
  { matchBy: 'code', value: 'BHR', shieldUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/bhr.png', note: 'Bahrain ESPN' },
  { matchBy: 'code', value: 'MTN', shieldUrl: 'https://flagcdn.com/w160/mr.png', note: 'Mauritania flag HD' },
];

// Our 3-letter code → ESPN abbreviation (only when they differ)
const ESPN_ABBR_OVERRIDE: Record<string, string> = {
  HTI: 'HAI',   // Haiti: FIFA=HTI, ESPN=HAI
};

// Maintenance: update WC2026 national team shields using ESPN official logos
teamRoutes.get('/g-sync-shields', async (req, res) => {
  try {
    // 1. Fetch WC2026 team logos from ESPN (no API key needed)
    const espnRes = await axios.get(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams?limit=100',
      { timeout: 10000 }
    );
    const espnTeams: any[] = espnRes.data?.sports?.[0]?.leagues?.[0]?.teams ?? [];

    // Build map: ESPN abbreviation (uppercase) → logo URL
    const espnLogoByAbbr: Record<string, string> = {};
    for (const entry of espnTeams) {
      const abbr = (entry.team?.abbreviation ?? '').toUpperCase();
      const logo = entry.team?.logos?.[0]?.href;
      if (abbr && logo) espnLogoByAbbr[abbr] = logo;
    }

    // 2. Load our WC2026 teams from DB
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

    // 3. Match & update
    const updates: Array<{ code: string; name: string; crest: string }> = [];
    const skipped: string[] = [];

    for (const team of ourTeams) {
      const espnAbbr = ESPN_ABBR_OVERRIDE[team.code] ?? team.code;
      const logo = espnLogoByAbbr[espnAbbr];
      if (logo) {
        await prisma.team.update({ where: { id: team.id }, data: { shieldUrl: logo } });
        updates.push({ code: team.code, name: team.name, crest: logo });
      } else {
        skipped.push(`${team.code} (${team.name}) — ESPN abbr tried: ${espnAbbr}`);
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
