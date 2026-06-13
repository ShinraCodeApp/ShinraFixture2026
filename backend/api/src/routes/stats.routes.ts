import { Router } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { StatsController } from '../controllers/stats.controller';

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

const ESPN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/html, */*',
};

// ─── WC2026 group standings ── ESPN JSON API ───────────────────────────────
statsRoutes.get('/wc-standings', async (_req, res) => {
  const cached = cacheGet('wc-standings');
  if (cached) return res.json({ success: true, source: 'cache', data: cached });
  try {
    const { data } = await axios.get(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/standings',
      { headers: ESPN_HEADERS, timeout: 10_000 }
    );
    cacheSet('wc-standings', data);
    return res.json({ success: true, source: 'espn', data });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// ─── WC2026 top scorers ── ESPN JSON API ──────────────────────────────────
statsRoutes.get('/wc-scorers', async (_req, res) => {
  const cached = cacheGet('wc-scorers');
  if (cached) return res.json({ success: true, source: 'cache', data: cached });
  try {
    const { data } = await axios.get(
      'https://site.api.espn.com/apis/v2/sports/soccer/leagues/fifa.world/statistics/leaders?limit=20',
      { headers: ESPN_HEADERS, timeout: 10_000 }
    );
    cacheSet('wc-scorers', data);
    return res.json({ success: true, source: 'espn', data });
  } catch {
    // fallback: try sports.core API
    try {
      const { data } = await axios.get(
        'https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/types/2/leaders?limit=20&lang=es',
        { headers: ESPN_HEADERS, timeout: 10_000 }
      );
      cacheSet('wc-scorers', data);
      return res.json({ success: true, source: 'espn-core', data });
    } catch (err2: any) {
      return res.status(502).json({ success: false, error: err2.message });
    }
  }
});

// ─── WC2026 team stats ── Marca HTML scraping ─────────────────────────────
statsRoutes.get('/wc-team-stats', async (_req, res) => {
  const cached = cacheGet('wc-team-stats');
  if (cached) return res.json({ success: true, source: 'cache', data: cached });
  try {
    const { data: html } = await axios.get(
      'https://www.marca.com/mx/futbol/mundial/estadisticas-selecciones.html',
      { headers: { ...ESPN_HEADERS, 'Accept': 'text/html' }, timeout: 12_000 }
    );
    const $ = cheerio.load(html);
    const teams: any[] = [];
    $('table tr').each((_i, row) => {
      const cells = $(row).find('td').map((_j, td) => $(td).text().trim()).get();
      const img = $(row).find('img').attr('src') ?? '';
      if (cells.length >= 3 && cells[0] && isNaN(Number(cells[0])) === false) {
        teams.push({ pos: cells[0], team: cells[1], img, pj: cells[2], g: cells[3], gc: cells[4] });
      }
    });
    if (teams.length === 0) {
      // ESPN fallback for team stats
      const { data } = await axios.get(
        'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/statistics',
        { headers: ESPN_HEADERS, timeout: 10_000 }
      );
      cacheSet('wc-team-stats', data);
      return res.json({ success: true, source: 'espn', data });
    }
    cacheSet('wc-team-stats', teams);
    return res.json({ success: true, source: 'marca', data: teams });
  } catch (err: any) {
    // ESPN fallback
    try {
      const { data } = await axios.get(
        'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/statistics',
        { headers: ESPN_HEADERS, timeout: 10_000 }
      );
      cacheSet('wc-team-stats', data);
      return res.json({ success: true, source: 'espn', data });
    } catch (e2: any) {
      return res.status(502).json({ success: false, error: e2.message });
    }
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
      { headers: { ...ESPN_HEADERS, 'Accept': 'text/html' }, timeout: 12_000 }
    );
    const $ = cheerio.load(html);
    const teams: any[] = [];
    $('table tbody tr').each((_i, row) => {
      const cells = $(row).find('td').map((_j, td) => $(td).text().trim()).get();
      const shieldSrc = $(row).find('img').first().attr('src') ?? $(row).find('img').first().attr('data-src') ?? '';
      if (cells.length >= 5) {
        teams.push({
          pos: cells[0] || String(_i + 1),
          team: cells[1] || cells[0],
          shield: shieldSrc,
          pts: cells[2], pj: cells[3], pg: cells[4],
          pe: cells[5], pp: cells[6], gf: cells[7], gc: cells[8], dif: cells[9],
        });
      }
    });
    if (teams.length > 0) {
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
    cacheSet('liga-argentina', data);
    return res.json({ success: true, source: 'espn', data });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// ─── Cache clear (admin use) ───────────────────────────────────────────────
statsRoutes.get('/cache-clear', (_req, res) => {
  _cache.clear();
  res.json({ success: true, cleared: true });
});
