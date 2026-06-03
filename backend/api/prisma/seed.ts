import { PrismaClient, Region, TournamentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── World Cup 2026 Teams (48 teams, 12 groups of 4) ────
// Format: [name, shortName, code, region, fifaRanking, group]
const TEAMS_2026: Array<[string, string, string, Region, number, string]> = [
  // Group A
  ['United States', 'USA', 'USA', Region.CONCACAF, 13, 'A'],
  ['Mexico', 'México', 'MEX', Region.CONCACAF, 15, 'A'],
  ['Panama', 'Panamá', 'PAN', Region.CONCACAF, 51, 'A'],
  ['Bahrain', 'Bahrein', 'BHR', Region.AFC, 89, 'A'],

  // Group B
  ['Brazil', 'Brasil', 'BRA', Region.CONMEBOL, 5, 'B'],
  ['Japan', 'Japón', 'JPN', Region.AFC, 17, 'B'],
  ['South Africa', 'Sudáfrica', 'RSA', Region.CAF, 67, 'B'],
  ['Costa Rica', 'Costa Rica', 'CRC', Region.CONCACAF, 55, 'B'],

  // Group C
  ['Argentina', 'Argentina', 'ARG', Region.CONMEBOL, 1, 'C'],
  ['Chile', 'Chile', 'CHI', Region.CONMEBOL, 38, 'C'],
  ['Morocco', 'Marruecos', 'MAR', Region.CAF, 14, 'C'],
  ['Iraq', 'Iraq', 'IRQ', Region.AFC, 65, 'C'],

  // Group D
  ['France', 'Francia', 'FRA', Region.UEFA, 2, 'D'],
  ['Denmark', 'Dinamarca', 'DEN', Region.UEFA, 21, 'D'],
  ['Ivory Coast', 'Costa de Marfil', 'CIV', Region.CAF, 30, 'D'],
  ['Venezuela', 'Venezuela', 'VEN', Region.CONMEBOL, 52, 'D'],

  // Group E
  ['Spain', 'España', 'ESP', Region.UEFA, 8, 'E'],
  ['Germany', 'Alemania', 'GER', Region.UEFA, 16, 'E'],
  ['Australia', 'Australia', 'AUS', Region.AFC, 23, 'E'],
  ['Peru', 'Perú', 'PER', Region.CONMEBOL, 36, 'E'],

  // Group F
  ['England', 'Inglaterra', 'ENG', Region.UEFA, 4, 'F'],
  ['Portugal', 'Portugal', 'POR', Region.UEFA, 6, 'F'],
  ['Senegal', 'Senegal', 'SEN', Region.CAF, 20, 'F'],
  ['New Zealand', 'Nueva Zelanda', 'NZL', Region.OFC, 100, 'F'],

  // Group G
  ['Netherlands', 'Países Bajos', 'NED', Region.UEFA, 7, 'G'],
  ['Belgium', 'Bélgica', 'BEL', Region.UEFA, 3, 'G'],
  ['Colombia', 'Colombia', 'COL', Region.CONMEBOL, 12, 'G'],
  ['Saudi Arabia', 'Arabia Saudita', 'KSA', Region.AFC, 58, 'G'],

  // Group H
  ['Italy', 'Italia', 'ITA', Region.UEFA, 9, 'H'],
  ['Uruguay', 'Uruguay', 'URU', Region.CONMEBOL, 18, 'H'],
  ['Nigeria', 'Nigeria', 'NGA', Region.CAF, 40, 'H'],
  ['Uzbekistan', 'Uzbekistán', 'UZB', Region.AFC, 63, 'H'],

  // Group I
  ['Croatia', 'Croacia', 'CRO', Region.UEFA, 10, 'I'],
  ['Sweden', 'Suecia', 'SWE', Region.UEFA, 24, 'I'],
  ['Ecuador', 'Ecuador', 'ECU', Region.CONMEBOL, 44, 'I'],
  ['Algeria', 'Argelia', 'ALG', Region.CAF, 37, 'I'],

  // Group J
  ['Portugal', 'Portugal', 'POR2', Region.UEFA, 6, 'J'], // Conflict handled - this would be resolved
  ['Switzerland', 'Suiza', 'SUI', Region.UEFA, 19, 'J'],
  ['Canada', 'Canadá', 'CAN', Region.CONCACAF, 47, 'J'],
  ['Cameroon', 'Camerún', 'CMR', Region.CAF, 42, 'J'],

  // Group K
  ['Turkey', 'Turquía', 'TUR', Region.UEFA, 28, 'K'],
  ['Austria', 'Austria', 'AUT', Region.UEFA, 25, 'K'],
  ['South Korea', 'Corea del Sur', 'KOR', Region.AFC, 22, 'K'],
  ['Paraguay', 'Paraguay', 'PAR', Region.CONMEBOL, 56, 'K'],

  // Group L
  ['Poland', 'Polonia', 'POL', Region.UEFA, 26, 'L'],
  ['Greece', 'Grecia', 'GRE', Region.UEFA, 48, 'L'],
  ['Honduras', 'Honduras', 'HON', Region.CONCACAF, 75, 'L'],
  ['Ghana', 'Ghana', 'GHA', Region.CAF, 60, 'L'],
];

// Group J originally had a duplicate Portugal entry at index 36.
// Replace it with Serbia, keeping the other 3 Group J teams intact.
const TEAMS_CLEAN: typeof TEAMS_2026 = [
  ...TEAMS_2026.slice(0, 36),                                  // Groups A-I (36 teams)
  ['Serbia', 'Serbia', 'SRB', Region.UEFA, 33, 'J'],          // Replaces dup Portugal
  ...TEAMS_2026.slice(37),                                     // Switzerland, Canada, Cameroon + Groups K-L
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
      update: { fifaRanking, group },
      create: {
        name,
        shortName,
        code,
        region,
        fifaRanking,
        group,
        flagUrl: `/assets/flags/${code.toLowerCase()}.png`,
        shieldUrl: `/assets/shields/${code.toLowerCase()}.png`,
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

async function main() {
  console.log('\n🌟 ShinraFixture 2026 — Database Seed\n');
  console.log('═'.repeat(50));

  const tournament = await seedTournament();
  const teams = await seedTeams();
  await seedGroups(tournament.id, teams);
  await seedGroupMatches(tournament.id, teams);
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
