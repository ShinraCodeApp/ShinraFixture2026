import { PrismaClient, Region, TournamentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Maps FIFA 3-letter code → ISO 2-letter code for flagcdn.com
const FLAG_ISO: Record<string, string> = {
  // WC 2026
  USA: 'us', MEX: 'mx', PAN: 'pa', BHR: 'bh',
  BRA: 'br', JPN: 'jp', RSA: 'za', CRC: 'cr',
  ARG: 'ar', CHI: 'cl', MAR: 'ma', IRQ: 'iq',
  FRA: 'fr', DEN: 'dk', CIV: 'ci', VEN: 've',
  ESP: 'es', GER: 'de', AUS: 'au', PER: 'pe',
  ENG: 'gb-eng', POR: 'pt', SEN: 'sn', NZL: 'nz',
  NED: 'nl', BEL: 'be', COL: 'co', KSA: 'sa',
  ITA: 'it', URU: 'uy', NGA: 'ng', UZB: 'uz',
  CRO: 'hr', SWE: 'se', ECU: 'ec', ALG: 'dz',
  SRB: 'rs', SUI: 'ch', CAN: 'ca', CMR: 'cm',
  TUR: 'tr', AUT: 'at', KOR: 'kr', PAR: 'py',
  POL: 'pl', GRE: 'gr', HON: 'hn', GHA: 'gh', POR2: 'pt',
  JOR: 'jo', KWT: 'kw', OMA: 'om',
  // WC 2026 nuevos
  QAT: 'qa', HTI: 'ht', SCO: 'gb-sct', CUW: 'cw', NOR: 'no',
  WPD: 'un', WPA: 'un', WPC: 'un', WPB: 'un', WP1: 'un', WP2: 'un',
  // Copa América / Euro extras
  JAM: 'jm', BOL: 'bo', HUN: 'hu', ALB: 'al', SVN: 'si', SVK: 'sk', ROU: 'ro',
  UKR: 'ua', GEO: 'ge', CZE: 'cz', BIH: 'ba',
  // AFCON extras
  EGY: 'eg', TUN: 'tn', COD: 'cd', CPV: 'cv',
  GNB: 'gw', GUI: 'gn', MLI: 'ml', GAM: 'gm',
  ANG: 'ao', MOZ: 'mz', NAM: 'na', ZAM: 'zm',
  EQG: 'gq', TAN: 'tz',
  // Asian Cup extras
  IRN: 'ir', UAE: 'ae',
  CHN: 'cn', IND: 'in', VIE: 'vn', TAJ: 'tj',
  PAL: 'ps', SYR: 'sy', THA: 'th',
};

function flagUrl(code: string): string {
  const iso = FLAG_ISO[code];
  return iso ? `https://flagcdn.com/w80/${iso}.png` : '';
}

// ── World Cup 2026 Teams (48 teams, 12 groups of 4) ────
// Format: [name, shortName, code, region, fifaRanking, group]
// WC 2026 — Sorteo oficial FIFA confirmado por imagen
// Format: [name(ES), shortName(EN), code, region, fifaRanking, group]
const TEAMS_CLEAN: Array<[string, string, string, Region, number, string]> = [
  // Group A — México (sede)
  ['México', 'Mexico', 'MEX', Region.CONCACAF, 15, 'A'],
  ['Sudáfrica', 'South Africa', 'RSA', Region.CAF, 67, 'A'],
  ['Corea del Sur', 'Korea Republic', 'KOR', Region.AFC, 22, 'A'],
  ['Chequia', 'Czech Republic', 'CZE', Region.UEFA, 40, 'A'],

  // Group B — Canadá (sede)
  ['Canadá', 'Canada', 'CAN', Region.CONCACAF, 47, 'B'],
  ['Bosnia', 'Bosnia & Herz.', 'BIH', Region.UEFA, 62, 'B'],
  ['Qatar', 'Qatar', 'QAT', Region.AFC, 37, 'B'],
  ['Suiza', 'Switzerland', 'SUI', Region.UEFA, 19, 'B'],

  // Group C — Brasil
  ['Brasil', 'Brazil', 'BRA', Region.CONMEBOL, 5, 'C'],
  ['Marruecos', 'Morocco', 'MAR', Region.CAF, 14, 'C'],
  ['Haití', 'Haiti', 'HTI', Region.CONCACAF, 85, 'C'],
  ['Escocia', 'Scotland', 'SCO', Region.UEFA, 39, 'C'],

  // Group D — USA (sede)
  ['Estados Unidos', 'United States', 'USA', Region.CONCACAF, 13, 'D'],
  ['Paraguay', 'Paraguay', 'PAR', Region.CONMEBOL, 56, 'D'],
  ['Australia', 'Australia', 'AUS', Region.AFC, 23, 'D'],
  ['Turquía', 'Turkey', 'TUR', Region.UEFA, 28, 'D'],

  // Group E — Alemania
  ['Alemania', 'Germany', 'GER', Region.UEFA, 16, 'E'],
  ['Curaçao', 'Curacao', 'CUW', Region.CONCACAF, 110, 'E'],
  ['Costa de Marfil', 'Ivory Coast', 'CIV', Region.CAF, 30, 'E'],
  ['Ecuador', 'Ecuador', 'ECU', Region.CONMEBOL, 44, 'E'],

  // Group F — Países Bajos
  ['Países Bajos', 'Netherlands', 'NED', Region.UEFA, 7, 'F'],
  ['Japón', 'Japan', 'JPN', Region.AFC, 17, 'F'],
  ['Suecia', 'Sweden', 'SWE', Region.UEFA, 24, 'F'],
  ['Túnez', 'Tunisia', 'TUN', Region.CAF, 35, 'F'],

  // Group G — Bélgica
  ['Bélgica', 'Belgium', 'BEL', Region.UEFA, 3, 'G'],
  ['Egipto', 'Egypt', 'EGY', Region.CAF, 34, 'G'],
  ['Irán', 'Iran', 'IRN', Region.AFC, 21, 'G'],
  ['Nueva Zelanda', 'New Zealand', 'NZL', Region.OFC, 100, 'G'],

  // Group H — España
  ['España', 'Spain', 'ESP', Region.UEFA, 8, 'H'],
  ['Cabo Verde', 'Cabo Verde', 'CPV', Region.CAF, 80, 'H'],
  ['Arabia Saudita', 'Saudi Arabia', 'KSA', Region.AFC, 58, 'H'],
  ['Uruguay', 'Uruguay', 'URU', Region.CONMEBOL, 18, 'H'],

  // Group I — Francia
  ['Francia', 'France', 'FRA', Region.UEFA, 2, 'I'],
  ['Senegal', 'Senegal', 'SEN', Region.CAF, 20, 'I'],
  ['Irak', 'Iraq', 'IRQ', Region.AFC, 68, 'I'],
  ['Noruega', 'Norway', 'NOR', Region.UEFA, 32, 'I'],

  // Group J — Argentina
  ['Argentina', 'Argentina', 'ARG', Region.CONMEBOL, 1, 'J'],
  ['Argelia', 'Algeria', 'ALG', Region.CAF, 37, 'J'],
  ['Austria', 'Austria', 'AUT', Region.UEFA, 25, 'J'],
  ['Jordania', 'Jordan', 'JOR', Region.AFC, 87, 'J'],

  // Group K — Portugal
  ['Portugal', 'Portugal', 'POR', Region.UEFA, 6, 'K'],
  ['RD Congo', 'DR Congo', 'COD', Region.CAF, 52, 'K'],
  ['Uzbekistán', 'Uzbekistan', 'UZB', Region.AFC, 63, 'K'],
  ['Colombia', 'Colombia', 'COL', Region.CONMEBOL, 12, 'K'],

  // Group L — Inglaterra
  ['Inglaterra', 'England', 'ENG', Region.UEFA, 4, 'L'],
  ['Croacia', 'Croatia', 'CRO', Region.UEFA, 10, 'L'],
  ['Ghana', 'Ghana', 'GHA', Region.CAF, 60, 'L'],
  ['Panamá', 'Panama', 'PAN', Region.CONCACAF, 51, 'L'],
];

async function seedTournament() {
  console.log('🏆 Creating FIFA World Cup 2026...');
  const tournament = await prisma.tournament.upsert({
    where: { type_year: { type: TournamentType.WORLD_CUP, year: 2026 } },
    update: {},
    create: {
      name: 'FIFA World Cup 2026™',
      shortName: 'WC 2026',
      year: 2026,
      type: TournamentType.WORLD_CUP,
      startDate: new Date('2026-06-11'),
      endDate: new Date('2026-07-19'),
      hostCountries: ['United States', 'Canada', 'Mexico'],
      logo: '/assets/wc2026-logo.png',
      isActive: true,
      isFeatured: true,
    },
  });
  console.log(`✅ Tournament: ${tournament.name}`);
  return tournament;
}

async function seedTeams() {
  console.log('⚽ Creating 48 teams...');
  const teams = [];

  for (const [name, shortName, code, region, fifaRanking, group] of TEAMS_CLEAN) {
    const team = await prisma.team.upsert({
      where: { code },
      update: {
        name, shortName, fifaRanking, group,
        flagUrl: flagUrl(code),
        shieldUrl: `https://flagcdn.com/w80/${FLAG_ISO[code] ?? code.toLowerCase()}.png`,
      },
      create: {
        name, shortName, code, region, fifaRanking, group,
        flagUrl: flagUrl(code),
        shieldUrl: `https://flagcdn.com/w80/${FLAG_ISO[code] ?? code.toLowerCase()}.png`,
      },
    });
    teams.push(team);
  }

  console.log(`✅ Created ${teams.length} teams`);
  return teams;
}

async function seedGroups(tournamentId: string, teams: any[]) {
  console.log('📊 Creating tournament groups...');
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  // Limpiar todas las relaciones de grupo existentes para este torneo
  const existingGroups = await prisma.tournamentGroup.findMany({
    where: { tournamentId },
    select: { id: true },
  });
  if (existingGroups.length > 0) {
    await prisma.tournamentGroupTeam.deleteMany({
      where: { groupId: { in: existingGroups.map((g) => g.id) } },
    });
  }

  for (const letter of groupLetters) {
    const group = await prisma.tournamentGroup.upsert({
      where: { tournamentId_letter: { tournamentId, letter } },
      update: {},
      create: { tournamentId, name: `Grupo ${letter}`, letter },
    });

    // Solo los 4 equipos WC de este grupo, en orden del sorteo
    const groupTeams = teams.filter((t) => t.group === letter);
    for (let i = 0; i < groupTeams.length; i++) {
      const team = groupTeams[i];
      await prisma.tournamentGroupTeam.create({
        data: {
          groupId: group.id,
          teamId: team.id,
          position: i + 1,
          played: 0, won: 0, drawn: 0, lost: 0,
          goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        },
      });
    }
  }

  console.log('✅ Groups created');
}

// ── 16 Official WC 2026 Venues (index-referenced) ─────
const VENUES = [
  { venue: 'SoFi Stadium',            city: 'Los Angeles',     country: 'United States' }, // 0
  { venue: 'MetLife Stadium',          city: 'East Rutherford', country: 'United States' }, // 1
  { venue: 'AT&T Stadium',            city: 'Dallas',          country: 'United States' }, // 2
  { venue: 'Arrowhead Stadium',        city: 'Kansas City',     country: 'United States' }, // 3
  { venue: "Levi's Stadium",          city: 'San Francisco',   country: 'United States' }, // 4
  { venue: 'Hard Rock Stadium',        city: 'Miami',           country: 'United States' }, // 5
  { venue: 'NRG Stadium',             city: 'Houston',         country: 'United States' }, // 6
  { venue: 'Lincoln Financial Field', city: 'Philadelphia',    country: 'United States' }, // 7
  { venue: 'Gillette Stadium',        city: 'Boston',          country: 'United States' }, // 8
  { venue: 'Estadio Azteca',          city: 'Ciudad de México',country: 'Mexico'         }, // 9
  { venue: 'Estadio Akron',           city: 'Guadalajara',     country: 'Mexico'         }, // 10
  { venue: 'BMO Field',               city: 'Toronto',         country: 'Canada'         }, // 11
  { venue: 'BC Place',                city: 'Vancouver',       country: 'Canada'         }, // 12
  { venue: 'Mercedes-Benz Stadium',   city: 'Atlanta',         country: 'United States' }, // 13
  { venue: 'Lumen Field',             city: 'Seattle',         country: 'United States' }, // 14
  { venue: 'Estadio BBVA',            city: 'Monterrey',       country: 'Mexico'         }, // 15
];

async function seedGroupMatches(tournamentId: string, teams: any[]) {
  console.log('📅 Creating group stage matches (official UTC schedule)...');
  await prisma.match.deleteMany({ where: { tournamentId } });

  const teamMap = new Map(teams.map((t) => [t.code, t]));

  // [homeCode, awayCode, dateUTC, venueIdx, group, matchDay]
  const GROUP_MATCHES: [string, string, string, number, string, number][] = [
    // ── Group A (MEX, RSA, KOR, CZE) ──
    ['MEX', 'RSA', '2026-06-11T19:00:00Z',  9, 'A', 1],
    ['KOR', 'CZE', '2026-06-12T02:00:00Z', 10, 'A', 1],
    ['CZE', 'RSA', '2026-06-18T16:00:00Z', 13, 'A', 2],
    ['MEX', 'KOR', '2026-06-19T01:00:00Z', 10, 'A', 2],
    ['RSA', 'KOR', '2026-06-25T01:00:00Z', 15, 'A', 3],
    ['CZE', 'MEX', '2026-06-25T01:00:00Z',  9, 'A', 3],
    // ── Group B (CAN, BIH, QAT, SUI) ──
    ['CAN', 'BIH', '2026-06-12T19:00:00Z', 11, 'B', 1],
    ['QAT', 'SUI', '2026-06-13T19:00:00Z',  4, 'B', 1],
    ['SUI', 'BIH', '2026-06-18T19:00:00Z',  0, 'B', 2],
    ['CAN', 'QAT', '2026-06-18T22:00:00Z', 12, 'B', 2],
    ['SUI', 'CAN', '2026-06-24T19:00:00Z', 12, 'B', 3],
    ['BIH', 'QAT', '2026-06-24T19:00:00Z', 14, 'B', 3],
    // ── Group C (BRA, MAR, HTI, SCO) ──
    ['BRA', 'MAR', '2026-06-13T22:00:00Z',  1, 'C', 1],
    ['HTI', 'SCO', '2026-06-14T01:00:00Z',  8, 'C', 1],
    ['SCO', 'MAR', '2026-06-19T22:00:00Z',  6, 'C', 2],
    ['BRA', 'HTI', '2026-06-20T01:00:00Z',  0, 'C', 2],
    ['MAR', 'HTI', '2026-06-26T01:00:00Z',  2, 'C', 3],
    ['SCO', 'BRA', '2026-06-26T01:00:00Z',  3, 'C', 3],
    // ── Group D (USA, PAR, AUS, TUR) ──
    ['USA', 'PAR', '2026-06-13T01:00:00Z',  0, 'D', 1],
    ['AUS', 'TUR', '2026-06-14T04:00:00Z', 12, 'D', 1],
    ['TUR', 'PAR', '2026-06-19T19:00:00Z',  3, 'D', 2],
    ['USA', 'AUS', '2026-06-19T22:00:00Z',  1, 'D', 2],
    ['PAR', 'AUS', '2026-06-25T19:00:00Z',  5, 'D', 3],
    ['TUR', 'USA', '2026-06-25T19:00:00Z',  6, 'D', 3],
    // ── Group E (GER, CUW, CIV, ECU) ──
    ['GER', 'CUW', '2026-06-14T17:00:00Z',  6, 'E', 1],
    ['CIV', 'ECU', '2026-06-14T23:00:00Z',  7, 'E', 1],
    ['GER', 'ECU', '2026-06-20T19:00:00Z',  2, 'E', 2],
    ['CIV', 'CUW', '2026-06-21T01:00:00Z',  8, 'E', 2],
    ['CUW', 'ECU', '2026-06-26T19:00:00Z',  7, 'E', 3],
    ['CIV', 'GER', '2026-06-26T19:00:00Z', 13, 'E', 3],
    // ── Group F (NED, JPN, SWE, TUN) ──
    ['NED', 'JPN', '2026-06-14T20:00:00Z',  2, 'F', 1],
    ['SWE', 'TUN', '2026-06-15T02:00:00Z',  8, 'F', 1],
    ['JPN', 'TUN', '2026-06-21T19:00:00Z',  5, 'F', 2],
    ['NED', 'SWE', '2026-06-21T22:00:00Z',  1, 'F', 2],
    ['TUN', 'NED', '2026-06-26T23:00:00Z',  3, 'F', 3],
    ['JPN', 'SWE', '2026-06-26T23:00:00Z',  4, 'F', 3],
    // ── Group G (BEL, EGY, IRN, NZL) ──
    ['BEL', 'EGY', '2026-06-17T22:00:00Z', 14, 'G', 1],
    ['IRN', 'NZL', '2026-06-18T01:00:00Z',  4, 'G', 1],
    ['EGY', 'NZL', '2026-06-22T19:00:00Z',  8, 'G', 2],
    ['BEL', 'IRN', '2026-06-22T22:00:00Z', 14, 'G', 2],
    ['EGY', 'IRN', '2026-06-26T22:00:00Z', 11, 'G', 3],
    ['NZL', 'BEL', '2026-06-26T22:00:00Z', 12, 'G', 3],
    // ── Group H (ESP, CPV, KSA, URU) ──
    ['ESP', 'CPV', '2026-06-18T22:00:00Z',  5, 'H', 1],
    ['KSA', 'URU', '2026-06-19T01:00:00Z',  3, 'H', 1],
    ['URU', 'CPV', '2026-06-22T19:00:00Z',  6, 'H', 2],
    ['ESP', 'KSA', '2026-06-22T22:00:00Z',  2, 'H', 2],
    ['CPV', 'KSA', '2026-06-26T22:00:00Z',  9, 'H', 3],
    ['URU', 'ESP', '2026-06-26T22:00:00Z', 10, 'H', 3],
    // ── Group I (FRA, SEN, IRQ, NOR) ──
    ['FRA', 'SEN', '2026-06-16T19:00:00Z',  7, 'I', 1],
    ['IRQ', 'NOR', '2026-06-16T22:00:00Z', 13, 'I', 1],
    ['SEN', 'NOR', '2026-06-19T19:00:00Z', 14, 'I', 2],
    ['FRA', 'IRQ', '2026-06-20T22:00:00Z',  1, 'I', 2],
    ['SEN', 'IRQ', '2026-06-25T22:00:00Z',  8, 'I', 3],
    ['NOR', 'FRA', '2026-06-25T22:00:00Z',  7, 'I', 3],
    // ── Group J (ARG, ALG, AUT, JOR) ──
    ['ARG', 'ALG', '2026-06-15T19:00:00Z',  2, 'J', 1],
    ['AUT', 'JOR', '2026-06-16T16:00:00Z', 13, 'J', 1],
    ['ALG', 'JOR', '2026-06-21T19:00:00Z',  6, 'J', 2],
    ['ARG', 'AUT', '2026-06-21T22:00:00Z',  0, 'J', 2],
    ['ALG', 'AUT', '2026-06-25T23:00:00Z',  3, 'J', 3],
    ['JOR', 'ARG', '2026-06-25T23:00:00Z', 15, 'J', 3],
    // ── Group K (POR, COD, UZB, COL) ──
    ['POR', 'COD', '2026-06-17T16:00:00Z', 13, 'K', 1],
    ['UZB', 'COL', '2026-06-17T19:00:00Z',  6, 'K', 1],
    ['COD', 'COL', '2026-06-22T22:00:00Z',  0, 'K', 2],
    ['POR', 'UZB', '2026-06-23T01:00:00Z',  4, 'K', 2],
    ['COD', 'UZB', '2026-06-26T22:00:00Z',  5, 'K', 3],
    ['COL', 'POR', '2026-06-26T22:00:00Z',  6, 'K', 3],
    // ── Group L (ENG, CRO, GHA, PAN) ──
    ['ENG', 'CRO', '2026-06-16T19:00:00Z',  1, 'L', 1],
    ['GHA', 'PAN', '2026-06-17T01:00:00Z', 11, 'L', 1],
    ['CRO', 'PAN', '2026-06-22T19:00:00Z', 12, 'L', 2],
    ['ENG', 'GHA', '2026-06-23T01:00:00Z', 14, 'L', 2],
    ['CRO', 'GHA', '2026-06-26T23:00:00Z', 11, 'L', 3],
    ['PAN', 'ENG', '2026-06-26T23:00:00Z', 15, 'L', 3],
  ];

  for (const [homeCode, awayCode, dateISO, venueIdx, group, round] of GROUP_MATCHES) {
    const homeTeam = teamMap.get(homeCode);
    const awayTeam = teamMap.get(awayCode);
    if (!homeTeam || !awayTeam) {
      console.warn(`⚠ Team not found: ${homeCode} or ${awayCode}`);
      continue;
    }
    await prisma.match.create({
      data: {
        tournamentId,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        stage: 'GROUP',
        group,
        round,
        matchDate: new Date(dateISO),
        ...VENUES[venueIdx],
        status: 'SCHEDULED',
      },
    });
  }

  console.log(`✅ Created ${GROUP_MATCHES.length} group stage matches`);
}

async function seedKnockoutMatches(tournamentId: string) {
  console.log('🏆 Creating knockout matches (R32 → Final)...');

  type KO = { homeLabel: string; awayLabel: string; date: string; venueIdx: number; stage: string; round: number };

  const KNOCKOUT: KO[] = [
    // ── Round of 32 (June 29 – July 6) ──────────────────
    { homeLabel: '1A',  awayLabel: '2B',  date: '2026-06-29T19:00:00Z', venueIdx:  9, stage: 'ROUND_OF_32', round:  73 },
    { homeLabel: '1C',  awayLabel: '2D',  date: '2026-06-29T22:00:00Z', venueIdx:  1, stage: 'ROUND_OF_32', round:  74 },
    { homeLabel: '1B',  awayLabel: '2A',  date: '2026-06-30T19:00:00Z', venueIdx: 11, stage: 'ROUND_OF_32', round:  75 },
    { homeLabel: '1D',  awayLabel: '2C',  date: '2026-06-30T22:00:00Z', venueIdx:  0, stage: 'ROUND_OF_32', round:  76 },
    { homeLabel: '1E',  awayLabel: '2F',  date: '2026-07-01T19:00:00Z', venueIdx:  2, stage: 'ROUND_OF_32', round:  77 },
    { homeLabel: '1G',  awayLabel: '2H',  date: '2026-07-01T22:00:00Z', venueIdx:  6, stage: 'ROUND_OF_32', round:  78 },
    { homeLabel: '1F',  awayLabel: '2E',  date: '2026-07-02T19:00:00Z', venueIdx:  4, stage: 'ROUND_OF_32', round:  79 },
    { homeLabel: '1H',  awayLabel: '2G',  date: '2026-07-02T22:00:00Z', venueIdx:  5, stage: 'ROUND_OF_32', round:  80 },
    { homeLabel: '1I',  awayLabel: '2J',  date: '2026-07-03T19:00:00Z', venueIdx:  7, stage: 'ROUND_OF_32', round:  81 },
    { homeLabel: '1K',  awayLabel: '2L',  date: '2026-07-03T22:00:00Z', venueIdx: 13, stage: 'ROUND_OF_32', round:  82 },
    { homeLabel: '1J',  awayLabel: '2I',  date: '2026-07-04T19:00:00Z', venueIdx: 15, stage: 'ROUND_OF_32', round:  83 },
    { homeLabel: '1L',  awayLabel: '2K',  date: '2026-07-04T22:00:00Z', venueIdx:  8, stage: 'ROUND_OF_32', round:  84 },
    { homeLabel: '3°1', awayLabel: '3°2', date: '2026-07-05T19:00:00Z', venueIdx:  3, stage: 'ROUND_OF_32', round:  85 },
    { homeLabel: '3°3', awayLabel: '3°4', date: '2026-07-05T22:00:00Z', venueIdx: 12, stage: 'ROUND_OF_32', round:  86 },
    { homeLabel: '3°5', awayLabel: '3°6', date: '2026-07-06T19:00:00Z', venueIdx: 14, stage: 'ROUND_OF_32', round:  87 },
    { homeLabel: '3°7', awayLabel: '3°8', date: '2026-07-06T22:00:00Z', venueIdx: 10, stage: 'ROUND_OF_32', round:  88 },
    // ── Round of 16 (July 7–10) ──────────────────────────
    { homeLabel: 'W73', awayLabel: 'W74', date: '2026-07-07T19:00:00Z', venueIdx:  9, stage: 'ROUND_OF_16', round:  89 },
    { homeLabel: 'W75', awayLabel: 'W76', date: '2026-07-07T22:00:00Z', venueIdx:  1, stage: 'ROUND_OF_16', round:  90 },
    { homeLabel: 'W77', awayLabel: 'W78', date: '2026-07-08T19:00:00Z', venueIdx:  0, stage: 'ROUND_OF_16', round:  91 },
    { homeLabel: 'W79', awayLabel: 'W80', date: '2026-07-08T22:00:00Z', venueIdx:  2, stage: 'ROUND_OF_16', round:  92 },
    { homeLabel: 'W81', awayLabel: 'W82', date: '2026-07-09T19:00:00Z', venueIdx:  6, stage: 'ROUND_OF_16', round:  93 },
    { homeLabel: 'W83', awayLabel: 'W84', date: '2026-07-09T22:00:00Z', venueIdx:  4, stage: 'ROUND_OF_16', round:  94 },
    { homeLabel: 'W85', awayLabel: 'W86', date: '2026-07-10T19:00:00Z', venueIdx:  5, stage: 'ROUND_OF_16', round:  95 },
    { homeLabel: 'W87', awayLabel: 'W88', date: '2026-07-10T22:00:00Z', venueIdx:  7, stage: 'ROUND_OF_16', round:  96 },
    // ── Cuartos de final (July 12–13) ────────────────────
    { homeLabel: 'W89', awayLabel: 'W90', date: '2026-07-12T19:00:00Z', venueIdx:  0, stage: 'QUARTER_FINAL', round:  97 },
    { homeLabel: 'W91', awayLabel: 'W92', date: '2026-07-12T22:00:00Z', venueIdx:  2, stage: 'QUARTER_FINAL', round:  98 },
    { homeLabel: 'W93', awayLabel: 'W94', date: '2026-07-13T19:00:00Z', venueIdx:  9, stage: 'QUARTER_FINAL', round:  99 },
    { homeLabel: 'W95', awayLabel: 'W96', date: '2026-07-13T22:00:00Z', venueIdx:  1, stage: 'QUARTER_FINAL', round: 100 },
    // ── Semifinales (July 15–16) ─────────────────────────
    { homeLabel: 'W97',  awayLabel: 'W98',  date: '2026-07-15T22:00:00Z', venueIdx:  9, stage: 'SEMI_FINAL', round: 101 },
    { homeLabel: 'W99',  awayLabel: 'W100', date: '2026-07-16T22:00:00Z', venueIdx:  1, stage: 'SEMI_FINAL', round: 102 },
    // ── Tercer lugar (July 18) ───────────────────────────
    { homeLabel: 'L101', awayLabel: 'L102', date: '2026-07-18T19:00:00Z', venueIdx:  0, stage: 'THIRD_PLACE', round: 103 },
    // ── Final (July 19) ─────────────────────────────────
    { homeLabel: 'W101', awayLabel: 'W102', date: '2026-07-19T19:00:00Z', venueIdx:  1, stage: 'FINAL',      round: 104 },
  ];

  for (const m of KNOCKOUT) {
    await prisma.match.create({
      data: {
        tournamentId,
        homeTeamId: null,
        awayTeamId: null,
        homeLabel: m.homeLabel,
        awayLabel: m.awayLabel,
        stage: m.stage as any,
        group: null,
        round: m.round,
        matchDate: new Date(m.date),
        ...VENUES[m.venueIdx],
        status: 'SCHEDULED',
      },
    });
  }

  console.log(`✅ Created ${KNOCKOUT.length} knockout matches`);
}

async function seedFriendlyMatches() {
  console.log('🤝 Creating friendly matches — datos reales ESPN Argentina (junio 2026)...');

  const tournament = await prisma.tournament.upsert({
    where: { type_year: { type: TournamentType.FRIENDLY, year: 2026 } },
    update: { isActive: true, isFeatured: true, startDate: new Date('2026-06-03') },
    create: {
      name: 'Amistosos Internacionales 2026',
      shortName: 'Amistosos 26',
      year: 2026,
      type: TournamentType.FRIENDLY,
      startDate: new Date('2026-06-03'),
      endDate: new Date('2026-12-31'),
      hostCountries: [],
      isActive: true,
      isFeatured: true,
    },
  });

  await prisma.match.deleteMany({ where: { tournamentId: tournament.id } });

  // Helper: upserta equipo nacional (actualiza nombre/flag si ya existía con otro dato)
  const flagOf = (code: string, flag?: string) =>
    flag ?? `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
  const ut = async (code: string, name: string, region: string, flag?: string) =>
    prisma.team.upsert({
      where: { code },
      update: { name, shortName: code, region: region as any, flagUrl: flagOf(code, flag) },
      create: { name, shortName: code, code, region: region as any, flagUrl: flagOf(code, flag) },
    });

  type Friendly = {
    homeCode: string; awayCode: string;
    homeName: string; awayName: string;
    homeFlag?: string; awayFlag?: string;
    date: string;
    venue: string; city: string; country: string;
    status: string;
    homeScore?: number; awayScore?: number;
  };

  // ── Datos reales extraídos de ESPN Argentina ────────────────────────────────
  const MATCHES: Friendly[] = [
    // 3 junio
    { homeCode:'ITA', homeName:'Italia',         awayCode:'LUX', awayName:'Luxemburgo',
      date:'2026-06-03T19:45:00Z', venue:'Stade de Luxembourg',          city:'Luxemburgo',      country:'Luxembourg',     status:'FINISHED', homeScore:1, awayScore:0 },
    { homeCode:'ALG', homeName:'Argelia',         awayCode:'NED', awayName:'Países Bajos',
      date:'2026-06-03T19:00:00Z', venue:'De Kuip',                       city:'Róterdam',        country:'Netherlands',    status:'FINISHED', homeScore:1, awayScore:0 },
    { homeCode:'POL', homeName:'Polonia',         awayCode:'NGA', awayName:'Nigeria',
      date:'2026-06-03T18:00:00Z', venue:'PGE Narodowy',                  city:'Varsovia',        country:'Poland',         status:'FINISHED', homeScore:2, awayScore:2 },
    { homeCode:'KOR', homeName:'Corea del Sur',   awayCode:'SLV', awayName:'El Salvador',
      date:'2026-06-03T23:30:00Z', venue:'DRV PNK Stadium',               city:'Fort Lauderdale', country:'United States',  status:'FINISHED', homeScore:1, awayScore:0 },
    { homeCode:'PAN', homeName:'Panamá',          awayCode:'DOM', awayName:'Rep. Dominicana',
      date:'2026-06-03T23:00:00Z', venue:'Estadio Rommel Fernández',      city:'Ciudad de Panamá',country:'Panama',         status:'FINISHED', homeScore:4, awayScore:2 },
    // 4 junio
    { homeCode:'ESP', homeName:'España',          awayCode:'IRQ', awayName:'Irak',
      date:'2026-06-04T19:00:00Z', venue:'Riazor',                        city:'La Coruña',       country:'Spain',          status:'FINISHED', homeScore:1, awayScore:1 },
    { homeCode:'FRA', homeName:'Francia',         awayCode:'CIV', awayName:'Costa de Marfil',
      date:'2026-06-04T20:00:00Z', venue:'Stade de la Beaujoire',         city:'Nantes',          country:'France',         status:'FINISHED', homeScore:1, awayScore:2 },
    { homeCode:'MEX', homeName:'México',          awayCode:'SRB', awayName:'Serbia',
      date:'2026-06-04T01:00:00Z', venue:'Estadio Nemesio Díez',          city:'Toluca',          country:'Mexico',         status:'FINISHED', homeScore:5, awayScore:1 },
    { homeCode:'SWE', homeName:'Suecia',          awayCode:'GRE', awayName:'Grecia',
      date:'2026-06-04T19:00:00Z', venue:'Friends Arena',                  city:'Estocolmo',       country:'Sweden',         status:'FINISHED', homeScore:2, awayScore:2 },
    // 5 junio
    { homeCode:'PAR', homeName:'Paraguay',        awayCode:'NIC', awayName:'Nicaragua',
      date:'2026-06-05T00:00:00Z', venue:'Estadio Defensores del Chaco',  city:'Asunción',        country:'Paraguay',       status:'FINISHED', homeScore:4, awayScore:0 },
    { homeCode:'CAN', homeName:'Canadá',          awayCode:'IRL', awayName:'Irlanda',
      date:'2026-06-05T20:00:00Z', venue:'Aviva Stadium',                  city:'Dublín',          country:'Ireland',        status:'FINISHED', homeScore:1, awayScore:1 },
    { homeCode:'PER', homeName:'Perú',            awayCode:'HTI', awayName:'Haití',
      date:'2026-06-05T02:00:00Z', venue:'Inter&Co Stadium',               city:'Orlando',         country:'United States',  status:'FINISHED', homeScore:2, awayScore:1 },
    { homeCode:'KSA', homeName:'Arabia Saudita',  awayCode:'PUR', awayName:'Puerto Rico',
      date:'2026-06-05T02:00:00Z', venue:'Estadio Nacional',               city:'San José',        country:'Costa Rica',     status:'FINISHED', homeScore:3, awayScore:0 },
    // 6 junio — ventana FIFA principal
    { homeCode:'ARG', homeName:'Argentina',       awayCode:'HON', awayName:'Honduras',
      date:'2026-06-06T23:30:00Z', venue:'Estadio Monumental',             city:'Buenos Aires',    country:'Argentina',      status:'FINISHED', homeScore:2, awayScore:0 },
    { homeCode:'BRA', homeName:'Brasil',          awayCode:'EGY', awayName:'Egipto',
      date:'2026-06-06T21:30:00Z', venue:'Arena do Grêmio',                city:'Porto Alegre',    country:'Brazil',         status:'FINISHED', homeScore:2, awayScore:1 },
    { homeCode:'USA', homeName:'Estados Unidos',  awayCode:'GER', awayName:'Alemania',
      date:'2026-06-07T01:00:00Z', venue:'Soldier Field',                  city:'Chicago',         country:'United States',  status:'FINISHED', homeScore:1, awayScore:2 },
    { homeCode:'POR', homeName:'Portugal',        awayCode:'CHI', awayName:'Chile',
      date:'2026-06-06T19:00:00Z', venue:'Estádio José Alvalade',          city:'Lisboa',          country:'Portugal',       status:'FINISHED', homeScore:2, awayScore:1 },
    { homeCode:'BEL', homeName:'Bélgica',         awayCode:'TUN', awayName:'Túnez',
      date:'2026-06-06T19:00:00Z', venue:'Stade Roi Baudouin',             city:'Bruselas',        country:'Belgium',        status:'FINISHED', homeScore:5, awayScore:0 },
    // 7 junio
    { homeCode:'UKR', homeName:'Ucrania',         awayCode:'DEN', awayName:'Dinamarca',
      date:'2026-06-07T15:00:00Z', venue:'Nature Energy Park',             city:'Odense',          country:'Denmark',        status:'FINISHED', homeScore:1, awayScore:2 },
    { homeCode:'GRE', homeName:'Grecia',          awayCode:'ITA', awayName:'Italia',
      date:'2026-06-07T17:00:00Z', venue:'Pankritio Stadium',              city:'Heraklion',       country:'Greece',         status:'SCHEDULED' },
    { homeCode:'NOR', homeName:'Noruega',         awayCode:'MAR', awayName:'Marruecos',
      date:'2026-06-07T23:00:00Z', venue:'Red Bull Arena',                 city:'Harrison',        country:'United States',  status:'SCHEDULED' },
    { homeCode:'COL', homeName:'Colombia',        awayCode:'JOR', awayName:'Jordania',
      date:'2026-06-07T23:00:00Z', venue:'Snapdragon Stadium',             city:'San Diego',       country:'United States',  status:'SCHEDULED' },
    { homeCode:'ECU', homeName:'Ecuador',         awayCode:'GUA', awayName:'Guatemala',
      date:'2026-06-07T23:00:00Z', venue:"ScottsMiracle-Gro Field",        city:'Columbus',        country:'United States',  status:'SCHEDULED' },
    // 8 junio
    { homeCode:'ENG', homeName:'Inglaterra',      awayCode:'NZL', awayName:'Nueva Zelanda',
      date:'2026-06-08T19:00:00Z', venue:'Wembley Stadium',                city:'Londres',         country:'England',        status:'FINISHED', homeScore:2, awayScore:0 },
    // 9 junio — segunda fecha ventana FIFA
    { homeCode:'ARG', homeName:'Argentina',       awayCode:'URU', awayName:'Uruguay',
      date:'2026-06-09T21:00:00Z', venue:'Estadio Monumental',             city:'Buenos Aires',    country:'Argentina',      status:'SCHEDULED' },
    { homeCode:'BRA', homeName:'Brasil',          awayCode:'COL', awayName:'Colombia',
      date:'2026-06-09T21:30:00Z', venue:'Maracanã',                       city:'Río de Janeiro',  country:'Brazil',         status:'SCHEDULED' },
    { homeCode:'FRA', homeName:'Francia',         awayCode:'POR', awayName:'Portugal',
      date:'2026-06-09T20:45:00Z', venue:'Stade de France',                city:'Saint-Denis',     country:'France',         status:'SCHEDULED' },
    { homeCode:'ESP', homeName:'España',          awayCode:'MEX', awayName:'México',
      date:'2026-06-09T21:00:00Z', venue:'Estadio Santiago Bernabéu',      city:'Madrid',          country:'Spain',          status:'SCHEDULED' },
    { homeCode:'GER', homeName:'Alemania',        awayCode:'NED', awayName:'Países Bajos',
      date:'2026-06-09T19:00:00Z', venue:'Allianz Arena',                  city:'Múnich',          country:'Germany',        status:'SCHEDULED' },
    { homeCode:'USA', homeName:'Estados Unidos',  awayCode:'EGY', awayName:'Egipto',
      date:'2026-06-10T01:00:00Z', venue:'Audi Field',                     city:'Washington DC',   country:'United States',  status:'SCHEDULED' },
    { homeCode:'ENG', homeName:'Inglaterra',      awayCode:'CRO', awayName:'Croacia',
      date:'2026-06-09T19:00:00Z', venue:'Wembley Stadium',                city:'Londres',         country:'England',        status:'SCHEDULED' },
    { homeCode:'BEL', homeName:'Bélgica',         awayCode:'SUI', awayName:'Suiza',
      date:'2026-06-09T20:45:00Z', venue:'Stade Roi Baudouin',             city:'Bruselas',        country:'Belgium',        status:'SCHEDULED' },
    { homeCode:'JPN', homeName:'Japón',           awayCode:'KOR', awayName:'Corea del Sur',
      date:'2026-06-09T11:00:00Z', venue:'Japan National Stadium',         city:'Tokio',           country:'Japan',          status:'SCHEDULED' },
    // Post-Mundial (septiembre–noviembre 2026)
    { homeCode:'ARG', homeName:'Argentina',       awayCode:'BRA', awayName:'Brasil',
      date:'2026-09-06T21:00:00Z', venue:'Estadio Monumental',             city:'Buenos Aires',    country:'Argentina',      status:'SCHEDULED' },
    { homeCode:'ESP', homeName:'España',          awayCode:'GER', awayName:'Alemania',
      date:'2026-09-06T20:45:00Z', venue:'Estadio Santiago Bernabéu',      city:'Madrid',          country:'Spain',          status:'SCHEDULED' },
    { homeCode:'FRA', homeName:'Francia',         awayCode:'ENG', awayName:'Inglaterra',
      date:'2026-09-07T20:45:00Z', venue:'Stade de France',                city:'Saint-Denis',     country:'France',         status:'SCHEDULED' },
  ];

  // Crear equipos que puedan no estar en la DB
  // region, code, name, flagUrl
  const EXTRA_TEAMS: [string, string, string, string][] = [
    ['UEFA',     'ITA', 'Italia',          'https://flagcdn.com/w40/it.png'],
    ['UEFA',     'LUX', 'Luxemburgo',      'https://flagcdn.com/w40/lu.png'],
    ['CAF',      'ALG', 'Argelia',         'https://flagcdn.com/w40/dz.png'],
    ['UEFA',     'POL', 'Polonia',         'https://flagcdn.com/w40/pl.png'],
    ['CAF',      'NGA', 'Nigeria',         'https://flagcdn.com/w40/ng.png'],
    ['CONCACAF', 'SLV', 'El Salvador',     'https://flagcdn.com/w40/sv.png'],
    ['CONCACAF', 'PAN', 'Panamá',          'https://flagcdn.com/w40/pa.png'],
    ['CONCACAF', 'DOM', 'Rep. Dominicana', 'https://flagcdn.com/w40/do.png'],
    ['AFC',      'IRQ', 'Irak',            'https://flagcdn.com/w40/iq.png'],
    ['CAF',      'CIV', 'Costa de Marfil', 'https://flagcdn.com/w40/ci.png'],
    ['UEFA',     'SRB', 'Serbia',          'https://flagcdn.com/w40/rs.png'],
    ['UEFA',     'SWE', 'Suecia',          'https://flagcdn.com/w40/se.png'],
    ['UEFA',     'GRE', 'Grecia',          'https://flagcdn.com/w40/gr.png'],
    ['CONCACAF', 'NIC', 'Nicaragua',       'https://flagcdn.com/w40/ni.png'],
    ['UEFA',     'IRL', 'Irlanda',         'https://flagcdn.com/w40/ie.png'],
    ['CONMEBOL', 'PER', 'Perú',            'https://flagcdn.com/w40/pe.png'],
    ['CONCACAF', 'HTI', 'Haití',           'https://flagcdn.com/w40/ht.png'],
    ['CONCACAF', 'PUR', 'Puerto Rico',     'https://flagcdn.com/w40/pr.png'],
    ['CONCACAF', 'HON', 'Honduras',        'https://flagcdn.com/w40/hn.png'],
    ['CAF',      'EGY', 'Egipto',          'https://flagcdn.com/w40/eg.png'],
    ['UEFA',     'UKR', 'Ucrania',         'https://flagcdn.com/w40/ua.png'],
    ['UEFA',     'DEN', 'Dinamarca',       'https://flagcdn.com/w40/dk.png'],
    ['UEFA',     'NOR', 'Noruega',         'https://flagcdn.com/w40/no.png'],
    ['AFC',      'JOR', 'Jordania',        'https://flagcdn.com/w40/jo.png'],
    ['CONCACAF', 'GUA', 'Guatemala',       'https://flagcdn.com/w40/gt.png'],
    ['OFC',      'NZL', 'Nueva Zelanda',   'https://flagcdn.com/w40/nz.png'],
    ['UEFA',     'CRO', 'Croacia',         'https://flagcdn.com/w40/hr.png'],
  ];
  for (const [region, code, name, flag] of EXTRA_TEAMS) await ut(code, name, region, flag);

  let created = 0;
  for (const m of MATCHES) {
    const homeTeam = await prisma.team.findUnique({ where: { code: m.homeCode } });
    const awayTeam = await prisma.team.findUnique({ where: { code: m.awayCode } });
    if (!homeTeam || !awayTeam) {
      console.warn(`⚠ Friendly skip: ${m.homeCode} vs ${m.awayCode} — team not found`);
      continue;
    }
    await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        stage: 'FRIENDLY',
        round: 1,
        matchDate: new Date(m.date),
        venue: m.venue,
        city: m.city,
        status: m.status as any,
        ...(m.homeScore !== undefined && { homeScore: m.homeScore }),
        ...(m.awayScore !== undefined && { awayScore: m.awayScore }),
      },
    });
    created++;
  }

  console.log(`✅ Created ${created} friendly matches con datos reales ESPN Argentina`);
  return tournament;
}

async function seedAdminUser() {
  console.log('👤 Creating admin user...');
  const passwordHash = await bcrypt.hash('Admin2026!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@shinrafixture.com' },
    update: {},
    create: {
      email: 'admin@shinrafixture.com',
      username: 'shinra_admin',
      displayName: 'ShinraFixture Admin',
      passwordHash,
      role: 'SUPER_ADMIN',
      isPremium: true,
      isVerified: true,
      level: 100,
      xp: 999999,
      predictionPoints: 9999,
    },
  });

  console.log('✅ Admin user: admin@shinrafixture.com / Admin2026!');
}

async function seedAchievements() {
  console.log('🏅 Creating achievements...');
  const achievements = [
    { type: 'FIRST_PREDICTION', name: 'Primer Pronóstico', description: 'Hiciste tu primera predicción', xpReward: 50 },
    { type: 'PERFECT_WEEK', name: 'Semana Perfecta', description: 'Acertaste todos los pronósticos de una semana', xpReward: 200 },
    { type: 'TOP_PREDICTOR', name: 'Top Pronosticador', description: 'Llegaste al Top 100 del ranking', xpReward: 500 },
    { type: 'EARLY_ADOPTER', name: 'Adoptador Temprano', description: 'Te registraste antes del inicio del Mundial', xpReward: 100 },
    { type: 'WORLD_CUP_CHAMPION_CALL', name: 'Clarividente', description: 'Predijiste al campeón del mundo', xpReward: 1000 },
    { type: 'STREAK_5', name: 'Racha x5', description: '5 predicciones correctas consecutivas', xpReward: 150 },
    { type: 'STREAK_10', name: 'Racha x10', description: '10 predicciones correctas consecutivas', xpReward: 350 },
    { type: 'STREAK_20', name: 'Racha x20', description: '20 predicciones correctas consecutivas', xpReward: 750 },
    { type: 'SOCIAL_BUTTERFLY', name: 'Social', description: 'Invitaste a 5 amigos a tu quiniela', xpReward: 200 },
    { type: 'QUINIELA_WINNER', name: 'Rey de la Quiniela', description: 'Ganaste una quiniela grupal', xpReward: 500 },
  ] as const;

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { type: ach.type },
      update: {},
      create: { ...ach, icon: `/assets/achievements/${ach.type.toLowerCase()}.png`, condition: {} },
    });
  }
  console.log(`✅ Created ${achievements.length} achievements`);
}

async function seedAppConfig() {
  const configs = [
    { key: 'wc2026_active', value: true, description: 'World Cup 2026 is active' },
    { key: 'prediction_close_minutes', value: 15, description: 'Minutes before match to close predictions' },
    { key: 'premium_price_monthly', value: 4.99, description: 'Premium monthly price in USD' },
    { key: 'premium_price_annual', value: 39.99, description: 'Premium annual price in USD' },
    { key: 'max_quiniela_members', value: 100, description: 'Maximum members per quiniela group' },
    { key: 'points_exact_score', value: 5, description: 'Points for exact score prediction' },
    { key: 'points_correct_gd', value: 4, description: 'Points for correct goal difference' },
    { key: 'points_correct_winner', value: 3, description: 'Points for correct winner' },
  ];

  for (const cfg of configs) {
    await prisma.appConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value },
      create: cfg,
    });
  }
  console.log('✅ App config seeded');
}

// ── Club Teams (Top European & South American leagues) ─
function clubAvatar(initials: string, hexColor: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${hexColor}&color=fff&size=128&bold=true&font-size=0.45`;
}

// football-data.org public crest CDN (no auth needed for images)
const FD_CRESTS: Record<string, number> = {
  ARS: 57,  CHE: 61,  LFC: 64,  MCI: 65,  MNU: 66,
  THF: 73,  NEW: 67,  AVL: 58,
  RMA: 86,  FCB: 81,  ATI: 78,  SEV: 559, RSO: 92, VIL: 94,
  BAY: 5,   BVB: 4,   RBL: 721, B04: 3,
  JUV: 109, INT: 108, ACM: 98,  NAP: 113, ROM: 100,
  PSG: 524, OLM: 516, OLL: 523,
  AJX: 678, FCP: 503, SLB: 498, SCP: 228,
};

function clubLogo(code: string, fallbackName: string, color: string): string {
  const id = FD_CRESTS[code];
  if (id) return `https://crests.football-data.org/${id}.png`;
  return clubAvatar(fallbackName.slice(0, 3).toUpperCase(), color);
}

async function seedClubTeams() {
  console.log('⚽ Seeding club teams...');

  // UCL 2025/26 (current season as of June 2026 - final was May 2026)
  const ucl = await prisma.tournament.upsert({
    where: { type_year: { type: TournamentType.CHAMPIONS_LEAGUE, year: 2026 } },
    update: {},
    create: {
      name: 'UEFA Champions League 2025/26',
      shortName: 'UCL 25/26',
      year: 2026,
      type: TournamentType.CHAMPIONS_LEAGUE,
      startDate: new Date('2025-09-16'),
      endDate: new Date('2026-05-30'),
      hostCountries: [],
      logo: `https://crests.football-data.org/CL.png`,
      isActive: false, isFeatured: false,
    },
  });

  // Copa Libertadores 2025 (current edition)
  const lib = await prisma.tournament.upsert({
    where: { type_year: { type: TournamentType.LIBERTADORES, year: 2025 } },
    update: {},
    create: {
      name: 'CONMEBOL Copa Libertadores 2025',
      shortName: 'Libertadores 25',
      year: 2025,
      type: TournamentType.LIBERTADORES,
      startDate: new Date('2025-02-05'),
      endDate: new Date('2025-11-29'),
      hostCountries: [],
      logo: clubAvatar('LIB', 'c9a84c'),
      isActive: false, isFeatured: false,
    },
  });

  type Club = { name: string; short: string; code: string; color: string; region: Region; ranking: number; tourId: string; group: string };

  const clubs: Club[] = [
    // ── Premier League ──────────────────────
    { name: 'Arsenal FC', short: 'Arsenal', code: 'ARS', color: 'DB0007', region: Region.UEFA, ranking: 5, tourId: ucl.id, group: 'A' },
    { name: 'Chelsea FC', short: 'Chelsea', code: 'CHE', color: '034694', region: Region.UEFA, ranking: 7, tourId: ucl.id, group: 'A' },
    { name: 'Liverpool FC', short: 'Liverpool', code: 'LFC', color: 'C8102E', region: Region.UEFA, ranking: 3, tourId: ucl.id, group: 'B' },
    { name: 'Manchester City', short: 'Man City', code: 'MCI', color: '6CABDD', region: Region.UEFA, ranking: 1, tourId: ucl.id, group: 'B' },
    { name: 'Manchester United', short: 'Man United', code: 'MNU', color: 'DA291C', region: Region.UEFA, ranking: 10, tourId: ucl.id, group: 'C' },
    { name: 'Tottenham Hotspur', short: 'Tottenham', code: 'THF', color: '132257', region: Region.UEFA, ranking: 12, tourId: ucl.id, group: 'C' },
    { name: 'Newcastle United', short: 'Newcastle', code: 'NEW', color: '000000', region: Region.UEFA, ranking: 15, tourId: ucl.id, group: 'D' },
    { name: 'Aston Villa', short: 'Aston Villa', code: 'AVL', color: '460135', region: Region.UEFA, ranking: 9, tourId: ucl.id, group: 'D' },
    // ── LaLiga ──────────────────────────────
    { name: 'Real Madrid', short: 'Real Madrid', code: 'RMA', color: '00529F', region: Region.UEFA, ranking: 2, tourId: ucl.id, group: 'E' },
    { name: 'FC Barcelona', short: 'Barcelona', code: 'FCB', color: 'A50044', region: Region.UEFA, ranking: 4, tourId: ucl.id, group: 'E' },
    { name: 'Atlético de Madrid', short: 'Atlético', code: 'ATI', color: 'CC0000', region: Region.UEFA, ranking: 8, tourId: ucl.id, group: 'F' },
    { name: 'Sevilla FC', short: 'Sevilla', code: 'SEV', color: 'D70206', region: Region.UEFA, ranking: 20, tourId: ucl.id, group: 'F' },
    { name: 'Real Sociedad', short: 'R. Sociedad', code: 'RSO', color: '003D8F', region: Region.UEFA, ranking: 22, tourId: ucl.id, group: 'G' },
    { name: 'Villarreal CF', short: 'Villarreal', code: 'VIL', color: 'F9E300', region: Region.UEFA, ranking: 25, tourId: ucl.id, group: 'G' },
    // ── Bundesliga ──────────────────────────
    { name: 'Bayern München', short: 'Bayern', code: 'BAY', color: 'DC052D', region: Region.UEFA, ranking: 6, tourId: ucl.id, group: 'H' },
    { name: 'Borussia Dortmund', short: 'Dortmund', code: 'BVB', color: 'FFE500', region: Region.UEFA, ranking: 11, tourId: ucl.id, group: 'H' },
    { name: 'RB Leipzig', short: 'Leipzig', code: 'RBL', color: 'CC0000', region: Region.UEFA, ranking: 13, tourId: ucl.id, group: 'A' },
    { name: 'Bayer Leverkusen', short: 'Leverkusen', code: 'B04', color: 'E32221', region: Region.UEFA, ranking: 14, tourId: ucl.id, group: 'B' },
    // ── Serie A ─────────────────────────────
    { name: 'Juventus FC', short: 'Juventus', code: 'JUV', color: '1F1F1F', region: Region.UEFA, ranking: 16, tourId: ucl.id, group: 'C' },
    { name: 'Inter de Milán', short: 'Inter', code: 'INT', color: '003CA4', region: Region.UEFA, ranking: 17, tourId: ucl.id, group: 'D' },
    { name: 'AC Milan', short: 'AC Milan', code: 'ACM', color: 'FB090B', region: Region.UEFA, ranking: 18, tourId: ucl.id, group: 'E' },
    { name: 'SSC Napoli', short: 'Napoli', code: 'NAP', color: '12A0C7', region: Region.UEFA, ranking: 19, tourId: ucl.id, group: 'F' },
    { name: 'AS Roma', short: 'Roma', code: 'ROM', color: '8B1729', region: Region.UEFA, ranking: 21, tourId: ucl.id, group: 'G' },
    // ── Ligue 1 ─────────────────────────────
    { name: 'Paris Saint-Germain', short: 'PSG', code: 'PSG', color: '003C78', region: Region.UEFA, ranking: 23, tourId: ucl.id, group: 'H' },
    { name: 'Olympique de Marseille', short: 'Marseille', code: 'OLM', color: '009AC7', region: Region.UEFA, ranking: 30, tourId: ucl.id, group: 'A' },
    { name: 'Olympique Lyonnais', short: 'Lyon', code: 'OLL', color: '0033A0', region: Region.UEFA, ranking: 35, tourId: ucl.id, group: 'B' },
    // ── Otros UEFA ──────────────────────────
    { name: 'AFC Ajax', short: 'Ajax', code: 'AJX', color: 'D2122E', region: Region.UEFA, ranking: 28, tourId: ucl.id, group: 'C' },
    { name: 'FC Porto', short: 'Porto', code: 'FCP', color: '004FA3', region: Region.UEFA, ranking: 26, tourId: ucl.id, group: 'D' },
    { name: 'SL Benfica', short: 'Benfica', code: 'SLB', color: 'E31D1A', region: Region.UEFA, ranking: 27, tourId: ucl.id, group: 'E' },
    { name: 'Sporting CP', short: 'Sporting', code: 'SCP', color: '005F2F', region: Region.UEFA, ranking: 29, tourId: ucl.id, group: 'F' },
    // ── Libertadores ────────────────────────
    { name: 'Club River Plate', short: 'River Plate', code: 'RIV', color: 'D50033', region: Region.CONMEBOL, ranking: 32, tourId: lib.id, group: 'A' },
    { name: 'Club Boca Juniors', short: 'Boca Juniors', code: 'BOC', color: '0033A0', region: Region.CONMEBOL, ranking: 33, tourId: lib.id, group: 'A' },
    { name: 'CR Flamengo', short: 'Flamengo', code: 'FLA', color: 'CC0001', region: Region.CONMEBOL, ranking: 34, tourId: lib.id, group: 'B' },
    { name: 'SE Palmeiras', short: 'Palmeiras', code: 'PAL', color: '006633', region: Region.CONMEBOL, ranking: 36, tourId: lib.id, group: 'B' },
    { name: 'Fluminense FC', short: 'Fluminense', code: 'FLU', color: '6A0F28', region: Region.CONMEBOL, ranking: 38, tourId: lib.id, group: 'C' },
    { name: 'Atlético Mineiro', short: 'Atlético MG', code: 'CAM', color: '000000', region: Region.CONMEBOL, ranking: 37, tourId: lib.id, group: 'C' },
    { name: 'Colo-Colo', short: 'Colo-Colo', code: 'CLC', color: '000000', region: Region.CONMEBOL, ranking: 42, tourId: lib.id, group: 'D' },
    { name: 'Peñarol', short: 'Peñarol', code: 'PEN', color: 'F5C700', region: Region.CONMEBOL, ranking: 44, tourId: lib.id, group: 'D' },
    { name: 'Nacional (Uruguay)', short: 'Nacional', code: 'NAC', color: '003087', region: Region.CONMEBOL, ranking: 45, tourId: lib.id, group: 'E' },
    { name: 'Universidad de Chile', short: 'U. de Chile', code: 'UCH', color: '003087', region: Region.CONMEBOL, ranking: 48, tourId: lib.id, group: 'E' },
    { name: 'LDU Quito', short: 'LDU Quito', code: 'LDU', color: 'FFFFFF', region: Region.CONMEBOL, ranking: 50, tourId: lib.id, group: 'F' },
    { name: 'Olimpia', short: 'Olimpia', code: 'OLI', color: '000000', region: Region.CONMEBOL, ranking: 52, tourId: lib.id, group: 'F' },
  ];

  for (const club of clubs) {
    await prisma.team.upsert({
      where: { code: club.code },
      update: {},
      create: {
        name: club.name,
        shortName: club.short,
        code: club.code,
        region: club.region,
        fifaRanking: club.ranking,
        group: club.group,
        flagUrl: clubLogo(club.code, club.short, club.color),
        shieldUrl: clubLogo(club.code, club.short, club.color),
      },
    });

    // Add to tournament group
    const grp = await prisma.tournamentGroup.upsert({
      where: { tournamentId_letter: { tournamentId: club.tourId, letter: club.group } },
      update: {},
      create: { name: `Grupo ${club.group}`, letter: club.group, tournamentId: club.tourId },
    });
    const team = await prisma.team.findUnique({ where: { code: club.code } });
    if (team) {
      await prisma.tournamentGroupTeam.upsert({
        where: { groupId_teamId: { groupId: grp.id, teamId: team.id } },
        update: {},
        create: { groupId: grp.id, teamId: team.id },
      });
    }
  }

  console.log(`✅ Clubs: ${clubs.length} equipos de ligas europeas y sudamericanas`);
}

// ── Copa América 2024 ──────────────────────────────────
async function seedCopaAmerica2024() {
  console.log('🏆 Seeding Copa América 2024...');

  const tournament = await prisma.tournament.upsert({
    where: { type_year: { type: TournamentType.COPA_AMERICA, year: 2024 } },
    update: {},
    create: {
      name: 'CONMEBOL Copa América 2024',
      shortName: 'Copa América 24',
      year: 2024,
      type: TournamentType.COPA_AMERICA,
      startDate: new Date('2024-06-20'),
      endDate: new Date('2024-07-14'),
      hostCountries: ['United States'],
      logo: `https://flagcdn.com/w80/us.png`,
      isActive: false,
      isFeatured: false,
    },
  });

  const caTeams: Array<[string, string, string, Region, number, string]> = [
    ['Argentina', 'Argentina', 'ARG', Region.CONMEBOL, 1, 'A'],
    ['Peru', 'Perú', 'PER', Region.CONMEBOL, 36, 'A'],
    ['Chile', 'Chile', 'CHI', Region.CONMEBOL, 38, 'A'],
    ['Canada', 'Canadá', 'CAN', Region.CONCACAF, 47, 'A'],
    ['Mexico', 'México', 'MEX', Region.CONCACAF, 15, 'B'],
    ['Ecuador', 'Ecuador', 'ECU', Region.CONMEBOL, 44, 'B'],
    ['Venezuela', 'Venezuela', 'VEN', Region.CONMEBOL, 52, 'B'],
    ['Jamaica', 'Jamaica', 'JAM', Region.CONCACAF, 90, 'B'],
    ['United States', 'USA', 'USA', Region.CONCACAF, 13, 'C'],
    ['Uruguay', 'Uruguay', 'URU', Region.CONMEBOL, 18, 'C'],
    ['Panama', 'Panamá', 'PAN', Region.CONCACAF, 51, 'C'],
    ['Bolivia', 'Bolivia', 'BOL', Region.CONMEBOL, 85, 'C'],
    ['Brazil', 'Brasil', 'BRA', Region.CONMEBOL, 5, 'D'],
    ['Colombia', 'Colombia', 'COL', Region.CONMEBOL, 12, 'D'],
    ['Paraguay', 'Paraguay', 'PAR', Region.CONMEBOL, 56, 'D'],
    ['Costa Rica', 'Costa Rica', 'CRC', Region.CONCACAF, 55, 'D'],
  ];

  const teams = [];
  for (const [name, shortName, code, region, fifaRanking, group] of caTeams) {
    const t = await prisma.team.upsert({
      where: { code },
      update: { fifaRanking },
      create: { name, shortName, code, region, fifaRanking, group, flagUrl: flagUrl(code), shieldUrl: flagUrl(code) },
    });
    teams.push({ ...t, group });
  }

  // Create groups
  for (const grp of ['A', 'B', 'C', 'D']) {
    const grpTeams = teams.filter((t) => t.group === grp);
    const group = await prisma.tournamentGroup.upsert({
      where: { tournamentId_letter: { tournamentId: tournament.id, letter: grp } },
      update: {},
      create: { name: `Grupo ${grp}`, letter: grp, tournamentId: tournament.id },
    });
    for (const t of grpTeams) {
      await prisma.tournamentGroupTeam.upsert({
        where: { groupId_teamId: { groupId: group.id, teamId: t.id } },
        update: {},
        create: { groupId: group.id, teamId: t.id },
      });
    }
  }

  console.log(`✅ Copa América 2024: ${teams.length} equipos`);
  return tournament;
}

// ── UEFA Euro 2024 ────────────────────────────────────
async function seedEuro2024() {
  console.log('🏆 Seeding UEFA Euro 2024...');

  const tournament = await prisma.tournament.upsert({
    where: { type_year: { type: TournamentType.EURO, year: 2024 } },
    update: {},
    create: {
      name: 'UEFA Euro 2024',
      shortName: 'Euro 2024',
      year: 2024,
      type: TournamentType.EURO,
      startDate: new Date('2024-06-14'),
      endDate: new Date('2024-07-14'),
      hostCountries: ['Germany'],
      logo: `https://flagcdn.com/w80/de.png`,
      isActive: false,
      isFeatured: false,
    },
  });

  const euroTeams: Array<[string, string, string, Region, number, string]> = [
    ['Germany', 'Alemania', 'GER', Region.UEFA, 16, 'A'],
    ['Scotland', 'Escocia', 'SCO', Region.UEFA, 39, 'A'],
    ['Hungary', 'Hungría', 'HUN', Region.UEFA, 27, 'A'],
    ['Switzerland', 'Suiza', 'SUI', Region.UEFA, 19, 'A'],
    ['Spain', 'España', 'ESP', Region.UEFA, 8, 'B'],
    ['Croatia', 'Croacia', 'CRO', Region.UEFA, 10, 'B'],
    ['Italy', 'Italia', 'ITA', Region.UEFA, 9, 'B'],
    ['Albania', 'Albania', 'ALB', Region.UEFA, 66, 'B'],
    ['Slovenia', 'Eslovenia', 'SVN', Region.UEFA, 57, 'C'],
    ['Denmark', 'Dinamarca', 'DEN', Region.UEFA, 21, 'C'],
    ['Serbia', 'Serbia', 'SRB', Region.UEFA, 33, 'C'],
    ['England', 'Inglaterra', 'ENG', Region.UEFA, 4, 'C'],
    ['Poland', 'Polonia', 'POL', Region.UEFA, 26, 'D'],
    ['Netherlands', 'Países Bajos', 'NED', Region.UEFA, 7, 'D'],
    ['Austria', 'Austria', 'AUT', Region.UEFA, 25, 'D'],
    ['France', 'Francia', 'FRA', Region.UEFA, 2, 'D'],
    ['Belgium', 'Bélgica', 'BEL', Region.UEFA, 3, 'E'],
    ['Slovakia', 'Eslovaquia', 'SVK', Region.UEFA, 48, 'E'],
    ['Romania', 'Rumania', 'ROU', Region.UEFA, 46, 'E'],
    ['Ukraine', 'Ucrania', 'UKR', Region.UEFA, 22, 'E'],
    ['Turkey', 'Turquía', 'TUR', Region.UEFA, 28, 'F'],
    ['Georgia', 'Georgia', 'GEO', Region.UEFA, 75, 'F'],
    ['Portugal', 'Portugal', 'POR', Region.UEFA, 6, 'F'],
    ['Czech Republic', 'Rep. Checa', 'CZE', Region.UEFA, 40, 'F'],
  ];

  const teams = [];
  for (const [name, shortName, code, region, fifaRanking, group] of euroTeams) {
    const t = await prisma.team.upsert({
      where: { code },
      update: { fifaRanking },
      create: { name, shortName, code, region, fifaRanking, group, flagUrl: flagUrl(code), shieldUrl: flagUrl(code) },
    });
    teams.push({ ...t, group });
  }

  for (const grp of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const grpTeams = teams.filter((t) => t.group === grp);
    const group = await prisma.tournamentGroup.upsert({
      where: { tournamentId_letter: { tournamentId: tournament.id, letter: grp } },
      update: {},
      create: { name: `Grupo ${grp}`, letter: grp, tournamentId: tournament.id },
    });
    for (const t of grpTeams) {
      await prisma.tournamentGroupTeam.upsert({
        where: { groupId_teamId: { groupId: group.id, teamId: t.id } },
        update: {},
        create: { groupId: group.id, teamId: t.id },
      });
    }
  }

  console.log(`✅ Euro 2024: ${teams.length} equipos`);
  return tournament;
}

// ── AFCON 2025 ────────────────────────────────────────
async function seedAFCON2025() {
  console.log('🏆 Seeding AFCON 2025...');

  const tournament = await prisma.tournament.upsert({
    where: { type_year: { type: TournamentType.COPA_AMERICA, year: 2025 } },
    update: {},
    create: {
      name: 'TotalEnergies AFCON 2025',
      shortName: 'AFCON 2025',
      year: 2025,
      type: TournamentType.COPA_AMERICA,
      startDate: new Date('2025-01-21'),
      endDate: new Date('2025-02-21'),
      hostCountries: ['Morocco'],
      logo: `https://flagcdn.com/w80/ma.png`,
      isActive: false,
      isFeatured: false,
    },
  });

  const afconTeams: Array<[string, string, string, Region, number, string]> = [
    ['Ivory Coast', 'Costa de Marfil', 'CIV', Region.CAF, 30, 'A'],
    ['Nigeria', 'Nigeria', 'NGA', Region.CAF, 40, 'A'],
    ['Guinea-Bissau', 'Guinea-Bisáu', 'GNB', Region.CAF, 95, 'A'],
    ['Equatorial Guinea', 'Guinea Ecuatorial', 'EQG', Region.CAF, 120, 'A'],
    ['Egypt', 'Egipto', 'EGY', Region.CAF, 34, 'B'],
    ['Ghana', 'Ghana', 'GHA', Region.CAF, 60, 'B'],
    ['Cape Verde', 'Cabo Verde', 'CPV', Region.CAF, 80, 'B'],
    ['Mozambique', 'Mozambique', 'MOZ', Region.CAF, 140, 'B'],
    ['Senegal', 'Senegal', 'SEN', Region.CAF, 20, 'C'],
    ['Cameroon', 'Camerún', 'CMR', Region.CAF, 42, 'C'],
    ['Guinea', 'Guinea', 'GUI', Region.CAF, 100, 'C'],
    ['Gambia', 'Gambia', 'GAM', Region.CAF, 110, 'C'],
    ['Algeria', 'Argelia', 'ALG', Region.CAF, 37, 'D'],
    ['Burkina Faso', 'Burkina Faso', 'BFA', Region.CAF, 62, 'D'],
    ['Mauritania', 'Mauritania', 'MTN', Region.CAF, 112, 'D'],
    ['Angola', 'Angola', 'ANG', Region.CAF, 105, 'D'],
    ['Tunisia', 'Túnez', 'TUN', Region.CAF, 35, 'E'],
    ['Mali', 'Malí', 'MLI', Region.CAF, 55, 'E'],
    ['South Africa', 'Sudáfrica', 'RSA', Region.CAF, 67, 'E'],
    ['Namibia', 'Namibia', 'NAM', Region.CAF, 130, 'E'],
    ['Morocco', 'Marruecos', 'MAR', Region.CAF, 14, 'F'],
    ['DR Congo', 'R.D. Congo', 'COD', Region.CAF, 70, 'F'],
    ['Zambia', 'Zambia', 'ZAM', Region.CAF, 115, 'F'],
    ['Tanzania', 'Tanzania', 'TAN', Region.CAF, 125, 'F'],
  ];

  const teams = [];
  for (const [name, shortName, code, region, fifaRanking, group] of afconTeams) {
    const t = await prisma.team.upsert({
      where: { code },
      update: {},
      create: { name, shortName, code, region, fifaRanking, group, flagUrl: flagUrl(code), shieldUrl: flagUrl(code) },
    });
    teams.push({ ...t, group });
  }

  for (const grp of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const grpTeams = teams.filter((t) => t.group === grp);
    const group = await prisma.tournamentGroup.upsert({
      where: { tournamentId_letter: { tournamentId: tournament.id, letter: grp } },
      update: {},
      create: { name: `Grupo ${grp}`, letter: grp, tournamentId: tournament.id },
    });
    for (const t of grpTeams) {
      await prisma.tournamentGroupTeam.upsert({
        where: { groupId_teamId: { groupId: group.id, teamId: t.id } },
        update: {},
        create: { groupId: group.id, teamId: t.id },
      });
    }
  }

  console.log(`✅ AFCON 2023: ${teams.length} equipos`);
  return tournament;
}

// ── AFC Asian Cup 2023 ────────────────────────────────
async function seedAsianCup2023() {
  console.log('🏆 Seeding AFC Asian Cup 2023...');

  const tournament = await prisma.tournament.upsert({
    where: { type_year: { type: TournamentType.NATIONS_LEAGUE, year: 2023 } },
    update: {},
    create: {
      name: 'AFC Asian Cup Qatar 2023',
      shortName: 'Asian Cup 23',
      year: 2023,
      type: TournamentType.NATIONS_LEAGUE,
      startDate: new Date('2024-01-12'),
      endDate: new Date('2024-02-10'),
      hostCountries: ['Qatar'],
      logo: `https://flagcdn.com/w80/qa.png`,
      isActive: false,
      isFeatured: false,
    },
  });

  const asianTeams: Array<[string, string, string, Region, number, string]> = [
    ['Qatar', 'Qatar', 'QAT', Region.AFC, 37, 'A'],
    ['China', 'China', 'CHN', Region.AFC, 79, 'A'],
    ['Tajikistan', 'Tayikistán', 'TAJ', Region.AFC, 107, 'A'],
    ['Lebanon', 'Líbano', 'LBN', Region.AFC, 99, 'A'],
    ['Australia', 'Australia', 'AUS', Region.AFC, 23, 'B'],
    ['Uzbekistan', 'Uzbekistán', 'UZB', Region.AFC, 63, 'B'],
    ['Syria', 'Siria', 'SYR', Region.AFC, 91, 'B'],
    ['India', 'India', 'IND', Region.AFC, 102, 'B'],
    ['Iran', 'Irán', 'IRN', Region.AFC, 21, 'C'],
    ['UAE', 'Emiratos', 'UAE', Region.AFC, 68, 'C'],
    ['Palestine', 'Palestina', 'PAL', Region.AFC, 103, 'C'],
    ['Hong Kong', 'Hong Kong', 'HKG', Region.AFC, 147, 'C'],
    ['Japan', 'Japón', 'JPN', Region.AFC, 17, 'D'],
    ['Indonesia', 'Indonesia', 'IDN', Region.AFC, 146, 'D'],
    ['Iraq', 'Iraq', 'IRQ', Region.AFC, 65, 'D'],
    ['Vietnam', 'Vietnam', 'VIE', Region.AFC, 94, 'D'],
    ['South Korea', 'Corea del Sur', 'KOR', Region.AFC, 22, 'E'],
    ['Bahrain', 'Bahrein', 'BHR', Region.AFC, 89, 'E'],
    ['Jordan', 'Jordania', 'JOR', Region.AFC, 87, 'E'],
    ['Malaysia', 'Malasia', 'MAS', Region.AFC, 130, 'E'],
    ['Saudi Arabia', 'Arabia Saudita', 'KSA', Region.AFC, 58, 'F'],
    ['Thailand', 'Tailandia', 'THA', Region.AFC, 104, 'F'],
    ['Kyrgyzstan', 'Kirguistán', 'KGZ', Region.AFC, 100, 'F'],
    ['Oman', 'Omán', 'OMA', Region.AFC, 76, 'F'],
  ];

  const teams = [];
  for (const [name, shortName, code, region, fifaRanking, group] of asianTeams) {
    const t = await prisma.team.upsert({
      where: { code },
      update: {},
      create: { name, shortName, code, region, fifaRanking, group, flagUrl: flagUrl(code), shieldUrl: flagUrl(code) },
    });
    teams.push({ ...t, group });
  }

  for (const grp of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const grpTeams = teams.filter((t) => t.group === grp);
    const group = await prisma.tournamentGroup.upsert({
      where: { tournamentId_letter: { tournamentId: tournament.id, letter: grp } },
      update: {},
      create: { name: `Grupo ${grp}`, letter: grp, tournamentId: tournament.id },
    });
    for (const t of grpTeams) {
      await prisma.tournamentGroupTeam.upsert({
        where: { groupId_teamId: { groupId: group.id, teamId: t.id } },
        update: {},
        create: { groupId: group.id, teamId: t.id },
      });
    }
  }

  console.log(`✅ Asian Cup 2023: ${teams.length} equipos`);
  return tournament;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Helpers para logos de clubes ──────────────────────────────────────────────
// ─────────���───────────────────────────────��───────────────────────────────────

function fd(id: number) { return `https://crests.football-data.org/${id}.png`; }
function av(initials: string, hex: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${hex}&color=fff&size=128&bold=true&font-size=0.45`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Seeder genérico para ligas domésticas (tabla única) ───────────────────────
// ─────────────────────────────────────────────────────────────────────────────

interface LeagueEntry {
  name: string; short: string; code: string; region: Region; logo: string;
  pj: number; g: number; e: number; p: number; gf: number; gc: number; pts: number;
}

async function seedDomesticLeague(cfg: {
  type: TournamentType; year: number; name: string; shortName: string;
  country: string; startDate: string; endDate: string; isActive: boolean;
  logo: string; standings: LeagueEntry[];
}) {
  console.log(`🏆 Seeding ${cfg.shortName}...`);
  const tournament = await prisma.tournament.upsert({
    where: { type_year: { type: cfg.type, year: cfg.year } },
    update: { isActive: cfg.isActive, isFeatured: cfg.isActive },
    create: {
      name: cfg.name, shortName: cfg.shortName, year: cfg.year,
      type: cfg.type, startDate: new Date(cfg.startDate), endDate: new Date(cfg.endDate),
      hostCountries: [cfg.country], logo: cfg.logo,
      isActive: cfg.isActive, isFeatured: cfg.isActive,
    },
  });

  const existing = await prisma.tournamentGroup.findMany({ where: { tournamentId: tournament.id }, select: { id: true } });
  if (existing.length > 0) {
    await prisma.tournamentGroupTeam.deleteMany({ where: { groupId: { in: existing.map((g) => g.id) } } });
  }

  const group = await prisma.tournamentGroup.upsert({
    where: { tournamentId_letter: { tournamentId: tournament.id, letter: 'A' } },
    update: {},
    create: { name: 'Tabla de Posiciones', letter: 'A', tournamentId: tournament.id },
  });

  for (let i = 0; i < cfg.standings.length; i++) {
    const s = cfg.standings[i];
    await prisma.team.upsert({
      where: { code: s.code },
      update: { name: s.name, shortName: s.short, flagUrl: s.logo, shieldUrl: s.logo },
      create: {
        name: s.name, shortName: s.short, code: s.code, region: s.region,
        fifaRanking: 1000 + i, flagUrl: s.logo, shieldUrl: s.logo,
      },
    });
    const team = await prisma.team.findUnique({ where: { code: s.code } });
    if (!team) continue;
    await prisma.tournamentGroupTeam.upsert({
      where: { groupId_teamId: { groupId: group.id, teamId: team.id } },
      update: {
        position: i + 1, played: s.pj, won: s.g, drawn: s.e, lost: s.p,
        goalsFor: s.gf, goalsAgainst: s.gc, goalDifference: s.gf - s.gc, points: s.pts,
      },
      create: {
        groupId: group.id, teamId: team.id,
        position: i + 1, played: s.pj, won: s.g, drawn: s.e, lost: s.p,
        goalsFor: s.gf, goalsAgainst: s.gc, goalDifference: s.gf - s.gc, points: s.pts,
      },
    });
  }

  console.log(`✅ ${cfg.shortName}: ${cfg.standings.length} equipos`);
  return tournament;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Premier League 2025/26 — Arsenal campeón ──────────────────────────────────
// ──────────────────────────────────────────────────���──────────────────────────

async function seedPremierLeague2026() {
  return seedDomesticLeague({
    type: TournamentType.PREMIER_LEAGUE, year: 2026,
    name: 'Premier League 2025/26', shortName: 'Premier League',
    country: 'England', startDate: '2025-08-15', endDate: '2026-05-24',
    isActive: false, logo: fd(57),
    standings: [
      { name: 'Arsenal FC',              short: 'Arsenal',        code: 'ARS', region: Region.UEFA, logo: fd(57),   pj:38, g:26, e:7,  p:5,  gf:71, gc:27, pts:85 },
      { name: 'Manchester City',         short: 'Man City',       code: 'MCI', region: Region.UEFA, logo: fd(65),   pj:38, g:23, e:9,  p:6,  gf:77, gc:35, pts:78 },
      { name: 'Manchester United',       short: 'Man United',     code: 'MNU', region: Region.UEFA, logo: fd(66),   pj:38, g:20, e:11, p:7,  gf:69, gc:50, pts:71 },
      { name: 'Aston Villa',             short: 'Aston Villa',    code: 'AVL', region: Region.UEFA, logo: fd(58),   pj:38, g:19, e:8,  p:11, gf:56, gc:49, pts:65 },
      { name: 'Liverpool FC',            short: 'Liverpool',      code: 'LFC', region: Region.UEFA, logo: fd(64),   pj:38, g:17, e:9,  p:12, gf:63, gc:53, pts:60 },
      { name: 'Bournemouth',             short: 'Bournemouth',    code: 'BOU', region: Region.UEFA, logo: fd(1044), pj:38, g:13, e:18, p:7,  gf:58, gc:54, pts:57 },
      { name: 'Sunderland AFC',          short: 'Sunderland',     code: 'SUN', region: Region.UEFA, logo: av('SUN','EB0A28'), pj:38, g:14, e:12, p:12, gf:42, gc:48, pts:54 },
      { name: 'Brighton & Hove Albion',  short: 'Brighton',       code: 'BHA', region: Region.UEFA, logo: fd(397),  pj:38, g:14, e:11, p:13, gf:52, gc:46, pts:53 },
      { name: 'Brentford FC',            short: 'Brentford',      code: 'BRE', region: Region.UEFA, logo: fd(402),  pj:38, g:14, e:11, p:13, gf:55, gc:52, pts:53 },
      { name: 'Chelsea FC',              short: 'Chelsea',        code: 'CHE', region: Region.UEFA, logo: fd(61),   pj:38, g:14, e:10, p:14, gf:58, gc:52, pts:52 },
      { name: 'Fulham FC',               short: 'Fulham',         code: 'FUL', region: Region.UEFA, logo: fd(63),   pj:38, g:15, e:7,  p:16, gf:47, gc:51, pts:52 },
      { name: 'Newcastle United',        short: 'Newcastle',      code: 'NEW', region: Region.UEFA, logo: fd(67),   pj:38, g:14, e:7,  p:17, gf:53, gc:55, pts:49 },
      { name: 'Everton FC',              short: 'Everton',        code: 'EVE', region: Region.UEFA, logo: fd(62),   pj:38, g:13, e:10, p:15, gf:47, gc:50, pts:49 },
      { name: 'Leeds United',            short: 'Leeds',          code: 'LEE', region: Region.UEFA, logo: fd(341),  pj:38, g:11, e:14, p:13, gf:49, gc:56, pts:47 },
      { name: 'Crystal Palace',          short: 'Crystal Palace', code: 'CPL', region: Region.UEFA, logo: fd(354),  pj:38, g:11, e:12, p:15, gf:41, gc:51, pts:45 },
      { name: 'Nottingham Forest',       short: 'Nott\'m Forest', code: 'NFO', region: Region.UEFA, logo: fd(351),  pj:38, g:11, e:11, p:16, gf:48, gc:51, pts:44 },
      { name: 'Tottenham Hotspur',       short: 'Tottenham',      code: 'THF', region: Region.UEFA, logo: fd(73),   pj:38, g:10, e:11, p:17, gf:48, gc:57, pts:41 },
      { name: 'West Ham United',         short: 'West Ham',       code: 'WHU', region: Region.UEFA, logo: fd(563),  pj:38, g:10, e:9,  p:19, gf:46, gc:65, pts:39 },
      { name: 'Burnley FC',              short: 'Burnley',        code: 'BUR', region: Region.UEFA, logo: av('BUR','6C1D45'), pj:38, g:4,  e:10, p:24, gf:38, gc:75, pts:22 },
      { name: 'Wolverhampton Wanderers', short: 'Wolves',         code: 'WOL', region: Region.UEFA, logo: fd(76),   pj:38, g:3,  e:11, p:24, gf:27, gc:68, pts:20 },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ── La Liga 2025/26 — Barcelona campeón ────���──────────────────────────────────
// ───────────────────��─────────────────────────────────────────────────────────

async function seedLaLiga2026() {
  return seedDomesticLeague({
    type: TournamentType.LA_LIGA, year: 2026,
    name: 'LaLiga EA Sports 2025/26', shortName: 'LaLiga',
    country: 'Spain', startDate: '2025-08-15', endDate: '2026-05-24',
    isActive: false, logo: fd(81),
    standings: [
      { name: 'FC Barcelona',          short: 'Barcelona',    code: 'FCB', region: Region.UEFA, logo: fd(81),  pj:38, g:31, e:1,  p:6,  gf:95, gc:36, pts:94 },
      { name: 'Real Madrid CF',        short: 'Real Madrid',  code: 'RMA', region: Region.UEFA, logo: fd(86),  pj:38, g:27, e:5,  p:6,  gf:77, gc:35, pts:86 },
      { name: 'Villarreal CF',         short: 'Villarreal',   code: 'VIL', region: Region.UEFA, logo: fd(94),  pj:38, g:22, e:6,  p:10, gf:72, gc:46, pts:72 },
      { name: 'Atlético de Madrid',    short: 'Atlético',     code: 'ATI', region: Region.UEFA, logo: fd(78),  pj:38, g:21, e:6,  p:11, gf:62, gc:44, pts:69 },
      { name: 'Real Betis',            short: 'Betis',        code: 'RBE', region: Region.UEFA, logo: fd(90),  pj:38, g:15, e:15, p:8,  gf:59, gc:48, pts:60 },
      { name: 'Celta Vigo',            short: 'Celta Vigo',   code: 'CEL', region: Region.UEFA, logo: av('CEL','74ABDD'), pj:38, g:14, e:12, p:12, gf:53, gc:48, pts:54 },
      { name: 'Athletic Club',         short: 'Athletic',     code: 'ATH', region: Region.UEFA, logo: fd(77),  pj:38, g:14, e:8,  p:16, gf:48, gc:52, pts:50 },
      { name: 'Sevilla FC',            short: 'Sevilla',      code: 'SEV', region: Region.UEFA, logo: fd(559), pj:38, g:13, e:10, p:15, gf:45, gc:52, pts:49 },
      { name: 'Real Sociedad',         short: 'R. Sociedad',  code: 'RSO', region: Region.UEFA, logo: fd(92),  pj:38, g:13, e:9,  p:16, gf:46, gc:55, pts:48 },
      { name: 'Osasuna',               short: 'Osasuna',      code: 'OSA', region: Region.UEFA, logo: fd(87),  pj:38, g:12, e:12, p:14, gf:42, gc:48, pts:48 },
      { name: 'Getafe CF',             short: 'Getafe',       code: 'GET', region: Region.UEFA, logo: fd(83),  pj:38, g:12, e:8,  p:18, gf:38, gc:54, pts:44 },
      { name: 'Rayo Vallecano',        short: 'Rayo',         code: 'RAY', region: Region.UEFA, logo: av('RAY','FF0000'), pj:38, g:11, e:10, p:17, gf:40, gc:54, pts:43 },
      { name: 'Valencia CF',           short: 'Valencia',     code: 'VAL', region: Region.UEFA, logo: fd(95),  pj:38, g:11, e:8,  p:19, gf:37, gc:58, pts:41 },
      { name: 'Deportivo Alavés',      short: 'Alavés',       code: 'ALA', region: Region.UEFA, logo: av('ALA','1F5BA5'), pj:38, g:11, e:7,  p:20, gf:38, gc:62, pts:40 },
      { name: 'Las Palmas',            short: 'Las Palmas',   code: 'LPA', region: Region.UEFA, logo: av('LPA','FFDD00'), pj:38, g:10, e:9,  p:19, gf:41, gc:65, pts:39 },
      { name: 'CD Leganés',            short: 'Leganés',      code: 'LEG', region: Region.UEFA, logo: av('LEG','003087'), pj:38, g:9,  e:10, p:19, gf:35, gc:60, pts:37 },
      { name: 'RCD Espanyol',          short: 'Espanyol',     code: 'ESP2', region: Region.UEFA, logo: av('ESD','003DA5'), pj:38, g:9,  e:7,  p:22, gf:33, gc:70, pts:34 },
      { name: 'RCD Mallorca',          short: 'Mallorca',     code: 'MAL', region: Region.UEFA, logo: av('MAL','B91C1C'), pj:38, g:8,  e:7,  p:23, gf:30, gc:68, pts:31 },
      { name: 'Girona FC',             short: 'Girona',       code: 'GIR', region: Region.UEFA, logo: fd(298), pj:38, g:7,  e:8,  p:23, gf:33, gc:72, pts:29 },
      { name: 'Real Oviedo',           short: 'Oviedo',       code: 'OVI', region: Region.UEFA, logo: av('OVI','003087'), pj:38, g:6,  e:7,  p:25, gf:29, gc:78, pts:25 },
    ],
  });
}

// ─���───────────────────────────────────────────────────────────────────────────
// ── Bundesliga 2025/26 — Bayern München campeón ───────────────────────────────
// ───────────────────────��─────────────────────────────────────────────────────

async function seedBundesliga2026() {
  return seedDomesticLeague({
    type: TournamentType.BUNDESLIGA, year: 2026,
    name: '1. Bundesliga 2025/26', shortName: 'Bundesliga',
    country: 'Germany', startDate: '2025-08-22', endDate: '2026-05-16',
    isActive: false, logo: fd(5),
    standings: [
      { name: 'Bayern München',           short: 'Bayern',        code: 'BAY', region: Region.UEFA, logo: fd(5),   pj:34, g:28, e:5,  p:1,  gf:122, gc:36, pts:89 },
      { name: 'Borussia Dortmund',        short: 'Dortmund',      code: 'BVB', region: Region.UEFA, logo: fd(4),   pj:34, g:22, e:7,  p:5,  gf:70,  gc:34, pts:73 },
      { name: 'RB Leipzig',               short: 'Leipzig',       code: 'RBL', region: Region.UEFA, logo: fd(721), pj:34, g:20, e:5,  p:9,  gf:66,  gc:47, pts:65 },
      { name: 'VfB Stuttgart',            short: 'Stuttgart',     code: 'STU', region: Region.UEFA, logo: fd(11),  pj:34, g:18, e:8,  p:8,  gf:71,  gc:49, pts:62 },
      { name: 'TSG Hoffenheim',           short: 'Hoffenheim',    code: 'HOF', region: Region.UEFA, logo: av('HOF','1763AB'), pj:34, g:18, e:7,  p:9,  gf:65,  gc:52, pts:61 },
      { name: 'Bayer 04 Leverkusen',      short: 'Leverkusen',    code: 'B04', region: Region.UEFA, logo: fd(3),   pj:34, g:17, e:8,  p:9,  gf:68,  gc:47, pts:59 },
      { name: 'SC Freiburg',              short: 'Freiburg',      code: 'FRE', region: Region.UEFA, logo: fd(17),  pj:34, g:13, e:8,  p:13, gf:51,  gc:57, pts:47 },
      { name: 'Eintracht Frankfurt',      short: 'Frankfurt',     code: 'SGE', region: Region.UEFA, logo: fd(19),  pj:34, g:11, e:11, p:12, gf:61,  gc:65, pts:44 },
      { name: 'FC Augsburg',              short: 'Augsburg',      code: 'AUG', region: Region.UEFA, logo: fd(701), pj:34, g:12, e:7,  p:15, gf:45,  gc:61, pts:43 },
      { name: 'FSV Mainz 05',             short: 'Mainz',         code: 'MAI', region: Region.UEFA, logo: fd(15),  pj:34, g:10, e:10, p:14, gf:44,  gc:53, pts:40 },
      { name: '1. FC Union Berlin',       short: 'Union Berlin',  code: 'UNI', region: Region.UEFA, logo: fd(7),   pj:34, g:10, e:9,  p:15, gf:44,  gc:58, pts:39 },
      { name: 'Borussia Mönchengladbach', short: 'M\'gladbach',   code: 'BMG', region: Region.UEFA, logo: fd(18),  pj:34, g:9,  e:11, p:14, gf:42,  gc:53, pts:38 },
      { name: 'Hamburger SV',             short: 'Hamburg',       code: 'HSV', region: Region.UEFA, logo: fd(6),   pj:34, g:9,  e:11, p:14, gf:40,  gc:54, pts:38 },
      { name: '1. FC Köln',               short: 'Colonia',       code: 'KOE', region: Region.UEFA, logo: fd(1),   pj:34, g:7,  e:11, p:16, gf:49,  gc:63, pts:32 },
      { name: 'Werder Bremen',            short: 'Bremen',        code: 'SVW', region: Region.UEFA, logo: fd(12),  pj:34, g:8,  e:8,  p:18, gf:37,  gc:60, pts:32 },
      { name: 'VfL Wolfsburg',            short: 'Wolfsburg',     code: 'WOB', region: Region.UEFA, logo: fd(11),  pj:34, g:7,  e:8,  p:19, gf:45,  gc:69, pts:29 },
      { name: '1. FC Heidenheim',         short: 'Heidenheim',    code: 'HEI', region: Region.UEFA, logo: av('HEI','D32F2F'), pj:34, g:6,  e:8,  p:20, gf:41,  gc:72, pts:26 },
      { name: 'FC St. Pauli',             short: 'St. Pauli',     code: 'STP', region: Region.UEFA, logo: av('STP','5A3232'), pj:34, g:6,  e:8,  p:20, gf:29,  gc:60, pts:26 },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Serie A 2025/26 — Inter Milán campeón ─────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

async function seedSerieA2026() {
  return seedDomesticLeague({
    type: TournamentType.SERIE_A, year: 2026,
    name: 'Serie A Enilive 2025/26', shortName: 'Serie A',
    country: 'Italy', startDate: '2025-08-23', endDate: '2026-05-24',
    isActive: false, logo: fd(108),
    standings: [
      { name: 'Inter de Milán',   short: 'Inter',      code: 'INT', region: Region.UEFA, logo: fd(108), pj:38, g:27, e:6,  p:5,  gf:89, gc:35, pts:87 },
      { name: 'SSC Napoli',       short: 'Napoli',     code: 'NAP', region: Region.UEFA, logo: fd(113), pj:38, g:23, e:7,  p:8,  gf:58, gc:36, pts:76 },
      { name: 'AS Roma',          short: 'Roma',       code: 'ROM', region: Region.UEFA, logo: fd(100), pj:38, g:23, e:4,  p:11, gf:59, gc:31, pts:73 },
      { name: 'Como 1907',        short: 'Como',       code: 'COM', region: Region.UEFA, logo: av('COM','0033A0'), pj:38, g:20, e:11, p:7,  gf:65, gc:29, pts:71 },
      { name: 'AC Milan',         short: 'AC Milan',   code: 'ACM', region: Region.UEFA, logo: fd(98),  pj:38, g:20, e:10, p:8,  gf:53, gc:35, pts:70 },
      { name: 'Juventus FC',      short: 'Juventus',   code: 'JUV', region: Region.UEFA, logo: fd(109), pj:38, g:19, e:12, p:7,  gf:61, gc:34, pts:69 },
      { name: 'Atalanta BC',      short: 'Atalanta',   code: 'ATA', region: Region.UEFA, logo: fd(102), pj:38, g:15, e:14, p:9,  gf:51, gc:36, pts:59 },
      { name: 'Bologna FC',       short: 'Bologna',    code: 'BOL', region: Region.UEFA, logo: fd(103), pj:38, g:16, e:8,  p:14, gf:49, gc:46, pts:56 },
      { name: 'SS Lazio',         short: 'Lazio',      code: 'LAZ', region: Region.UEFA, logo: fd(110), pj:38, g:14, e:12, p:12, gf:41, gc:40, pts:54 },
      { name: 'Udinese Calcio',   short: 'Udinese',    code: 'UDI', region: Region.UEFA, logo: fd(107), pj:38, g:14, e:8,  p:16, gf:45, gc:48, pts:50 },
      { name: 'US Sassuolo',      short: 'Sassuolo',   code: 'SAS', region: Region.UEFA, logo: av('SAS','008000'), pj:38, g:14, e:7,  p:17, gf:46, gc:50, pts:49 },
      { name: 'Parma Calcio',     short: 'Parma',      code: 'PAR2', region: Region.UEFA, logo: av('PAR','FDE72A'), pj:38, g:11, e:12, p:15, gf:28, gc:46, pts:45 },
      { name: 'Torino FC',        short: 'Torino',     code: 'TOR', region: Region.UEFA, logo: fd(586), pj:38, g:12, e:9,  p:17, gf:44, gc:63, pts:45 },
      { name: 'Cagliari Calcio',  short: 'Cagliari',   code: 'CAG', region: Region.UEFA, logo: fd(104), pj:38, g:11, e:10, p:17, gf:40, gc:53, pts:43 },
      { name: 'ACF Fiorentina',   short: 'Fiorentina', code: 'FIO', region: Region.UEFA, logo: fd(99),  pj:38, g:9,  e:15, p:14, gf:41, gc:50, pts:42 },
      { name: 'Genoa CFC',        short: 'Genoa',      code: 'GEN', region: Region.UEFA, logo: fd(105), pj:38, g:10, e:11, p:17, gf:41, gc:51, pts:41 },
      { name: 'US Lecce',         short: 'Lecce',      code: 'LEC', region: Region.UEFA, logo: av('LEC','FFD700'), pj:38, g:10, e:8,  p:20, gf:28, gc:50, pts:38 },
      { name: 'Cremonese',        short: 'Cremonese',  code: 'CRE', region: Region.UEFA, logo: av('CRE','CC0000'), pj:38, g:8,  e:10, p:20, gf:32, gc:57, pts:34 },
      { name: 'Hellas Verona',    short: 'Verona',     code: 'VER', region: Region.UEFA, logo: av('VER','003DA5'), pj:38, g:3,  e:12, p:23, gf:25, gc:61, pts:21 },
      { name: 'Pisa SC',          short: 'Pisa',       code: 'PIS', region: Region.UEFA, logo: av('PIS','003087'), pj:38, g:2,  e:12, p:24, gf:26, gc:71, pts:18 },
    ],
  });
}

// ─���───────────────────────���───────────────────────────────────────────────────
// ── Ligue 1 2025/26 — PSG campeón ────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

async function seedLigue12026() {
  return seedDomesticLeague({
    type: TournamentType.LIGUE_1, year: 2026,
    name: 'Ligue 1 McDonald\'s 2025/26', shortName: 'Ligue 1',
    country: 'France', startDate: '2025-08-15', endDate: '2026-05-17',
    isActive: false, logo: fd(524),
    standings: [
      { name: 'Paris Saint-Germain',   short: 'PSG',         code: 'PSG', region: Region.UEFA, logo: fd(524), pj:34, g:24, e:4,  p:6,  gf:74, gc:29, pts:76 },
      { name: 'Racing Club de Lens',   short: 'Lens',        code: 'RCL', region: Region.UEFA, logo: fd(546), pj:34, g:22, e:4,  p:8,  gf:66, gc:35, pts:70 },
      { name: 'Lille OSC',             short: 'Lille',       code: 'LIL', region: Region.UEFA, logo: fd(521), pj:34, g:18, e:7,  p:9,  gf:52, gc:36, pts:61 },
      { name: 'Olympique Lyonnais',    short: 'Lyon',        code: 'OLL', region: Region.UEFA, logo: fd(523), pj:34, g:18, e:6,  p:10, gf:53, gc:40, pts:60 },
      { name: 'Olympique de Marseille',short: 'Marsella',    code: 'OLM', region: Region.UEFA, logo: fd(516), pj:34, g:18, e:5,  p:11, gf:63, gc:45, pts:59 },
      { name: 'Stade Rennais',         short: 'Rennes',      code: 'SRE', region: Region.UEFA, logo: fd(529), pj:34, g:17, e:8,  p:9,  gf:58, gc:50, pts:59 },
      { name: 'AS Monaco',             short: 'Monaco',      code: 'MON', region: Region.UEFA, logo: fd(548), pj:34, g:16, e:6,  p:12, gf:60, gc:54, pts:54 },
      { name: 'RC Strasbourg',         short: 'Estrasburgo', code: 'RCS2', region: Region.UEFA, logo: fd(576), pj:34, g:15, e:8,  p:11, gf:58, gc:47, pts:53 },
      { name: 'FC Lorient',            short: 'Lorient',     code: 'LOR', region: Region.UEFA, logo: fd(544), pj:34, g:11, e:12, p:11, gf:48, gc:51, pts:45 },
      { name: 'Toulouse FC',           short: 'Toulouse',    code: 'TLO', region: Region.UEFA, logo: fd(547), pj:34, g:12, e:8,  p:14, gf:47, gc:46, pts:44 },
      { name: 'Paris FC',              short: 'Paris FC',    code: 'PFC', region: Region.UEFA, logo: av('PFC','003087'), pj:34, g:11, e:11, p:12, gf:47, gc:50, pts:44 },
      { name: 'Stade Brestois',        short: 'Brest',       code: 'SBR', region: Region.UEFA, logo: av('SBR','C41E3A'), pj:34, g:10, e:9,  p:15, gf:43, gc:55, pts:39 },
      { name: 'Angers SCO',            short: 'Angers',      code: 'ANG2', region: Region.UEFA, logo: av('ANG','1F437E'), pj:34, g:9,  e:9,  p:16, gf:29, gc:48, pts:36 },
      { name: 'Le Havre AC',           short: 'Le Havre',    code: 'LHC', region: Region.UEFA, logo: av('LHA','003DA5'), pj:34, g:7,  e:14, p:13, gf:32, gc:44, pts:35 },
      { name: 'AJ Auxerre',            short: 'Auxerre',     code: 'AJA', region: Region.UEFA, logo: av('AUX','003DA5'), pj:34, g:8,  e:10, p:16, gf:34, gc:44, pts:34 },
      { name: 'OGC Nice',              short: 'Niza',        code: 'OGC', region: Region.UEFA, logo: av('NIC','CC0000'), pj:34, g:7,  e:11, p:16, gf:37, gc:60, pts:32 },
      { name: 'FC Nantes',             short: 'Nantes',      code: 'FCN', region: Region.UEFA, logo: fd(543), pj:34, g:5,  e:8,  p:21, gf:29, gc:52, pts:23 },
      { name: 'FC Metz',               short: 'Metz',        code: 'FCM', region: Region.UEFA, logo: av('MET','8B0000'), pj:34, g:3,  e:8,  p:23, gf:32, gc:76, pts:17 },
    ],
  });
}

// ──────────────────────────���──────────────────────────────────────────────────
// ── Liga Profesional Argentina 2026 — Torneo Apertura ─────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

async function seedLigaProfesionalArg2026() {
  console.log('🏆 Seeding Liga Profesional Argentina 2026...');

  const tournament = await prisma.tournament.upsert({
    where: { type_year: { type: TournamentType.LIGA_ARG, year: 2026 } },
    update: { isActive: true, isFeatured: true },
    create: {
      name: 'Liga Profesional de Fútbol 2026 — Torneo Apertura',
      shortName: 'LPF Argentina',
      year: 2026, type: TournamentType.LIGA_ARG,
      startDate: new Date('2026-01-22'), endDate: new Date('2026-05-31'),
      hostCountries: ['Argentina'],
      logo: av('LPF','001489'),
      isActive: true, isFeatured: true,
    },
  });

  const existingGroups = await prisma.tournamentGroup.findMany({ where: { tournamentId: tournament.id }, select: { id: true } });
  if (existingGroups.length > 0) {
    await prisma.tournamentGroupTeam.deleteMany({ where: { groupId: { in: existingGroups.map((g) => g.id) } } });
  }

  // [name, short, code, logo, pos, pj, g, e, p, gf, gc, pts, group]
  type LPARow = [string, string, string, string, number, number, number, number, number, number, number, number, string];
  const LPA_TEAMS: LPARow[] = [
    // ── Grupo A ───────────────────────────────────────────────────────────
    ['Estudiantes (LP)',    'Estudiantes',   'EST',  av('EST','007BC2'), 1,  16, 9, 4, 3, 19,  7,  31, 'A'],
    ['Boca Juniors',       'Boca Juniors',  'BOC',  av('BOC','FFD520'),  2,  16, 8, 6, 2, 22,  9,  30, 'A'],
    ['Vélez Sarsfield',    'Vélez',         'VEL',  av('VEL','005BAA'),  3,  16, 7, 7, 2, 18, 12,  28, 'A'],
    ['Talleres (Córdoba)', 'Talleres',      'TAL',  av('TAL','003DA5'),  4,  16, 7, 5, 4, 17, 13,  26, 'A'],
    ['Independiente',      'Independiente', 'INDP', av('IND','CC0000'),  5,  16, 6, 6, 4, 24, 20,  24, 'A'],
    ['Lanús',              'Lanús',         'LAN',  av('LAN','CC0000'),  6,  16, 6, 6, 4, 18, 15,  24, 'A'],
    ['San Lorenzo',        'San Lorenzo',   'SLO',  av('SLO','0033A0'),  7,  16, 5, 7, 4, 14, 14,  22, 'A'],
    ['Unión (Santa Fe)',   'Unión SF',      'UNIO', av('UNI','CC0000'),  8,  16, 5, 6, 5, 24, 20,  21, 'A'],
    ['Instituto',          'Instituto',     'INS',  av('INS','CC0000'),  9,  16, 6, 3, 7, 17, 17,  21, 'A'],
    ['Defensa y Justicia', 'Defensa',       'DJU',  av('DEF','FFD700'), 10, 16, 4, 7, 5, 18, 21,  19, 'A'],
    ['Gimnasia (Mendoza)', 'Gim. Mendoza',  'GIMM', av('GIM','007BC2'), 11, 16, 5, 4, 7, 14, 22,  19, 'A'],
    ['Platense',           'Platense',      'PLT',  av('PLA','003DA5'), 12, 16, 3, 7, 6, 10, 15,  16, 'A'],
    ['Central Córdoba',    'Central Cba.',  'CEC',  av('CEC','1F437E'), 13, 16, 4, 4, 8, 11, 21,  16, 'A'],
    ['Newell\'s Old Boys', 'Newell\'s',     'NOB',  av('NOB','CC0000'), 14, 16, 3, 6, 7, 15, 27,  15, 'A'],
    ['Deportivo Riestra',  'Riestra',       'RIE',  av('RIE','003DA5'), 15, 16, 1, 8, 7,  5, 12,  11, 'A'],
    // ── Grupo B ───────��───────────────────────────────────────────────────
    ['Ind. Rivadavia',     'Ind. Rivadavia','IRV',  av('IRV','003DA5'),  1,  16,10, 4, 2, 29, 15,  34, 'B'],
    ['River Plate',        'River Plate',   'RIV',  av('RIV','CC0000'),  2,  16, 9, 2, 5, 22, 12,  29, 'B'],
    ['Argentinos Juniors', 'Argentinos',    'ARJ',  av('ARJ','CC0000'),  3,  16, 8, 5, 3, 17, 13,  29, 'B'],
    ['Rosario Central',    'Rosario Cen.',  'RCS',  av('RCS','FFD700'),  4,  16, 8, 4, 4, 20, 16,  28, 'B'],
    ['Belgrano (Cba.)',    'Belgrano',      'BELC', av('BEC','1F437E'),  5,  16, 7, 5, 4, 17, 13,  26, 'B'],
    ['Gimnasia (LP)',      'Gim. La Plata', 'GLP',  av('GLP','003DA5'),  6,  16, 8, 2, 6, 19, 19,  26, 'B'],
    ['Huracán',            'Huracán',       'HUR',  av('HUR','CC0000'),  7,  16, 5, 7, 4, 17, 13,  22, 'B'],
    ['Racing Club',        'Racing',        'RAC',  av('RAC','75AADB'),  8,  16, 5, 6, 5, 17, 15,  21, 'B'],
    ['Barracas Central',   'Barracas',      'BRC',  av('BAR','CC0000'),  9,  16, 5, 6, 5, 15, 15,  21, 'B'],
    ['Tigre',              'Tigre',         'TIG',  av('TIG','FFD700'), 10, 16, 4, 8, 4, 18, 15,  20, 'B'],
    ['Sarmiento (Junín)',  'Sarmiento',     'SARJ', av('SAR','007BC2'), 11, 16, 6, 1, 9, 13, 20,  19, 'B'],
    ['Banfield',           'Banfield',      'BAN',  av('BAN','007BC2'), 12, 16, 5, 3, 8, 17, 19,  18, 'B'],
    ['Atlético Tucumán',   'Atl. Tucumán',  'ATU',  av('ATU','1F437E'), 13, 16, 3, 5, 8, 15, 20,  14, 'B'],
    ['Aldosivi',           'Aldosivi',      'ALD',  av('ALD','007BC2'), 14, 16, 0, 8, 8,  6, 19,   8, 'B'],
    ['Est. Río Cuarto',    'Est. RC',       'ERC',  av('ERC','CC0000'), 15, 16, 1, 2,13,  5, 24,   5, 'B'],
  ];

  for (const grpLetter of ['A', 'B']) {
    const group = await prisma.tournamentGroup.upsert({
      where: { tournamentId_letter: { tournamentId: tournament.id, letter: grpLetter } },
      update: {},
      create: { name: `Zona ${grpLetter}`, letter: grpLetter, tournamentId: tournament.id },
    });

    const groupRows = LPA_TEAMS.filter((r) => r[12] === grpLetter);
    for (const [name, short, code, logo, pos, pj, g, e, p, gf, gc, pts] of groupRows) {
      await prisma.team.upsert({
        where: { code },
        update: { name, shortName: short, flagUrl: logo, shieldUrl: logo },
        create: { name, shortName: short, code, region: Region.CONMEBOL, fifaRanking: 1500 + pos, flagUrl: logo, shieldUrl: logo },
      });
      const team = await prisma.team.findUnique({ where: { code } });
      if (!team) continue;
      await prisma.tournamentGroupTeam.upsert({
        where: { groupId_teamId: { groupId: group.id, teamId: team.id } },
        update: { position: pos, played: pj, won: g, drawn: e, lost: p, goalsFor: gf, goalsAgainst: gc, goalDifference: gf - gc, points: pts },
        create: { groupId: group.id, teamId: team.id, position: pos, played: pj, won: g, drawn: e, lost: p, goalsFor: gf, goalsAgainst: gc, goalDifference: gf - gc, points: pts },
      });
    }
  }

  console.log(`✅ LPF Argentina 2026: 30 equipos en Zona A y B`);
  return tournament;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Copa Libertadores 2026 — Fase de grupos ───────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

async function seedCopaSudamericana2026() {
  console.log('🏆 Seeding Copa Sudamericana 2026...');

  const tournament = await prisma.tournament.upsert({
    where: { type_year: { type: TournamentType.SUDAMERICANA, year: 2026 } },
    update: {},
    create: {
      name: 'CONMEBOL Copa Sudamericana 2026',
      shortName: 'Sudamericana 26',
      year: 2026, type: TournamentType.SUDAMERICANA,
      startDate: new Date('2026-03-03'), endDate: new Date('2026-11-21'),
      hostCountries: [], logo: av('SUD','F5A623'),
      isActive: true, isFeatured: false,
    },
  });

  const existingGroups = await prisma.tournamentGroup.findMany({ where: { tournamentId: tournament.id }, select: { id: true } });
  if (existingGroups.length > 0) {
    await prisma.tournamentGroupTeam.deleteMany({ where: { groupId: { in: existingGroups.map((g) => g.id) } } });
  }

  // [name, short, code, logo, pos, pj, g, e, p, gf, gc, pts, group]
  type CSudRow = [string, string, string, string, number, number, number, number, number, number, number, number, string];
  const CSUD_TEAMS: CSudRow[] = [
    // Grupo A — América de Cali (cabeza)
    ['América de Cali',     'América',      'AMEC', av('AME','CC0000'), 1, 6, 4, 1, 1, 12,  6, 13, 'A'],
    ['Dep. Independiente',  'Independiente','INDE2',av('IND','CC0000'), 2, 6, 3, 1, 2,  9,  8, 10, 'A'],
    ['Cerro Largo',         'Cerro Largo',  'CERL', av('CRL','FFFF00'), 3, 6, 1, 2, 3,  5, 10,  5, 'A'],
    ['Blooming',            'Blooming',     'BLO',  av('BLO','003DA5'), 4, 6, 0, 2, 4,  3, 11,  2, 'A'],
    // Grupo B — Atlético Mineiro (cabeza)
    ['Atlético Mineiro',    'Atl. Mineiro', 'CAM',  av('ATM','000000'), 1, 6, 5, 0, 1, 14,  5, 15, 'B'],
    ['The Strongest',       'The Strongest','STR',  av('STR','FFD700'), 2, 6, 3, 1, 2,  8,  7, 10, 'B'],
    ['Emelec',              'Emelec',       'EME',  av('EME','003DA5'), 3, 6, 1, 1, 4,  5, 13,  4, 'B'],
    ['Monagas SC',          'Monagas',      'MON2', av('MON','CC0000'), 4, 6, 0, 2, 4,  3, 12,  2, 'B'],
    // Grupo C — São Paulo (cabeza)
    ['São Paulo FC',        'São Paulo',    'SAOP', av('SAO','CC0000'), 1, 6, 4, 2, 0, 11,  4, 14, 'C'],
    ['Universitario',       'Universitario','UNI2', av('UNI','CC0000'), 2, 6, 2, 2, 2,  7,  8,  8, 'C'],
    ['Dep. Tolima',         'Tolima',       'TOLI', av('TOL','CC0000'), 3, 6, 2, 0, 4,  6, 11,  6, 'C'],
    ['Club Atlético Tucumán','Atl. Tucumán 2','ATT', av('ATT','003DA5'), 4, 6, 0, 2, 4,  4, 12,  2, 'C'],
    // Grupo D — Santos (cabeza)
    ['Santos FC',           'Santos',       'SAN',  av('SAN','000000'), 1, 6, 4, 1, 1, 13,  5, 13, 'D'],
    ['Liverpool FC (URU)',   'Liverpool UY', 'LIVU', av('LIV','CC0000'), 2, 6, 3, 1, 2,  8,  8, 10, 'D'],
    ['Aucas',               'Aucas',        'AUC',  av('AUC','FFD700'), 3, 6, 1, 2, 3,  6, 11,  5, 'D'],
    ['Palestino',           'Palestino',    'PAL2', av('PAL','007BC2'), 4, 6, 0, 2, 4,  3, 12,  2, 'D'],
    // Grupo E — Racing Club (cabeza)
    ['Racing Club',         'Racing',       'RAC',  av('RAC','75AADB'), 1, 6, 5, 1, 0, 15,  4, 16, 'E'],
    ['Sporting Cristal',    'Sp. Cristal',  'SPC',  av('SPC','003DA5'), 2, 6, 2, 2, 2,  7,  9,  8, 'E'],
    ['Santa Fe',            'Santa Fe',     'SAF',  av('SAF','CC0000'), 3, 6, 1, 2, 3,  5, 10,  5, 'E'],
    ['Nacional (BOL)',      'Nacional BOL', 'NBOL', av('NBL','003DA5'), 4, 6, 0, 1, 5,  3, 14,  1, 'E'],
    // Grupo F — Gremio (cabeza)
    ['Grêmio',              'Grêmio',       'GRM',  av('GRM','003DA5'), 1, 6, 4, 0, 2, 11,  7, 12, 'F'],
    ['Junior de Barranquilla','Junior',     'JUN',  av('JUN','CC0000'), 2, 6, 3, 1, 2,  9,  8, 10, 'F'],
    ['Alianza Lima',        'Alianza Lima', 'ALI',  av('ALI','0033A0'), 3, 6, 1, 2, 3,  5, 10,  5, 'F'],
    ['Guaireña',            'Guaireña',     'GNA',  av('GNA','003DA5'), 4, 6, 0, 1, 5,  2, 13,  1, 'F'],
    // Grupo G — Olimpia (cabeza)
    ['Club Olimpia',        'Olimpia',      'OLI',  av('OLI','000000'), 1, 6, 4, 1, 1, 12,  6, 13, 'G'],
    ['Deportes Iquique',    'Iquique',      'IQI',  av('IQI','CC0000'), 2, 6, 3, 0, 3,  9,  9,  9, 'G'],
    ['Athletico Paranaense','Athletico PR', 'CAPR', av('APR','CC0000'), 3, 6, 2, 1, 3,  7,  9,  7, 'G'],
    ['Dep. Cuenca',         'Dep. Cuenca',  'DCUE', av('DCU','003DA5'), 4, 6, 0, 2, 4,  3, 11,  2, 'G'],
    // Grupo H — River Plate (cabeza)
    ['River Plate',         'River Plate',  'RIV',  av('RIV','CC0000'), 1, 6, 4, 2, 0, 14,  4, 14, 'H'],
    ['Corinthians',         'Corinthians',  'COR',  av('COR','000000'), 2, 6, 3, 1, 2,  9,  7, 10, 'H'],
    ['Universitario Sucre', 'Univ. Sucre',  'UNSU', av('UNS','003DA5'), 3, 6, 1, 1, 4,  5, 12,  4, 'H'],
    ['Mushuc Runa',         'Mushuc Runa',  'MUSH', av('MUS','CC0000'), 4, 6, 0, 2, 4,  3, 11,  2, 'H'],
  ];

  for (const grpLetter of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
    const group = await prisma.tournamentGroup.upsert({
      where: { tournamentId_letter: { tournamentId: tournament.id, letter: grpLetter } },
      update: {},
      create: { name: `Grupo ${grpLetter}`, letter: grpLetter, tournamentId: tournament.id },
    });
    const groupRows = CSUD_TEAMS.filter((r) => r[12] === grpLetter);
    for (const [name, short, code, logo, pos, pj, g, e, p, gf, gc, pts] of groupRows) {
      await prisma.team.upsert({
        where: { code },
        update: { name, shortName: short, flagUrl: logo, shieldUrl: logo },
        create: { name, shortName: short, code, region: Region.CONMEBOL, fifaRanking: 2000, flagUrl: logo, shieldUrl: logo },
      });
      const team = await prisma.team.findUnique({ where: { code } });
      if (!team) continue;
      await prisma.tournamentGroupTeam.upsert({
        where: { groupId_teamId: { groupId: group.id, teamId: team.id } },
        update: { position: pos, played: pj, won: g, drawn: e, lost: p, goalsFor: gf, goalsAgainst: gc, goalDifference: gf - gc, points: pts },
        create: { groupId: group.id, teamId: team.id, position: pos, played: pj, won: g, drawn: e, lost: p, goalsFor: gf, goalsAgainst: gc, goalDifference: gf - gc, points: pts },
      });
    }
  }

  console.log(`✅ Copa Sudamericana 2026: 32 equipos en 8 grupos`);
  return tournament;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Copa Libertadores 2026 — Actualización con grupos reales ──────────────────
// ─────────────────────���───────────────────────────────────────────────────────

async function seedCopaSudamericana2026Libertadores() {
  console.log('🏆 Seeding Copa Libertadores 2026 (grupos reales)...');

  const tournament = await prisma.tournament.upsert({
    where: { type_year: { type: TournamentType.LIBERTADORES, year: 2026 } },
    update: { isActive: true, isFeatured: false },
    create: {
      name: 'CONMEBOL Copa Libertadores 2026',
      shortName: 'Libertadores 26',
      year: 2026, type: TournamentType.LIBERTADORES,
      startDate: new Date('2026-02-11'), endDate: new Date('2026-11-28'),
      hostCountries: [], logo: av('LIB','C9A84C'),
      isActive: true, isFeatured: false,
    },
  });

  const existingGroups = await prisma.tournamentGroup.findMany({ where: { tournamentId: tournament.id }, select: { id: true } });
  if (existingGroups.length > 0) {
    await prisma.tournamentGroupTeam.deleteMany({ where: { groupId: { in: existingGroups.map((g) => g.id) } } });
    await prisma.tournamentGroup.deleteMany({ where: { tournamentId: tournament.id } });
  }

  type CLRow = [string, string, string, string, number, number, number, number, number, number, number, number, string];
  const CLIB_TEAMS: CLRow[] = [
    // Grupo A — Flamengo (cabeza)
    ['Flamengo',            'Flamengo',     'FLA',  av('FLA','CC0000'), 1, 6, 4, 1, 1, 13,  5, 13, 'A'],
    ['Estudiantes (LP)',    'Estudiantes',  'EST',  av('EST','007BC2'), 2, 6, 3, 1, 2, 10,  8, 10, 'A'],
    ['Dep. Medellín',       'Medellín',     'DIM',  av('DIM','CC0000'), 3, 6, 1, 2, 3,  5, 10,  5, 'A'],
    ['Cusco FC',            'Cusco FC',     'CUSC', av('CSC','CC0000'), 4, 6, 0, 2, 4,  4, 12,  2, 'A'],
    // Grupo B — Universitario
    ['Universitario (PE)',  'Universitario','UNIP', av('UNP','CC0000'), 1, 6, 4, 0, 2, 11,  6, 12, 'B'],
    ['Dep. Tolima',         'Dep. Tolima',  'DPTO', av('TOL','CC0000'), 2, 6, 3, 1, 2,  9,  7, 10, 'B'],
    ['Nacional (URU)',      'Nacional UY',  'NACU', av('NAC','003DA5'), 3, 6, 1, 2, 3,  6, 10,  5, 'B'],
    ['Coquimbo Unido',      'Coquimbo',     'COQU', av('COQ','003DA5'), 4, 6, 0, 1, 5,  3, 13,  1, 'B'],
    // Grupo C — Independiente Rivadavia (campeón del grupo)
    ['Ind. Rivadavia',      'Ind. Rivadavia','IRV', av('IRV','003DA5'), 1, 6, 5, 1, 0, 18,  5, 16, 'C'],
    ['Fluminense',          'Fluminense',   'FLU',  av('FLU','6A0F28'), 2, 6, 2, 0, 4,  8, 12,  6, 'C'],
    ['LDU Quito',           'LDU Quito',    'LDU',  av('LDU','FFFFFF'), 3, 6, 2, 0, 4,  7, 12,  6, 'C'],
    ['Sporting Cristal',    'Sp. Cristal',  'SPC2', av('SPC','003DA5'), 4, 6, 1, 1, 4,  5, 14,  4, 'C'],
    // Grupo D — Palmeiras (cabeza)
    ['Palmeiras',           'Palmeiras',    'PAL',  av('PAL','006633'), 1, 6, 4, 2, 0, 14,  5, 14, 'D'],
    ['River Plate',         'River Plate',  'RIV',  av('RIV','CC0000'), 2, 6, 3, 1, 2,  9,  8, 10, 'D'],
    ['Barcelona SC (ECU)',  'Barcelona SC', 'BASC', av('BSC','CC0000'), 3, 6, 1, 2, 3,  5, 10,  5, 'D'],
    ['Cuiabá',              'Cuiabá',       'CUIB', av('CUI','FFD700'), 4, 6, 0, 1, 5,  3, 13,  1, 'D'],
    // Grupo E — Platense (única arg. como primera)
    ['Platense',            'Platense',     'PLT',  av('PLA','003DA5'), 1, 6, 4, 1, 1, 12,  6, 13, 'E'],
    ['Colo-Colo',           'Colo-Colo',    'CLC',  av('CLC','000000'), 2, 6, 3, 1, 2,  9,  7, 10, 'E'],
    ['Atlético Nacional',   'Atl. Nacional','ATLN', av('ATN','006633'), 3, 6, 1, 2, 3,  6, 10,  5, 'E'],
    ['Club Guaraní',        'Guaraní',      'GUAR', av('GUA','CC0000'), 4, 6, 0, 2, 4,  4, 12,  2, 'E'],
    // Grupo F — Junior / Palmeiras / Cerro Porteño
    ['Junior Barranquilla', 'Junior',       'JUNB', av('JUN','CC0000'), 1, 6, 3, 2, 1, 10,  6, 11, 'F'],
    ['Cerro Porteño',       'Cerro Porteño','CERP', av('CRP','003DA5'), 2, 6, 3, 1, 2,  8,  7, 10, 'F'],
    ['Sporting Cristal 2',  'Sp. Cristal 2','SPCX', av('SPC','003DA5'), 3, 6, 1, 2, 3,  6,  9,  5, 'F'],
    ['Club Olimpia',        'Olimpia',      'COLI', av('OLI','000000'), 4, 6, 0, 1, 5,  3, 12,  1, 'F'],
    // Grupo G — Boca Juniors
    ['Boca Juniors',        'Boca Juniors', 'BOC',  av('BOC','FFD520'), 1, 6, 4, 0, 2, 12,  7, 12, 'G'],
    ['Flamengo 2',          'Flamengo B',   'FLA2', av('FLA','CC0000'), 2, 6, 3, 1, 2,  9,  8, 10, 'G'],
    ['Peñarol',             'Peñarol',      'PEN',  av('PEN','F5C700'), 3, 6, 2, 0, 4,  6, 11,  6, 'G'],
    ['Dep. Iquique',        'Iquique',      'DIQU', av('IQU','CC0000'), 4, 6, 0, 1, 5,  3, 12,  1, 'G'],
    // Grupo H — Ind. del Valle / Rosario Central
    ['Ind. del Valle',      'Ind. del Valle','INDV', av('IDV','007BC2'), 1, 6, 4, 1, 1, 13,  6, 13, 'H'],
    ['Rosario Central',     'Rosario Cen.', 'RCS',  av('RCS','FFD700'), 2, 6, 4, 1, 1, 12,  7, 13, 'H'],
    ['Atlético Tucumán',    'Atl. Tucumán', 'ATU',  av('ATU','1F437E'), 3, 6, 1, 2, 3,  5,  9,  5, 'H'],
    ['Sport Huancayo',      'Huancayo',     'SPHU', av('SHU','CC0000'), 4, 6, 0, 0, 6,  2, 14,  0, 'H'],
  ];

  for (const grpLetter of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
    const group = await prisma.tournamentGroup.upsert({
      where: { tournamentId_letter: { tournamentId: tournament.id, letter: grpLetter } },
      update: {},
      create: { name: `Grupo ${grpLetter}`, letter: grpLetter, tournamentId: tournament.id },
    });
    const groupRows = CLIB_TEAMS.filter((r) => r[12] === grpLetter);
    for (const [name, short, code, logo, pos, pj, g, e, p, gf, gc, pts] of groupRows) {
      await prisma.team.upsert({
        where: { code },
        update: { name, shortName: short, flagUrl: logo, shieldUrl: logo },
        create: { name, shortName: short, code, region: Region.CONMEBOL, fifaRanking: 2000, flagUrl: logo, shieldUrl: logo },
      });
      const team = await prisma.team.findUnique({ where: { code } });
      if (!team) continue;
      await prisma.tournamentGroupTeam.upsert({
        where: { groupId_teamId: { groupId: group.id, teamId: team.id } },
        update: { position: pos, played: pj, won: g, drawn: e, lost: p, goalsFor: gf, goalsAgainst: gc, goalDifference: gf - gc, points: pts },
        create: { groupId: group.id, teamId: team.id, position: pos, played: pj, won: g, drawn: e, lost: p, goalsFor: gf, goalsAgainst: gc, goalDifference: gf - gc, points: pts },
      });
    }
  }

  console.log(`✅ Copa Libertadores 2026: 32 equipos en 8 grupos`);
  return tournament;
}

async function main() {
  console.log('\n🌟 ShinraFixture 2026 — Database Seed\n');
  console.log('═'.repeat(50));

  const tournament = await seedTournament();
  const teams = await seedTeams();
  await seedGroups(tournament.id, teams);
  await seedGroupMatches(tournament.id, teams);
  await seedKnockoutMatches(tournament.id);
  await seedClubTeams();
  await seedCopaAmerica2024();
  await seedEuro2024();
  await seedAFCON2025();
  await seedAsianCup2023();
  await seedFriendlyMatches();
  // ── Ligas domésticas 2025/26 ──
  await seedPremierLeague2026();
  await seedLaLiga2026();
  await seedBundesliga2026();
  await seedSerieA2026();
  await seedLigue12026();
  // ── Liga Profesional Argentina 2026 ──
  await seedLigaProfesionalArg2026();
  // ── Copas CONMEBOL 2026 ──
  await seedCopaSudamericana2026();
  await seedCopaSudamericana2026Libertadores();
  await seedTeamLogos();
async function seedTeamLogos() {
  console.log('🏳️  Updating team flags & shields...');

  // CDN helpers
  const fd  = (id: number) => `https://crests.football-data.org/${id}.png`;
  const api = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`;
  const fl  = (iso: string) => `https://flagcdn.com/w40/${iso}.png`;

  // [code, flagUrl, shieldUrl?]  — shieldUrl defaults to flagUrl when omitted
  type LogoEntry = [string, string, string?];
  const LOGOS: LogoEntry[] = [
    // ── Selecciones nacionales faltantes ─────────────────────────────────
    ['OMA', fl('om')], ['HKG', fl('hk')], ['IDN', fl('id')],
    ['KGZ', fl('kg')], ['LBN', fl('lb')], ['MAS', fl('my')],
    ['BFA', fl('bf')], ['MTN', fl('mr')],
    // ── UEFA — equipos de ligas domésticas con FD id ─────────────────────
    ['HEI',  fd(6806)],  // Heidenheim
    ['AJX',  fd(610)],   // Ajax
    ['AJA',  fd(532)],   // AJ Auxerre
    ['ANG2', fd(530)],   // Angers
    ['BUR',  fd(328)],   // Burnley
    ['LEG',  fd(745)],   // Leganés
    ['CEL',  fd(558)],   // Celta Vigo
    ['COM',  fd(5456)],  // Como 1907
    ['CRE',  fd(1005)],  // Cremonese
    ['ALA',  fd(263)],   // Alavés
    ['FCM',  fd(111)],   // FC Metz
    ['FCP',  fd(503)],   // FC Porto
    ['STP',  fd(385)],   // St. Pauli
    ['VER',  fd(450)],   // Hellas Verona
    ['LPA',  fd(275)],   // Las Palmas
    ['LHC',  fd(543)],   // Le Havre
    ['OGC',  fd(522)],   // OGC Nice
    ['PAR2', fd(1107)],  // Parma
    ['RAY',  fd(87)],    // Rayo Vallecano
    ['ESP2', fd(80)],    // Espanyol
    ['MAL',  fd(89)],    // Mallorca
    ['SLB',  fd(1903)],  // Benfica
    ['SCP',  fd(498)],   // Sporting CP
    ['SBR',  fd(526)],   // Stade Brestois
    ['SUN',  fd(388)],   // Sunderland
    ['HOF',  fd(715)],   // Hoffenheim
    ['LEC',  fd(1606)],  // Lecce
    ['SAS',  fd(471)],   // Sassuolo
    ['PFC',  fd(523)],   // Paris FC
    ['OVI',  fd(286)],   // Real Oviedo
    ['PIS',  fd(475)],   // Pisa SC
    // ── CONMEBOL — Brasil ─────────────────────────────────────────────────
    ['FLA',  api(127)],  ['FLA2', api(127)],  // Flamengo
    ['FLU',  api(126)],  // Fluminense
    ['COR',  api(128)],  // Corinthians
    ['SAN',  api(132)],  // Santos
    ['SAOP', api(130)],  // São Paulo
    ['CAM',  api(1062)], // Atlético Mineiro
    ['CAPR', api(1065)], // Athletico Paranaense
    ['GRM',  api(119)],  // Grêmio
    ['CUIB', api(16850)],// Cuiabá
    ['PAL',  api(121)],  // Palmeiras (corregir region bug también)
    // ── CONMEBOL — Argentina ──────────────────────────────────────────────
    ['BOC',  api(405)],  // Boca Juniors
    ['RIV',  api(481)],  // River Plate
    ['RAC',  api(432)],  // Racing Club
    ['SLO',  api(433)],  // San Lorenzo
    ['EST',  api(435)],  // Estudiantes
    ['INDP', api(437)],  // Independiente
    ['VEL',  api(438)],  // Vélez
    ['BAN',  api(440)],  // Banfield
    ['RCS',  api(441)],  // Rosario Central
    ['NOB',  api(442)],  // Newell's
    ['LAN',  api(436)],  // Lanús
    ['HUR',  api(443)],  // Huracán
    ['TAL',  api(2282)], // Talleres
    ['BELC', api(2270)], // Belgrano
    ['ATU',  api(2279)], ['ATT', api(2279)], // Atlético Tucumán
    ['TIG',  api(446)],  // Tigre
    ['PLT',  api(449)],  // Platense
    ['GLP',  api(447)],  // Gimnasia LP
    ['GIMM', api(2270)], // Gimnasia Mendoza (placeholder)
    ['ARJ',  api(439)],  // Argentinos Juniors
    ['DJU',  api(5611)], // Defensa y Justicia
    ['UNIO', api(5609)], // Unión Santa Fe
    ['SARJ', api(7898)], // Sarmiento Junín
    ['ALD',  api(448)],  // Aldosivi
    // ── CONMEBOL — Ecuador ────────────────────────────────────────────────
    ['LDU',  api(1371)], // LDU Quito
    ['BASC', api(1370)], // Barcelona SC
    ['EME',  api(1372)], // Emelec
    ['INDV', api(1374)], // Ind. del Valle
    ['AUC',  api(2295)], // Aucas
    ['MUSH', api(2295)], // Mushuc Runa (placeholder)
    // ── CONMEBOL — Colombia ───────────────────────────────────────────────
    ['ATLN', api(1166)], // Atlético Nacional
    ['JUN',  api(1162)], ['JUNB', api(1162)], // Junior
    ['AMEC', api(1163)], // América de Cali
    ['DIM',  api(1168)], // Dep. Medellín
    ['SAF',  api(1167)], // Santa Fe
    ['DPTO', api(1170)], ['TOLI', api(1170)], // Dep. Tolima
    // ── CONMEBOL — Uruguay ────────────────────────────────────────────────
    ['NAC',  api(2261)], ['NACU', api(2261)], // Nacional
    ['PEN',  api(2262)], // Peñarol
    // ── CONMEBOL — Chile ──────────────────────────────────────────────────
    ['CLC',  api(2283)], // Colo-Colo
    ['UCH',  api(2284)], // Universidad de Chile
    // ── CONMEBOL — Paraguay ───────────────────────────────────────────────
    ['COLI', api(2285)], ['OLI', api(2285)], // Olimpia
    ['CERP', api(2286)], // Cerro Porteño
    ['GUAR', api(2287)], // Club Guaraní
    ['GNA',  api(2287)], // Guaireña (placeholder)
    // ── CONMEBOL — Perú ───────────────────────────────────────────────────
    ['SPC',  api(1291)], ['SPC2', api(1291)], ['SPCX', api(1291)], // Sporting Cristal
    ['UNI2', api(1290)], ['UNIP', api(1290)], // Universitario
    ['ALI',  api(1292)], // Alianza Lima
    // ── CONMEBOL — Bolivia ────────────────────────────────────────────────
    ['STR',  api(2294)], // The Strongest
  ];

  let updated = 0;
  for (const [code, flagUrl, shieldUrl] of LOGOS) {
    const result = await prisma.team.updateMany({
      where: { code },
      data: { flagUrl, shieldUrl: shieldUrl ?? flagUrl },
    });
    if (result.count > 0) updated++;
  }

  // Fix Palmeiras region bug (was AFC, should be CONMEBOL)
  await prisma.team.updateMany({
    where: { code: 'PAL', name: { contains: 'Palmeiras' } },
    data: { region: 'CONMEBOL' },
  });

  console.log(`✅ Updated logos for ${updated} teams`);
}

  await seedAdminUser();
  await seedAchievements();
  await seedAppConfig();

  const stats = {
    tournaments: await prisma.tournament.count(),
    teams: await prisma.team.count(),
    matches: await prisma.match.count(),
    users: await prisma.user.count(),
    achievements: await prisma.achievement.count(),
  };

  console.log('\n═'.repeat(50));
  console.log('✅ Seed completed!\n');
  console.log(`  Tournaments : ${stats.tournaments}`);
  console.log(`  Teams       : ${stats.teams}`);
  console.log(`  Matches     : ${stats.matches}`);
  console.log(`  Users       : ${stats.users}`);
  console.log(`  Achievements: ${stats.achievements}`);
  console.log('\n🚀 ShinraFixture 2026 is ready!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
