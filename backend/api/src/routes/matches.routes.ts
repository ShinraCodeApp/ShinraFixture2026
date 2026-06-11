import { Router } from 'express';
import axios from 'axios';
import dayjs from 'dayjs';
import { MatchController } from '../controllers/matches.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { prisma } from '../config/database';
import { NotificationService } from '../services/notifications.service';

export const matchRoutes = Router();

function mapESPNStatus(state: string): 'SCHEDULED' | 'LIVE' | 'FINISHED' {
  if (state === 'in') return 'LIVE';
  if (state === 'post') return 'FINISHED';
  return 'SCHEDULED';
}

function mapApiFootballEvent(type: string, detail: string): string | null {
  if (type === 'Goal') {
    if (detail === 'Own Goal') return 'OWN_GOAL';
    if (detail === 'Penalty') return 'PENALTY_SCORED';
    return 'GOAL';
  }
  if (type === 'Card') {
    if (detail === 'Yellow Card') return 'YELLOW_CARD';
    if (detail === 'Red Card') return 'RED_CARD';
    if (detail === 'Second Yellow card') return 'SECOND_YELLOW';
  }
  if (type === 'subst') return 'SUBSTITUTION_IN';
  if (type === 'Var') return 'VAR_REVIEW';
  return null;
}

// api-football uses English names; our DB uses Spanish — map by FIFA code
const APIFB_NAME_TO_CODE: Record<string, string> = {
  'spain': 'ESP', 'germany': 'GER', 'france': 'FRA', 'netherlands': 'NED',
  'england': 'ENG', 'portugal': 'POR', 'argentina': 'ARG', 'brazil': 'BRA',
  'italy': 'ITA', 'belgium': 'BEL', 'croatia': 'CRO', 'denmark': 'DEN',
  'switzerland': 'SUI', 'norway': 'NOR', 'sweden': 'SWE', 'ukraine': 'UKR',
  'turkey': 'TUR', 'austria': 'AUT', 'poland': 'POL', 'hungary': 'HUN',
  'czech republic': 'CZE', 'serbia': 'SRB', 'greece': 'GRE', 'slovakia': 'SVK',
  'romania': 'ROU', 'scotland': 'SCO', 'wales': 'WAL', 'ireland': 'IRL',
  'northern ireland': 'NIR', 'iceland': 'ISL', 'russia': 'RUS', 'belarus': 'BLR',
  'armenia': 'ARM', 'moldova': 'MDA', 'azerbaijan': 'AZE', 'kazakhstan': 'KAZ',
  'san marino': 'SMR',
  'morocco': 'MAR', 'senegal': 'SEN', 'nigeria': 'NGA', 'egypt': 'EGY',
  'cameroon': 'CMR', "ivory coast": 'CIV', "côte d'ivoire": 'CIV', 'algeria': 'ALG',
  'tunisia': 'TUN', 'ghana': 'GHA', 'mali': 'MLI', 'angola': 'ANG',
  'central african republic': 'CAR', 'ethiopia': 'ETH', 'malawi': 'MWI',
  'mozambique': 'MOZ', 'tanzania': 'TAN', 'rwanda': 'RWA', 'burkina faso': 'BFA',
  'equatorial guinea': 'EQG', 'comoros': 'COM', 'dr congo': 'COD',
  'united states': 'USA', 'usa': 'USA', 'mexico': 'MEX', 'canada': 'CAN',
  'costa rica': 'CRC', 'panama': 'PAN', 'honduras': 'HON', 'el salvador': 'SLV',
  'jamaica': 'JAM', 'haiti': 'HTI', 'dominican republic': 'DOM',
  'trinidad and tobago': 'TRI', 'guatemala': 'GUA', 'nicaragua': 'NIC',
  'colombia': 'COL', 'ecuador': 'ECU', 'chile': 'CHI', 'peru': 'PER',
  'uruguay': 'URU', 'paraguay': 'PAR', 'venezuela': 'VEN', 'bolivia': 'BOL',
  'japan': 'JPN', 'south korea': 'KOR', 'australia': 'AUS', 'iran': 'IRN',
  'saudi arabia': 'KSA', 'qatar': 'QAT', 'china': 'CHN', 'indonesia': 'IDN',
  'philippines': 'PHI', 'thailand': 'THA', 'uzbekistan': 'UZB', 'oman': 'OMA',
  'kuwait': 'KUW', 'bahrain': 'BHR', 'syria': 'SYR', 'iraq': 'IRQ',
  'jordan': 'JOR', 'kyrgyzstan': 'KGZ', 'palestine': 'PLE', 'cambodia': 'KHM',
  'hong kong': 'HKG', 'myanmar': 'MYA', 'new zealand': 'NZL',
  'south africa': 'RSA', 'kenya': 'KEN', 'zimbabwe': 'ZIM',
};

