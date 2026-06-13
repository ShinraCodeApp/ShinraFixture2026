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

  // Compute standings from our DB (all 72 group matches with scores)
  try {
    const matches = await prisma.match.findMany({
      where: { stage: 'GROUP', status: { in: ['FINISHED'] } },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, code: true, shieldUrl: true, flagUrl: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, code: true, shieldUrl: true, flagUrl: true } },
      },
    });

    const groupMap: Record<string, Record<string, any>> = {};

    for (const m of matches) {
      const group = m.group ?? 'X';
      if (!groupMap[group]) groupMap[group] = {};

      const hId = m.homeTeamId;
      const aId = m.awayTeamId;
      const hGoals = m.homeScore ?? 0;
      const aGoals = m.awayScore ?? 0;

      for (const [teamId, team, gf, ga, isHome] of [
        [hId, m.homeTeam, hGoals, aGoals, true],
        [aId, m.awayTeam, aGoals, hGoals, false],
      ] as [string, any, number, number, boolean][]) {
        if (!groupMap[group][teamId]) {
          groupMap[group][teamId] = {
            team: { id: team.id, name: team.name, shortName: team.shortName, code: team.code, logo: team.shieldUrl ?? team.flagUrl },
            pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0,
          };
        }
        const row = groupMap[group][teamId];
        row.pj++;
        row.gf += gf;
        row.gc += ga;
        if (gf > ga) { row.pg++; row.pts += 3; }
        else if (gf === ga) { row.pe++; row.pts += 1; }
        else { row.pp++; }
      }
    }

    // Sort each group by pts, then GD, then GF
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

    // If no finished matches yet, return scheduled teams per group so UI shows the bracket
    if (standings.length === 0) {
      const allGroupMatches = await prisma.match.findMany({
        where: { stage: 'GROUP' },
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, code: true, shieldUrl: true, flagUrl: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, code: true, shieldUrl: true, flagUrl: true } },
        },
        orderBy: { matchDate: 'asc' },
      });
      const emptyMap: Record<string, Record<string, any>> = {};
      for (const m of allGroupMatches) {
        const g = m.group ?? 'X';
        if (!emptyMap[g]) emptyMap[g] = {};
        for (const [tId, t] of [[m.homeTeamId, m.homeTeam], [m.awayTeamId, m.awayTeam]] as [string, any][]) {
          if (!emptyMap[g][tId]) {
            emptyMap[g][tId] = {
              team: { id: t.id, name: t.name, shortName: t.shortName, code: t.code, logo: t.shieldUrl ?? t.flagUrl },
              pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0,
            };
          }
        }
      }
      const emptyStandings = Object.entries(emptyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([g, teams]) => ({
          group: g,
          entries: Object.values(teams).map((e: any, i) => ({ ...e, pos: i + 1, dif: 0 })),
        }));
      cacheSet('wc-standings', emptyStandings, 2 * 60_000);
      return res.json({ success: true, source: 'db-scheduled', data: emptyStandings });
    }

    cacheSet('wc-standings', standings, 3 * 60_000);
    return res.json({ success: true, source: 'db', data: standings });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── WC2026 top scorers ── ESPN scoreboard API ────────────────────────────
statsRoutes.get('/wc-scorers', async (_req, res) => {
  const cached = cacheGet('wc-scorers');
  if (cached) return res.json({ success: true, source: 'cache', data: cached });

  // Try ESPN WC scorers via different endpoints
  const urls = [
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/statistics?lang=es',
    'https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/leaders?limit=20&lang=es',
    'https://site.api.espn.com/apis/v2/sports/soccer/leagues/fifa.world/statistics?limit=20',
  ];

  for (const url of urls) {
    try {
      const { data } = await axios.get(url, { headers: ESPN_HEADERS, timeout: 8_000 });
      if (data && (data.categories?.length || data.leaders?.length || data.items?.length)) {
        cacheSet('wc-scorers', data);
        return res.json({ success: true, source: 'espn', data });
      }
    } catch {}
  }

  // DB fallback: return event-based goal tally from our DB
  try {
    const goals = await prisma.matchEvent.findMany({
      where: { type: 'GOAL', match: { stage: 'GROUP' } },
      include: {
        match: { include: { homeTeam: { select: { name: true, code: true, flagUrl: true } }, awayTeam: { select: { name: true, code: true, flagUrl: true } } } },
      },
    });

    const playerMap: Record<string, any> = {};
    for (const g of goals) {
      const key = g.description ?? `unknown-${g.teamId}`;
      if (!playerMap[key]) {
        const isHome = g.teamId === g.match.homeTeamId;
        playerMap[key] = {
          name: key,
          goals: 0,
          team: isHome ? g.match.homeTeam : g.match.awayTeam,
        };
      }
      playerMap[key].goals++;
    }

    const scorers = Object.values(playerMap)
      .sort((a: any, b: any) => b.goals - a.goals)
      .slice(0, 20);

    cacheSet('wc-scorers', { categories: [{ displayName: 'Goleadores', leaders: scorers }] }, 2 * 60_000);
    return res.json({ success: true, source: 'db', data: { categories: [{ displayName: 'Goleadores', leaders: scorers }] } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
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

      teams.push({
        pos: i + 1,
        team: cells[teamIdx],
        shield: realShield,
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
