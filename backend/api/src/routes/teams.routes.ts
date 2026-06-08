import { Router } from 'express';
import axios from 'axios';
import { TeamController } from '../controllers/teams.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { prisma } from '../config/database';

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

teamRoutes.get('/', TeamController.list);
teamRoutes.get('/standings/:tournamentId', TeamController.getStandings);
teamRoutes.get('/group/:group', TeamController.getByGroup);
teamRoutes.get('/:id', TeamController.getById);
teamRoutes.get('/:id/players', TeamController.getPlayers);
teamRoutes.get('/:id/matches', TeamController.getMatches);
teamRoutes.get('/:id/stats', TeamController.getStats);