async function findTeamByApiFbName(name: string) {
  const key = name.toLowerCase().trim();
  const code = APIFB_NAME_TO_CODE[key];
  if (code) return prisma.team.findFirst({ where: { code } });
  // fallback: first word contains (works for many Spanish names that share root)
  const word = name.split(' ')[0];
  return prisma.team.findFirst({ where: { name: { contains: word, mode: 'insensitive' } } });
}

async function syncWithApiFootball(apiKey: string, io: any): Promise<number> {
  const todayStr = dayjs().format('YYYY-MM-DD');
  const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
  let count = 0;

  for (const dateStr of [yesterdayStr, todayStr, tomorrowStr]) {
    let fixtures: any[] = [];
    try {
      const r = await axios.get(`https://v3.football.api-sports.io/fixtures?date=${dateStr}`, {
        headers: { 'x-apisports-key': apiKey },
        timeout: 10000,
      });
      fixtures = r.data.response ?? [];
    } catch { continue; }

    for (const fixture of fixtures) {
      const homeGoals = fixture.goals?.home;
      const awayGoals = fixture.goals?.away;

      const statusShort = fixture.fixture?.status?.short ?? 'NS';
      if (statusShort === 'NS' || statusShort === 'TBD') continue; // not started

      const matchStatus = ['1H','2H','HT','ET','BT','P','SUSP','INT'].includes(statusShort) ? 'LIVE'
        : ['FT','AET','PEN'].includes(statusShort) ? 'FINISHED' : 'SCHEDULED';
      const minute = fixture.fixture?.status?.elapsed ?? null;

      const homeName: string = fixture.teams?.home?.name ?? '';
      const awayName: string = fixture.teams?.away?.name ?? '';
      if (!homeName || !awayName) continue;

      const [homeTeam, awayTeam] = await Promise.all([
        findTeamByApiFbName(homeName),
        findTeamByApiFbName(awayName),
      ]);
      if (!homeTeam || !awayTeam) continue;

      // Match by teams within a ±2 day window (handles UTC offset mismatches)
      const windowStart = new Date(`${dateStr}T00:00:00Z`);
      windowStart.setDate(windowStart.getDate() - 1);
      const windowEnd = new Date(`${dateStr}T23:59:59Z`);
      windowEnd.setDate(windowEnd.getDate() + 1);

      const match = await prisma.match.findFirst({
        where: {
          homeTeamId: homeTeam.id, awayTeamId: awayTeam.id,
          matchDate: { gte: windowStart, lte: windowEnd },
        },
        orderBy: { matchDate: 'asc' },
      });
      if (!match) continue;

      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: matchStatus as any,
          ...(homeGoals != null && { homeScore: homeGoals }),
          ...(awayGoals != null && { awayScore: awayGoals }),
          ...(minute != null && { minute }),
        },
      });

      if (matchStatus === 'LIVE') {
        io?.to(`match:${match.id}`).emit('match:score', { homeScore: homeGoals, awayScore: awayGoals, minute });
        io?.to('global:live').emit('global:score-update', { matchId: match.id, homeScore: homeGoals, awayScore: awayGoals });
      }

      // Sync events from api-football
      for (const ev of (fixture.events ?? [])) {
        const evType = mapApiFootballEvent(ev.type ?? '', ev.detail ?? '');
        if (!evType) continue;
        const evMinute = ev.time?.elapsed ?? 0;
        const evTeamName: string = ev.team?.name ?? '';
        const evTeamId = evTeamName.toLowerCase().includes(homeWord.toLowerCase()) ? homeTeam.id : awayTeam.id;
        const evPlayer: string = ev.player?.name ?? '';
        const existing = await prisma.matchEvent.findFirst({
          where: { matchId: match.id, type: evType as any, minute: evMinute, teamId: evTeamId },
        });
        if (!existing) {
          const created = await prisma.matchEvent.create({
            data: { matchId: match.id, type: evType as any, minute: evMinute, teamId: evTeamId, description: evPlayer },
          });
          io?.to(`match:${match.id}`).emit('match:event', { ...created, playerName: evPlayer });
        }
      }
      count++;
    }
  }
  return count;
}

