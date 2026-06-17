import { Router } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { StatsController } from '../controllers/stats.controller';
import { prisma } from '../config/database';

export const statsRoutes = Router();

statsRoutes.get('/top-scorers', StatsController.topScorers);
statsRoutes.get('/top-assists', StatsController.topAssists);
statsRoutes.get('/top-cards', StatsController.topCards);
statsRoutes.get('/team-stats', StatsController.teamStats);
statsRoutes.get('/match-stats', StatsController.matchStats);
statsRoutes.get('/tournament-summary', StatsController.tournamentSummary);

// ─── In-memory cache ───────────────────────────────────────────────────────
const _cache = new Map<string, { data: any; exp: number }>();
function cacheGet(key: string) { const e = _cache.get(key); return (e && Date.now() < e.exp) ? e.data : null; }
function cacheSet(key: string, data: any, ttlMs = 5 * 60_000) { _cache.set(key, { data, exp: Date.now() + ttlMs }); }

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-AR,es;q=0.9',
};
const ESPN_HEADERS = { ...BROWSER_HEADERS, Accept: 'application/json' };

// ─── WC2026 group standings ── computed from DB + ESPN supplement ──────────
statsRoutes.get('/wc-standings', async (_req, res) => {
  const cached = cacheGet('wc-standings');
  if (cached) return res.json({ success: true, source: 'cache', data: cached });

  try {
    // Step 1: compute standings from finished matches
    const finishedMatches = await prisma.match.findMany({
      where: { stage: 'GROUP', status: { in: ['FINISHED'] }, tournament: { type: 'WORLD_CUP' } },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, code: true, shieldUrl: true, flagUrl: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, code: true, shieldUrl: true, flagUrl: true } },
      },
    });

    const groupMap: Record<string, Record<string, any>> = {};

    for (const m of finishedMatches) {
      if (!m.group) continue; // skip matches with no group assigned (duplicate/orphan)
      const group = m.group;
      if (!groupMap[group]) groupMap[group] = {};
      const hGoals = m.homeScore ?? 0;
      const aGoals = m.awayScore ?? 0;
      for (const [teamId, team, gf, ga] of [
        [m.homeTeamId, m.homeTeam, hGoals, aGoals],
        [m.awayTeamId, m.awayTeam, aGoals, hGoals],
      ] as [string, any, number, number][]) {
        if (!groupMap[group][teamId]) {
          groupMap[group][teamId] = {
            team: { id: team.id, name: team.name, shortName: team.shortName, code: team.code, logo: team.shieldUrl ?? team.flagUrl },
            pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0,
          };
        }
        const row = groupMap[group][teamId];
        row.pj++; row.gf += gf; row.gc += ga;
        if (gf > ga) { row.pg++; row.pts += 3; }
        else if (gf === ga) { row.pe++; row.pts += 1; }
        else { row.pp++; }
      }
    }

    // Step 2: fill in ALL WC teams so groups without finished matches still appear
    const allGroupMatches = await prisma.match.findMany({
      where: { stage: 'GROUP', tournament: { type: 'WORLD_CUP' } },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, code: true, shieldUrl: true, flagUrl: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, code: true, shieldUrl: true, flagUrl: true } },
      },
      orderBy: { matchDate: 'asc' },
    });
    for (const m of allGroupMatches) {
      if (!m.group) continue; // skip null-group matches
      const g = m.group;
      if (!groupMap[g]) groupMap[g] = {};
      for (const [tId, t] of [[m.homeTeamId, m.homeTeam], [m.awayTeamId, m.awayTeam]] as [string, any][]) {
        if (!groupMap[g][tId]) {
          groupMap[g][tId] = {
            team: { id: t.id, name: t.name, shortName: t.shortName, code: t.code, logo: t.shieldUrl ?? t.flagUrl },
            pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0,
          };
        }
      }
    }

    // Step 3: sort all 12 groups and return
    const standings = Object.entries(groupMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, teams]) => ({
        group: groupName,
        entries: Object.values(teams)
          .sort((a: any, b: any) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if ((b.gf - b.gc) !== (a.gf - a.gc)) return (b.gf - b.gc) - (a.gf - a.gc);
            return b.gf - a.gf;
          })
          .map((e: any, i: number) => ({ ...e, pos: i + 1, dif: e.gf - e.gc })),
      }));

    cacheSet('wc-standings', standings, 3 * 60_000);
    return res.json({ success: true, source: 'db', data: standings });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ESPN statistics API helper ───────────────────────────────────────────
