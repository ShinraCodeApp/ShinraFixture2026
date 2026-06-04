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
  // WC 2026 nuevos
  QAT: 'qa', HTI: 'ht', SCO: 'gb-sct', CUW: 'cw', NOR: 'no',
  WPD: 'un', WPA: 'un', WPC: 'un', WPB: 'un', WP1: 'un', WP2: 'un',
  // Copa América / Euro extras
  JAM: 'jm', BOL: 'bo', HUN: 'hu', ALB: 'al', SVN: 'si', SVK: 'sk', ROU: 'ro',
  UKR: 'ua', GEO: 'ge', CZE: 'cz',
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
const TEAMS_CLEAN: Array<[string, string, string, Region, number, string]> = [
  // Group A — Mexico (host)
  ['Mexico', 'México', 'MEX', Region.CONCACAF, 15, 'A'],
  ['South Africa', 'Sudáfrica', 'RSA', Region.CAF, 67, 'A'],
  ['Korea Republic', 'Corea del Sur', 'KOR', Region.AFC, 22, 'A'],
  ['Play-off D', 'Play-off D', 'WPD', Region.CONCACAF, 120, 'A'],

  // Group B — Canada (host)
  ['Canada', 'Canadá', 'CAN', Region.CONCACAF, 47, 'B'],
  ['Play-off A', 'Play-off A', 'WPA', Region.AFC, 120, 'B'],
  ['Qatar', 'Qatar', 'QAT', Region.AFC, 37, 'B'],
  ['Switzerland', 'Suiza', 'SUI', Region.UEFA, 19, 'B'],

  // Group C — Brazil
  ['Brazil', 'Brasil', 'BRA', Region.CONMEBOL, 5, 'C'],
  ['Morocco', 'Marruecos', 'MAR', Region.CAF, 14, 'C'],
  ['Haiti', 'Haití', 'HTI', Region.CONCACAF, 85, 'C'],
  ['Scotland', 'Escocia', 'SCO', Region.UEFA, 39, 'C'],

  // Group D — USA (host)
  ['United States', 'USA', 'USA', Region.CONCACAF, 13, 'D'],
  ['Paraguay', 'Paraguay', 'PAR', Region.CONMEBOL, 56, 'D'],
  ['Australia', 'Australia', 'AUS', Region.AFC, 23, 'D'],
  ['Play-off C', 'Play-off C', 'WPC', Region.OFC, 120, 'D'],

  // Group E — Germany
  ['Germany', 'Alemania', 'GER', Region.UEFA, 16, 'E'],
  ['Curacao', 'Curaçao', 'CUW', Region.CONCACAF, 110, 'E'],
  ['Ivory Coast', 'Costa de Marfil', 'CIV', Region.CAF, 30, 'E'],
  ['Ecuador', 'Ecuador', 'ECU', Region.CONMEBOL, 44, 'E'],

  // Group F — Netherlands
  ['Netherlands', 'Países Bajos', 'NED', Region.UEFA, 7, 'F'],
  ['Japan', 'Japón', 'JPN', Region.AFC, 17, 'F'],
  ['Play-off B', 'Play-off B', 'WPB', Region.CAF, 120, 'F'],
  ['Tunisia', 'Túnez', 'TUN', Region.CAF, 35, 'F'],

  // Group G — Belgium
  ['Belgium', 'Bélgica', 'BEL', Region.UEFA, 3, 'G'],
  ['Egypt', 'Egipto', 'EGY', Region.CAF, 34, 'G'],
  ['Iran', 'Irán', 'IRN', Region.AFC, 21, 'G'],
  ['New Zealand', 'Nueva Zelanda', 'NZL', Region.OFC, 100, 'G'],

  // Group H — Spain
  ['Spain', 'España', 'ESP', Region.UEFA, 8, 'H'],
  ['Cabo Verde', 'Cabo Verde', 'CPV', Region.CAF, 80, 'H'],
  ['Saudi Arabia', 'Arabia Saudita', 'KSA', Region.AFC, 58, 'H'],
  ['Uruguay', 'Uruguay', 'URU', Region.CONMEBOL, 18, 'H'],

  // Group I — France
  ['France', 'Francia', 'FRA', Region.UEFA, 2, 'I'],
  ['Senegal', 'Senegal', 'SEN', Region.CAF, 20, 'I'],
  ['Play-off 2', 'Play-off 2', 'WP2', Region.CONMEBOL, 120, 'I'],
  ['Norway', 'Noruega', 'NOR', Region.UEFA, 32, 'I'],

  // Group J — Argentina
  ['Argentina', 'Argentina', 'ARG', Region.CONMEBOL, 1, 'J'],
  ['Algeria', 'Argelia', 'ALG', Region.CAF, 37, 'J'],
  ['Austria', 'Austria', 'AUT', Region.UEFA, 25, 'J'],
  ['Jordan', 'Jordania', 'JOR', Region.AFC, 87, 'J'],

  // Group K — Portugal
  ['Portugal', 'Portugal', 'POR', Region.UEFA, 6, 'K'],
  ['Play-off 1', 'Play-off 1', 'WP1', Region.CONMEBOL, 120, 'K'],
  ['Uzbekistan', 'Uzbekistán', 'UZB', Region.AFC, 63, 'K'],
  ['Colombia', 'Colombia', 'COL', Region.CONMEBOL, 12, 'K'],

  // Group L — England
  ['England', 'Inglaterra', 'ENG', Region.UEFA, 4, 'L'],
  ['Croatia', 'Croacia', 'CRO', Region.UEFA, 10, 'L'],
  ['Ghana', 'Ghana', 'GHA', Region.CAF, 60, 'L'],
  ['Panama', 'Panamá', 'PAN', Region.CONCACAF, 51, 'L'],
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
      update: { fifaRanking, group, flagUrl: flagUrl(code) },
      create: {
        name,
        shortName,
        code,
        region,
        fifaRanking,
        group,
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

  for (const letter of groupLetters) {
    const group = await prisma.tournamentGroup.upsert({
      where: { tournamentId_letter: { tournamentId, letter } },
      update: {},
      create: { tournamentId, name: `Grupo ${letter}`, letter },
    });

    const groupTeams = teams.filter((t) => t.group === letter);
    for (const team of groupTeams) {
      await prisma.tournamentGroupTeam.upsert({
        where: { groupId_teamId: { groupId: group.id, teamId: team.id } },
        update: {},
        create: {
          groupId: group.id,
          teamId: team.id,
          played: 0, won: 0, drawn: 0, lost: 0,
          goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        },
      });
    }
  }

  console.log('✅ Groups created');
}

async function seedGroupMatches(tournamentId: string, teams: any[]) {
  console.log('📅 Creating group stage matches...');
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  // WC 2026 starts June 11, 2026
  const startDate = new Date('2026-06-11');
  let matchDay = 0;
  let matchCount = 0;

  // Venues distributed across USA, Canada, Mexico
  const venues = [
    { venue: 'SoFi Stadium', city: 'Los Angeles', country: 'United States' },
    { venue: 'MetLife Stadium', city: 'New York', country: 'United States' },
    { venue: 'AT&T Stadium', city: 'Dallas', country: 'United States' },
    { venue: 'Arrowhead Stadium', city: 'Kansas City', country: 'United States' },
    { venue: 'Levi\'s Stadium', city: 'San Francisco', country: 'United States' },
    { venue: 'Hard Rock Stadium', city: 'Miami', country: 'United States' },
    { venue: 'NRG Stadium', city: 'Houston', country: 'United States' },
    { venue: 'Lincoln Financial Field', city: 'Philadelphia', country: 'United States' },
    { venue: 'Gillette Stadium', city: 'Boston', country: 'United States' },
    { venue: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico' },
    { venue: 'Estadio Guadalajara', city: 'Guadalajara', country: 'Mexico' },
    { venue: 'BMO Field', city: 'Toronto', country: 'Canada' },
    { venue: 'BC Place', city: 'Vancouver', country: 'Canada' },
  ];

  for (const letter of groupLetters) {
    const groupTeams = teams.filter((t) => t.group === letter);
    if (groupTeams.length !== 4) continue;

    // Round-robin: 6 matches per group
    const matchups = [
      [0, 1], [2, 3], // Matchday 1
      [0, 2], [1, 3], // Matchday 2
      [0, 3], [1, 2], // Matchday 3
    ];

    for (let md = 0; md < 3; md++) {
      const dayOffset = (matchDay * 2 + md) * 1; // space out matches
      const matchDate = new Date(startDate);
      matchDate.setDate(startDate.getDate() + matchDay + md * 2);
      matchDate.setHours(18, 0, 0, 0);

      const pair1 = matchups[md * 2];
      const pair2 = matchups[md * 2 + 1];
      const venueIdx = (matchCount) % venues.length;

      await prisma.match.create({
        data: {
          tournamentId,
          homeTeamId: groupTeams[pair1[0]].id,
          awayTeamId: groupTeams[pair1[1]].id,
          stage: 'GROUP',
          group: letter,
          round: md + 1,
          matchDate: new Date(matchDate.getTime()),
          ...venues[venueIdx],
          status: 'SCHEDULED',
        },
      });

      matchDate.setHours(21, 0, 0, 0);
      await prisma.match.create({
        data: {
          tournamentId,
          homeTeamId: groupTeams[pair2[0]].id,
          awayTeamId: groupTeams[pair2[1]].id,
          stage: 'GROUP',
          group: letter,
          round: md + 1,
          matchDate: new Date(matchDate.getTime()),
          ...venues[(venueIdx + 1) % venues.length],
          status: 'SCHEDULED',
        },
      });

      matchCount += 2;
    }

    matchDay += 3;
  }

  console.log(`✅ Created ${matchCount} group stage matches`);
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

async function main() {
  console.log('\n🌟 ShinraFixture 2026 — Database Seed\n');
  console.log('═'.repeat(50));

  const tournament = await seedTournament();
  const teams = await seedTeams();
  await seedGroups(tournament.id, teams);
  await seedGroupMatches(tournament.id, teams);
  await seedClubTeams();
  await seedCopaAmerica2024();
  await seedEuro2024();
  await seedAFCON2025();
  await seedAsianCup2023();
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