function mapESPNEventType(text: string): string | null {
  const t = (text ?? '').toLowerCase().trim();
  if (t === 'goal') return 'GOAL';
  if (t.includes('own goal') || t === 'own-goal') return 'OWN_GOAL';
  if (t === 'penalty - goal' || t === 'penalty scored') return 'PENALTY_SCORED';
  if (t.includes('penalty') && (t.includes('miss') || t.includes('saved') || t.includes('off target'))) return 'PENALTY_MISSED';
  if (t.includes('yellow card') || t === 'yellow') return 'YELLOW_CARD';
  if (t.includes('red card') || t === 'red') return 'RED_CARD';
  if (t.includes('substitution') || t === 'sub') return 'SUBSTITUTION_IN';
  if (t.includes('var')) return 'VAR_REVIEW';
  return null;
}

// Sync today + next 6 days of international matches from ESPN scoreboard
matchRoutes.post('/espn-sync', async (req, res) => {
  try {
    const today = dayjs().format('YYYYMMDD');

    // Build date range: today + 6 days ahead
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(dayjs().add(i, 'day').format('YYYYMMDD'));
    }

    const yesterday = dayjs().subtract(1, 'day').format('YYYYMMDD');
    const allDates = [yesterday, ...dates];

    const urls = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard?dates=${today}&limit=50`,
      // General soccer scoreboard for yesterday + today + next 6 days
      ...allDates.map(d => `https://site.api.espn.com/apis/site/v2/sports/soccer/scoreboard?dates=${d}&limit=100`),
      // International friendly specific endpoints
      ...allDates.slice(0, 3).map(d => `https://site.api.espn.com/apis/site/v2/sports/soccer/international.friendly/scoreboard?dates=${d}&limit=100`),
      // CONMEBOL and UEFA competitions
      ...allDates.slice(0, 2).map(d => `https://site.api.espn.com/apis/site/v2/sports/soccer/concacaf.friendly/scoreboard?dates=${d}&limit=50`),
      ...allDates.slice(0, 2).map(d => `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.friendly/scoreboard?dates=${d}&limit=50`),
    ];

    const events: any[] = [];
    for (const url of urls) {
      const isWcUrl = url.includes('FIFA.WORLD');
      try {
        const r = await axios.get(url, { timeout: 8000 });
        const evs: any[] = r.data.events ?? [];
        for (const ev of evs) {
          if (!events.find((e: any) => e.id === ev.id)) {
            // Tag the event with its source so we can determine WC vs FRIENDLY later
            events.push({ ...ev, _isWcSource: isWcUrl });
          }
        }
      } catch { /* skip unreachable endpoint */ }
    }

    const synced: any[] = [];
    const io = (global as any).io;

    for (const event of events) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const homeComp = comp.competitors?.find((c: any) => c.homeAway === 'home');
      const awayComp = comp.competitors?.find((c: any) => c.homeAway === 'away');
      if (!homeComp || !awayComp) continue;

      const homeCode = homeComp.team?.abbreviation?.toUpperCase();
      const awayCode = awayComp.team?.abbreviation?.toUpperCase();

      const findOrCreateTeam = async (code: string, comp: any) => {
        if (!code) return null;
        let team = await prisma.team.findFirst({ where: { code } });
        if (!team) {
          // Try by displayName from ESPN (handles cases like ESPN="Spain" vs DB="España")
          const displayName = comp.team?.displayName ?? '';
          if (displayName) {
            team = await prisma.team.findFirst({
              where: { name: { contains: displayName.split(' ')[0], mode: 'insensitive' } },
            });
          }
        }
        if (!team) {
          const isoCode = code.toLowerCase().slice(0, 2);
          team = await prisma.team.create({
            data: {
              code,
              name: comp.team?.displayName ?? code,
              shortName: comp.team?.abbreviation ?? code,
              flagUrl: comp.team?.logo ?? `https://flagcdn.com/w40/${isoCode}.png`,
              region: 'UEFA',
            },
          });
        }
        return team;
      };

      const [homeTeam, awayTeam] = await Promise.all([
        findOrCreateTeam(homeCode, homeComp),
        findOrCreateTeam(awayCode, awayComp),
      ]);
      if (!homeTeam || !awayTeam) continue;

      // Determine tournament type: use source URL tag OR league slug as fallback
      const leagueSlug = (event.leagues?.[0]?.slug ?? '').toUpperCase();
      const isWC = event._isWcSource || leagueSlug.includes('FIFA.WORLD') || leagueSlug.includes('FIFA.WC');
      const tournamentType = isWC ? 'WORLD_CUP' : 'FRIENDLY';
      const stage = isWC ? 'GROUP' : 'FRIENDLY';

      // For WC matches, find existing WC tournament; for friendlies, upsert FRIENDLY
      let tournament;
      if (isWC) {
        tournament = await prisma.tournament.findFirst({ where: { type: 'WORLD_CUP', year: 2026 } });
        if (!tournament) continue; // Skip if WC tournament doesn't exist
      } else {
        tournament = await prisma.tournament.upsert({
          where: { type_year: { type: 'FRIENDLY', year: 2026 } },
          create: {
            name: 'Amistosos Internacionales 2026',
            shortName: 'Amistosos',
            type: 'FRIENDLY',
            year: 2026,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            isFeatured: true,
            isActive: true,
          },
          update: {},
        });
      }

      const stateStr = comp.status?.type?.state ?? event.status?.type?.state ?? 'pre';
      const status = mapESPNStatus(stateStr);
      const minute = status === 'LIVE' ? Math.round(comp.status?.clock ?? event.status?.clock ?? 0) : null;
      const homeScore = status !== 'SCHEDULED' ? (parseInt(homeComp.score ?? '0') || 0) : null;
      const awayScore = status !== 'SCHEDULED' ? (parseInt(awayComp.score ?? '0') || 0) : null;

      // Scope externalId search to this tournament so WC matches don't collide with friendlies
      let match = await prisma.match.findFirst({ where: { externalId: event.id, tournamentId: tournament.id } });
      if (!match) {
        match = await prisma.match.findFirst({
          where: {
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            tournamentId: tournament.id,
          },
        });
      }

      if (!match) {
        match = await prisma.match.create({
          data: {
            externalId: event.id,
            tournamentId: tournament.id,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            matchDate: new Date(event.date),
            status: status as any,
            homeScore,
            awayScore,
            minute,
            stage: stage as any,
            venue: comp.venue?.fullName ?? null,
            city: comp.venue?.address?.city ?? null,
            country: comp.venue?.address?.country ?? null,
          },
        });
      } else {
        match = await prisma.match.update({
          where: { id: match.id },
          data: {
            status: status as any,
            homeScore,
            awayScore,
            minute,
            ...(match.externalId == null && { externalId: event.id }),
          },
        });
      }

      if (status === 'LIVE') {
        io?.to(`match:${match.id}`).emit('match:score', { homeScore, awayScore, minute });
        io?.to('global:live').emit('global:score-update', { matchId: match.id, homeScore, awayScore });
      }

      // Sync events from ESPN details
      const details: any[] = comp.details ?? [];
      for (const detail of details) {
        const eventType = mapESPNEventType(detail.type?.text ?? '');
        if (!eventType) continue;

        const detailMinute = Math.round(detail.clock?.value ?? 0);
        const detailTeamEspnId = detail.team?.id ? String(detail.team.id) : null;
        const detailTeamId = detailTeamEspnId
          ? (detailTeamEspnId === String(homeComp.team?.id) ? homeTeam.id : awayTeam.id)
          : undefined;
        const playerName = detail.athletesInvolved?.[0]?.displayName ?? '';

        const existing = await prisma.matchEvent.findFirst({
          where: { matchId: match.id, type: eventType as any, minute: detailMinute, teamId: detailTeamId ?? null },
        });

        if (!existing) {
          const ev = await prisma.matchEvent.create({
            data: { matchId: match.id, type: eventType as any, minute: detailMinute, teamId: detailTeamId, description: playerName },
          });
          io?.to(`match:${match.id}`).emit('match:event', { ...ev, playerName });
          if (eventType === 'GOAL' || eventType === 'OWN_GOAL' || eventType === 'PENALTY_SCORED') {
            NotificationService.notifyGoal(match.id, detailTeamId ?? '', detailMinute, playerName).catch(() => {});
          }
        }
      }

      // Sync stats
      const stats: any[] = comp.statistics ?? comp.stats ?? [];
      if (stats.length > 0) {
        const statObj: any = {};
        for (const s of stats) {
          const key = (s.name ?? s.abbreviation ?? '').toLowerCase().replace(/[^a-z]/g, '');
          const hv = parseFloat(s.homeValue ?? s.home ?? '0') || 0;
          const av = parseFloat(s.awayValue ?? s.away ?? '0') || 0;
          if (['possession', 'possessionpct'].includes(key)) { statObj.homePossession = hv; statObj.awayPossession = av; }
          else if (['totalshots', 'shots'].includes(key)) { statObj.homeShots = Math.round(hv); statObj.awayShots = Math.round(av); }
          else if (['shotsontarget', 'shotstarget'].includes(key)) { statObj.homeShotsOnTarget = Math.round(hv); statObj.awayShotsOnTarget = Math.round(av); }
          else if (key === 'fouls') { statObj.homeFouls = Math.round(hv); statObj.awayFouls = Math.round(av); }
          else if (['cornerkicks', 'corners'].includes(key)) { statObj.homeCorners = Math.round(hv); statObj.awayCorners = Math.round(av); }
          else if (key === 'yellowcards') { statObj.homeYellowCards = Math.round(hv); statObj.awayYellowCards = Math.round(av); }
          else if (key === 'redcards') { statObj.homeRedCards = Math.round(hv); statObj.awayRedCards = Math.round(av); }
        }
        if (Object.keys(statObj).length > 0) {
          await prisma.matchStats.upsert({
            where: { matchId: match.id },
            create: { matchId: match.id, ...statObj },
            update: statObj,
          });
          io?.to(`match:${match.id}`).emit('match:stats', statObj);
        }
      }

      synced.push({ matchId: match.id, externalId: event.id, status, home: homeTeam.code, away: awayTeam.code });
    }

    // api-football secondary sync (if API key is configured)
    let apifbCount = 0;
    const apifbKey = process.env.APIFOOTBALL_KEY;
    if (apifbKey) {
      try { apifbCount = await syncWithApiFootball(apifbKey, io); } catch { /* skip */ }
    }

    res.json({ success: true, data: { synced: synced.length, apifootball: apifbCount, matches: synced } });
  } catch (err: any) {
    console.error('ESPN sync error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET alias for espn-sync (LTE-friendly)
matchRoutes.get('/g-espn-sync', async (req, res) => {
  try {
    const r = await axios.post(`http://localhost:${process.env.PORT ?? 3000}/api/v1/matches/espn-sync`, {}, { timeout: 50000 });
    res.json(r.data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Recalculate WC2026 group standings from FINISHED matches
matchRoutes.get('/sync-standings', async (_req, res) => {
  try {
    const wc = await prisma.tournament.findFirst({
      where: { type: 'WORLD_CUP', year: 2026 },
      include: { groups: { include: { teams: { select: { id: true, teamId: true } } } } },
    });
    if (!wc) return res.status(404).json({ success: false, message: 'WC2026 not found' });

    const matches = await prisma.match.findMany({
      where: { tournamentId: wc.id, stage: 'GROUP', status: 'FINISHED' },
      select: { group: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
    });

    const stats: Record<string, { played: number; won: number; drawn: number; lost: number; gf: number; ga: number }> = {};
    const ensure = (id: string) => { if (!stats[id]) stats[id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 }; };

    for (const m of matches) {
      if (!m.homeTeamId || !m.awayTeamId || m.homeScore == null || m.awayScore == null) continue;
      ensure(m.homeTeamId); ensure(m.awayTeamId);
      const h = stats[m.homeTeamId]; const a = stats[m.awayTeamId];
      h.played++; h.gf += m.homeScore; h.ga += m.awayScore;
      a.played++; a.gf += m.awayScore; a.ga += m.homeScore;
      if (m.homeScore > m.awayScore) { h.won++; a.lost++; }
      else if (m.homeScore < m.awayScore) { a.won++; h.lost++; }
      else { h.drawn++; a.drawn++; }
    }

    let updated = 0;
    for (const group of wc.groups) {
      const sorted = group.teams
        .map((gt) => ({ gt, s: stats[gt.teamId] ?? { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 } }))
        .sort((a, b) => {
          const pa = a.s.won * 3 + a.s.drawn, pb = b.s.won * 3 + b.s.drawn;
          if (pb !== pa) return pb - pa;
          const da = a.s.gf - a.s.ga, db = b.s.gf - b.s.ga;
          if (db !== da) return db - da;
          return b.s.gf - a.s.gf;
        });
      for (let i = 0; i < sorted.length; i++) {
        const { gt, s } = sorted[i];
        const pts = s.won * 3 + s.drawn;
        await prisma.tournamentGroupTeam.update({
          where: { id: gt.id },
          data: { played: s.played, won: s.won, drawn: s.drawn, lost: s.lost, goalsFor: s.gf, goalsAgainst: s.ga, goalDifference: s.gf - s.ga, points: pts, position: i + 1 },
        });
        updated++;
      }
    }

    res.json({ success: true, data: { matchesProcessed: matches.length, teamsUpdated: updated } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

matchRoutes.get('/', optionalAuth, MatchController.list);
matchRoutes.get('/live', MatchController.getLive);
matchRoutes.get('/today', MatchController.getToday);
matchRoutes.get('/upcoming', MatchController.getUpcoming);
matchRoutes.get('/stage/:stage', MatchController.getByStage);
matchRoutes.get('/group/:group', MatchController.getByGroup);
matchRoutes.get('/:id', optionalAuth, MatchController.getById);
matchRoutes.get('/:id/events', MatchController.getEvents);
matchRoutes.get('/:id/stats', MatchController.getStats);
matchRoutes.get('/:id/lineups', MatchController.getLineups);
matchRoutes.get('/:id/h2h', MatchController.getHeadToHead);
matchRoutes.get('/:id/comments', optionalAuth, MatchController.getComments);
matchRoutes.post('/:id/comments', authenticate, MatchController.addComment);

// AI prediction endpoint — triggers Gemini analysis and caches result
matchRoutes.post('/:id/ai-predict', async (req, res) => {
  try {
    const { AIService } = await import('../services/ai.service');
    const prediction = await AIService.predictMatch(req.params.id);
    res.json({ success: true, data: prediction });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual result entry + socket emit
// Accepts both PATCH and POST (POST alias for Android Axios PATCH compatibility)
async function handleScoreUpdate(req: any, res: any) {
  const { id } = req.params;
  const { homeScore, awayScore, status, minute, events } = req.body;
  try {
    const match = await prisma.match.update({
      where: { id },
      data: {
        ...(homeScore !== undefined && { homeScore: Number(homeScore) }),
        ...(awayScore !== undefined && { awayScore: Number(awayScore) }),
        ...(status && { status }),
        ...(minute !== undefined && { minute: Number(minute) }),
      },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, code: true, flagUrl: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, code: true, flagUrl: true } },
      },
    });

    const io = (global as any).io;

    if (homeScore !== undefined || awayScore !== undefined) {
      io?.to(`match:${id}`).emit('match:score', {
        homeScore: match.homeScore, awayScore: match.awayScore, minute: match.minute,
      });
      io?.to('global:live').emit('global:score-update', {
        matchId: id, homeScore: match.homeScore, awayScore: match.awayScore,
      });
    }
    if (status) {
      io?.to(`match:${id}`).emit('match:status', { status });
    }

    if (events && Array.isArray(events) && events.length > 0) {
      for (const ev of events) {
        const created = await prisma.matchEvent.upsert({
          where: { id: ev.id ?? '' },
          update: { type: ev.type, minute: ev.minute, teamId: ev.teamId, description: ev.description },
          create: { matchId: id, type: ev.type, minute: ev.minute ?? 0, teamId: ev.teamId, description: ev.description ?? '' },
        });
        io?.to(`match:${id}`).emit('match:event', created);
      }
    }

    res.json({ success: true, data: match });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
}
matchRoutes.post('/:id/score', handleScoreUpdate);
matchRoutes.patch('/:id/score', handleScoreUpdate);
// GET alias: score via query params (?homeScore=2&awayScore=0&status=FINISHED)
// Needed for Android devices where POST is blocked by carrier/proxy
matchRoutes.get('/:id/score-update', async (req: any, res: any) => {
  req.body = req.query; // reuse the same handler logic
  return handleScoreUpdate(req, res);
});

// Live event — single event with socket emit (for real-time radar)
matchRoutes.post('/:id/live-event', async (req, res) => {
  const { id } = req.params;
  const { type, minute, teamId, description, playerName } = req.body;
  if (!type || minute === undefined) return res.status(400).json({ success: false, message: 'type y minute requeridos' });

  const event = await prisma.matchEvent.create({
    data: { matchId: id, type, minute: Number(minute), teamId, description: description ?? playerName ?? '' },
  });

  const io = (global as any).io;
  io?.to(`match:${id}`).emit('match:event', { ...event, playerName });
  io?.to('global:live').emit('global:match-event', { matchId: id, type, minute: Number(minute), teamId });

  res.json({ success: true, data: event });
});

// Live stats update with socket emit
matchRoutes.put('/:id/live-stats', async (req, res) => {
  const { id } = req.params;
  const stats = req.body;

  const updated = await prisma.matchStats.upsert({
    where: { matchId: id },
    create: { matchId: id, ...stats },
    update: stats,
  });

  const io = (global as any).io;
  io?.to(`match:${id}`).emit('match:stats', updated);

  res.json({ success: true, data: updated });
});