// ESPN's page uses React (client-side), so cheerio scraping returns empty tables.
// The correct source is their statistics API: data.stats[0].leaders (NOT data.categories).
// athlete.statistics[] contains per-player breakdowns including goalAssists.
let _espnStatsCache: { leaders: any[]; ts: number } | null = null;

async function fetchESPNLeaders(limit = 200): Promise<any[]> {
  if (_espnStatsCache && Date.now() - _espnStatsCache.ts < 4 * 60_000) {
    return _espnStatsCache.leaders;
  }
  const { data } = await axios.get(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/statistics?lang=es&limit=${limit}`,
    { headers: ESPN_HEADERS, timeout: 10_000 }
  );
  // ESPN returns: { stats: [{ name: "goalsLeaders", leaders: [...] }] }
  const goalsCategory = (data.stats ?? []).find((s: any) =>
    s.name === 'goalsLeaders' || s.abbreviation === 'G'
  );
  const leaders: any[] = goalsCategory?.leaders ?? [];
  if (leaders.length > 0) {
    _espnStatsCache = { leaders, ts: Date.now() };
  }
  return leaders;
}

function espnNormalize(item: any): { name: string; goals: number; assists: number; value: number; photo: string | undefined; team: { name: string; logo: string | undefined } } {
  const assistStat = (item.athlete?.statistics ?? []).find((s: any) =>
    s.name === 'goalAssists' || s.abbreviation === 'A'
  );
  return {
    name: item.athlete?.displayName ?? '—',
    goals: item.value ?? 0,
    assists: assistStat?.value ?? 0,
    value: item.value ?? 0,
    photo: item.athlete?.headshot?.href,
    team: {
      name: item.athlete?.team?.displayName ?? item.athlete?.team?.name ?? '',
      logo: item.athlete?.team?.logos?.[0]?.href,
    },
  };
}

// ─── WC2026 top scorers ─────────────────────────────────────────────────────
statsRoutes.get('/wc-scorers', async (_req, res) => {
  const cached = cacheGet('wc-scorers');
  if (cached) return res.json({ success: true, source: 'cache', data: cached });

  // Primary: ESPN statistics API (correct source — data.stats[0].leaders)
  try {
    const leaders = await fetchESPNLeaders(200);
    if (leaders.length >= 3) {
      const normalized = leaders.map(espnNormalize)
        .sort((a, b) => b.goals - a.goals);
      const result = { categories: [{ displayName: 'Goleadores', leaders: normalized }] };
      cacheSet('wc-scorers', result, 4 * 60_000);
      return res.json({ success: true, source: 'espn-api', data: result });
    }
  } catch {}

  // Fallback: DB match events
  try {
    const goals = await prisma.matchEvent.findMany({
      where: { type: 'GOAL', match: { tournament: { type: 'WORLD_CUP' }, status: 'FINISHED' } },
      include: { match: { include: { homeTeam: { select: { name: true, code: true, flagUrl: true } }, awayTeam: { select: { name: true, code: true, flagUrl: true } } } } },
    });
    if (goals.length > 0) {
      const map: Record<string, any> = {};
      for (const g of goals) {
        const key = (g.description ?? '').trim();
        if (!key) continue;
        if (!map[key]) { const isHome = g.teamId === g.match.homeTeamId; map[key] = { name: key, goals: 0, team: isHome ? g.match.homeTeam : g.match.awayTeam }; }
        map[key].goals++;
      }
      const scorers = Object.values(map).sort((a: any, b: any) => b.goals - a.goals).slice(0, 30);
      if (scorers.length >= 3) {
        const result = { categories: [{ displayName: 'Goleadores', leaders: scorers }] };
        cacheSet('wc-scorers', result, 2 * 60_000);
        return res.json({ success: true, source: 'db', data: result });
      }
    }
  } catch {}

  return res.status(502).json({ success: false, error: 'No scorer data available' });
});

// ─── WC2026 top assists ──────────────────────────────────────────────────────
statsRoutes.get('/wc-assists', async (_req, res) => {
  const cached = cacheGet('wc-assists');
  if (cached) return res.json({ success: true, source: 'cache', data: cached });

  // Extract assists from athlete.statistics[] on each player in the goals response.
  // Note: players with 0 goals won't appear here (ESPN API is goals-sorted).
  try {
    const leaders = await fetchESPNLeaders(200);
    if (leaders.length > 0) {
      const withAssists = leaders
        .map(espnNormalize)
        .filter(p => p.assists > 0)
        .sort((a, b) => b.assists - a.assists);
      if (withAssists.length >= 1) {
        const result = { categories: [{ displayName: 'Asistencias', leaders: withAssists }] };
        cacheSet('wc-assists', result, 4 * 60_000);
        return res.json({ success: true, source: 'espn-api', data: result });
      }
    }
  } catch {}

  // Fallback: DB match events (ASSIST type)
  try {
    const events = await prisma.matchEvent.findMany({
      where: { type: 'ASSIST', match: { tournament: { type: 'WORLD_CUP' }, status: 'FINISHED' } },
      include: { match: { include: { homeTeam: { select: { name: true, code: true, flagUrl: true } }, awayTeam: { select: { name: true, code: true, flagUrl: true } } } } },
    });
    if (events.length > 0) {
      const map: Record<string, any> = {};
      for (const e of events) {
        const key = (e.description ?? '').trim();
        if (!key) continue;
        if (!map[key]) { const isHome = e.teamId === e.match.homeTeamId; map[key] = { name: key, assists: 0, team: isHome ? e.match.homeTeam : e.match.awayTeam }; }
        map[key].assists++;
      }
      const assists = Object.values(map).sort((a: any, b: any) => b.assists - a.assists).slice(0, 30);
      if (assists.length >= 1) {
        const result = { categories: [{ displayName: 'Asistencias', leaders: assists }] };
        cacheSet('wc-assists', result, 2 * 60_000);
        return res.json({ success: true, source: 'db', data: result });
      }
    }
  } catch {}

  return res.status(502).json({ success: false, error: 'No assist data available' });
});

// ─── WC2026 team stats ── DB computed ─────────────────────────────────────
statsRoutes.get('/wc-team-stats', async (_req, res) => {
  const cached = cacheGet('wc-team-stats');
  if (cached) return res.json({ success: true, source: 'cache', data: cached });

  try {
    const stats = await prisma.matchStats.findMany({
      include: { match: { include: { homeTeam: { select: { name: true, code: true, flagUrl: true, shieldUrl: true } }, awayTeam: { select: { name: true, code: true, flagUrl: true, shieldUrl: true } } } } },
    });

    const teamMap: Record<string, any> = {};
    for (const s of stats) {
      const { homeTeam: h, awayTeam: a } = s.match;
      const addStats = (team: any, shots: number, shotsOT: number, poss: number, corners: number) => {
        if (!teamMap[team.code]) teamMap[team.code] = { team, shots: 0, shotsOnTarget: 0, possession: [], corners: 0, n: 0 };
        const r = teamMap[team.code];
        r.shots += shots;
        r.shotsOnTarget += shotsOT;
        r.possession.push(poss);
        r.corners += corners;
        r.n++;
      };
      addStats(h, s.homeShots ?? 0, s.homeShotsOnTarget ?? 0, s.homePossession ?? 50, s.homeCorners ?? 0);
      addStats(a, s.awayShots ?? 0, s.awayShotsOnTarget ?? 0, s.awayPossession ?? 50, s.awayCorners ?? 0);
    }

    const result = Object.values(teamMap).map((r: any) => ({
      ...r,
      avgPossession: r.possession.length ? Math.round(r.possession.reduce((a: number, b: number) => a + b, 0) / r.possession.length) : 0,
      possession: undefined,
    })).sort((a: any, b: any) => b.shots - a.shots);

    cacheSet('wc-team-stats', result);
    return res.json({ success: true, source: 'db', data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ESPN CDN shields for Argentine clubs — keyed by partial team name (lowercase)
const ARG_ESPN_SHIELDS: Array<[string, string]> = [
  ['river',          'https://a.espncdn.com/i/teamlogos/soccer/500/16.png'],
  ['boca',           'https://a.espncdn.com/i/teamlogos/soccer/500/5.png'],
  ['racing',         'https://a.espncdn.com/i/teamlogos/soccer/500/15.png'],
  ['independiente r','https://a.espncdn.com/i/teamlogos/soccer/500/9744.png'],
  ['independiente',  'https://a.espncdn.com/i/teamlogos/soccer/500/11.png'],
  ['san lorenzo',    'https://a.espncdn.com/i/teamlogos/soccer/500/18.png'],
  ['vélez',          'https://a.espncdn.com/i/teamlogos/soccer/500/21.png'],
  ['velez',          'https://a.espncdn.com/i/teamlogos/soccer/500/21.png'],
  ['estudiantes',    'https://a.espncdn.com/i/teamlogos/soccer/500/8.png'],
  ['huracán',        'https://a.espncdn.com/i/teamlogos/soccer/500/10.png'],
  ['huracan',        'https://a.espncdn.com/i/teamlogos/soccer/500/10.png'],
  ['lanús',          'https://a.espncdn.com/i/teamlogos/soccer/500/12.png'],
  ['lanus',          'https://a.espncdn.com/i/teamlogos/soccer/500/12.png'],
  ['rosario central','https://a.espncdn.com/i/teamlogos/soccer/500/17.png'],
  ['belgrano',       'https://a.espncdn.com/i/teamlogos/soccer/500/4.png'],
  ['talleres',       'https://a.espncdn.com/i/teamlogos/soccer/500/19.png'],
  ["newell",         'https://a.espncdn.com/i/teamlogos/soccer/500/14.png'],
  ['argentinos',     'https://a.espncdn.com/i/teamlogos/soccer/500/3.png'],
  ['gimnasia mendoza','https://a.espncdn.com/i/teamlogos/soccer/500/11972.png'],
  ['gimnasia',       'https://a.espncdn.com/i/teamlogos/soccer/500/9.png'],
  ['banfield',       'https://a.espncdn.com/i/teamlogos/soccer/500/235.png'],
  ['platense',       'https://a.espncdn.com/i/teamlogos/soccer/500/7764.png'],
  ['tigre',          'https://a.espncdn.com/i/teamlogos/soccer/500/7767.png'],
  ['defensa',        'https://a.espncdn.com/i/teamlogos/soccer/500/8950.png'],
  ['barracas',       'https://a.espncdn.com/i/teamlogos/soccer/500/10060.png'],
  ['tucumán',        'https://a.espncdn.com/i/teamlogos/soccer/500/9785.png'],
  ['tucuman',        'https://a.espncdn.com/i/teamlogos/soccer/500/9785.png'],
  ['instituto',      'https://a.espncdn.com/i/teamlogos/soccer/500/2975.png'],
  ['central córdoba','https://a.espncdn.com/i/teamlogos/soccer/500/11989.png'],
  ['central cordoba','https://a.espncdn.com/i/teamlogos/soccer/500/11989.png'],
  ['unión',          'https://a.espncdn.com/i/teamlogos/soccer/500/20.png'],
  ['union',          'https://a.espncdn.com/i/teamlogos/soccer/500/20.png'],
  ['sarmiento',      'https://a.espncdn.com/i/teamlogos/soccer/500/10158.png'],
  ['riestra',        'https://a.espncdn.com/i/teamlogos/soccer/500/17702.png'],
  ['aldosivi',       'https://a.espncdn.com/i/teamlogos/soccer/500/9739.png'],
];

function resolveArgShield(teamName: string): string | null {
  const lower = teamName.toLowerCase();
  for (const [key, url] of ARG_ESPN_SHIELDS) {
    if (lower.includes(key)) return url;
  }
  return null;
}

// ─── Liga Argentina standings ── TyC Sports scraping + ESPN fallback ──────
statsRoutes.get('/liga-argentina', async (_req, res) => {
  const cached = cacheGet('liga-argentina');
  if (cached) return res.json({ success: true, source: 'cache', data: cached });

  // Primary: TyC Sports HTML scraping
  try {
    const { data: html } = await axios.get(
      'https://www.tycsports.com/estadisticas/liga-profesional-de-futbol.html',
      { headers: BROWSER_HEADERS, timeout: 12_000 }
    );
    const $ = cheerio.load(html);
    const teams: any[] = [];

    $('table tbody tr').each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td').map((_j, td) => $(td).text().trim()).get();
      // TyC Sports columns: [pos, empty/rank, teamName, pts, pj, pg, pe, pp, gf, gc, dif]
      // The img shield is lazy-loaded — try data-src first
      const img = $row.find('img').first();
      const shieldSrc = img.attr('data-src') ?? img.attr('data-lazy-src') ?? img.attr('data-original') ?? img.attr('src') ?? '';
      const realShield = shieldSrc.startsWith('data:') ? '' : shieldSrc;

      // Try to detect the actual structure by finding first non-numeric, non-empty cell as team name
      let teamIdx = -1;
      for (let k = 0; k < cells.length; k++) {
        if (cells[k] && isNaN(Number(cells[k]))) { teamIdx = k; break; }
      }
      if (teamIdx < 0 || cells.length < 5) return;

      const teamName = cells[teamIdx];
      const espnShield = resolveArgShield(teamName);
      teams.push({
        pos: i + 1,
        team: teamName,
        shield: espnShield ?? realShield,
        pts: cells[teamIdx + 1] ?? '-',
        pj:  cells[teamIdx + 2] ?? '-',
        pg:  cells[teamIdx + 3] ?? '-',
        pe:  cells[teamIdx + 4] ?? '-',
        pp:  cells[teamIdx + 5] ?? '-',
        gf:  cells[teamIdx + 6] ?? '-',
        gc:  cells[teamIdx + 7] ?? '-',
        dif: cells[teamIdx + 8] ?? '-',
      });
    });

    if (teams.length >= 5) {
      cacheSet('liga-argentina', teams);
      return res.json({ success: true, source: 'tycsports', data: teams });
    }
  } catch {}

  // Fallback: ESPN arg.1 API
  try {
    const { data } = await axios.get(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/standings',
      { headers: ESPN_HEADERS, timeout: 10_000 }
    );
    const standings = data?.standings ?? data?.children ?? data;
    cacheSet('liga-argentina', { source_type: 'espn', standings });
    return res.json({ success: true, source: 'espn', data: { source_type: 'espn', standings } });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// ─── Cache clear ───────────────────────────────────────────────────────────
statsRoutes.get('/cache-clear', (_req, res) => {
  _cache.clear();
  res.json({ success: true, cleared: true });
});
