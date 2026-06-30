import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 16 partidos reales de los 16vos de final (Round of 32) según ESPN
// Fechas en UTC, equipos por código FIFA
const R32_MATCHES = [
  // Ronda 73 — 28 jun (JUGADO: RSA 0-1 CAN)
  {
    round: 73,
    homeCode: 'RSA', awayCode: 'CAN',
    matchDate: '2026-06-28T17:00:00Z',
    venue: 'SoFi Stadium', city: 'Los Angeles', country: 'United States',
    status: 'FINISHED', homeScore: 0, awayScore: 1,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 74 — 29 jun 17:00 UTC (JUGADO: BRA 2-1 JPN)
  {
    round: 74,
    homeCode: 'BRA', awayCode: 'JPN',
    matchDate: '2026-06-29T17:00:00Z',
    venue: 'NRG Stadium', city: 'Houston', country: 'United States',
    status: 'FINISHED', homeScore: 2, awayScore: 1,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 75 — 29 jun 20:30 UTC (JUGADO: GER 1-1 PAR, 3-4 penales)
  {
    round: 75,
    homeCode: 'GER', awayCode: 'PAR',
    matchDate: '2026-06-29T20:30:00Z',
    venue: 'Gillette Stadium', city: 'Boston', country: 'United States',
    status: 'FINISHED', homeScore: 1, awayScore: 1,
    homePenalties: 3, awayPenalties: 4,
  },
  // Ronda 76 — 30 jun 01:00 UTC (JUGADO: NED 1-1 MAR, 2-3 penales)
  {
    round: 76,
    homeCode: 'NED', awayCode: 'MAR',
    matchDate: '2026-06-30T01:00:00Z',
    venue: 'Estadio BBVA', city: 'Monterrey', country: 'Mexico',
    status: 'FINISHED', homeScore: 1, awayScore: 1,
    homePenalties: 2, awayPenalties: 3,
  },
  // Ronda 77 — 30 jun 17:00 UTC
  {
    round: 77,
    homeCode: 'CIV', awayCode: 'NOR',
    matchDate: '2026-06-30T17:00:00Z',
    venue: 'AT&T Stadium', city: 'Dallas', country: 'United States',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 78 — 30 jun 21:00 UTC
  {
    round: 78,
    homeCode: 'FRA', awayCode: 'SWE',
    matchDate: '2026-06-30T21:00:00Z',
    venue: 'MetLife Stadium', city: 'East Rutherford', country: 'United States',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 79 — 01 jul 01:00 UTC
  {
    round: 79,
    homeCode: 'MEX', awayCode: 'ECU',
    matchDate: '2026-07-01T01:00:00Z',
    venue: 'Estadio Azteca', city: 'Ciudad de México', country: 'Mexico',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 80 — 01 jul 16:00 UTC
  {
    round: 80,
    homeCode: 'ENG', awayCode: 'COD',
    matchDate: '2026-07-01T16:00:00Z',
    venue: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'United States',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 81 — 01 jul 20:00 UTC
  {
    round: 81,
    homeCode: 'BEL', awayCode: 'SEN',
    matchDate: '2026-07-01T20:00:00Z',
    venue: 'Lumen Field', city: 'Seattle', country: 'United States',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 82 — 02 jul 00:00 UTC
  {
    round: 82,
    homeCode: 'USA', awayCode: 'BIH',
    matchDate: '2026-07-02T00:00:00Z',
    venue: "Levi's Stadium", city: 'San Francisco', country: 'United States',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 83 — 02 jul 19:00 UTC
  {
    round: 83,
    homeCode: 'ESP', awayCode: 'AUT',
    matchDate: '2026-07-02T19:00:00Z',
    venue: 'SoFi Stadium', city: 'Los Angeles', country: 'United States',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 84 — 02 jul 23:00 UTC
  {
    round: 84,
    homeCode: 'POR', awayCode: 'CRO',
    matchDate: '2026-07-02T23:00:00Z',
    venue: 'BMO Field', city: 'Toronto', country: 'Canada',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 85 — 03 jul 03:00 UTC
  {
    round: 85,
    homeCode: 'SUI', awayCode: 'ALG',
    matchDate: '2026-07-03T03:00:00Z',
    venue: 'BC Place', city: 'Vancouver', country: 'Canada',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 86 — 03 jul 18:00 UTC
  {
    round: 86,
    homeCode: 'AUS', awayCode: 'EGY',
    matchDate: '2026-07-03T18:00:00Z',
    venue: 'AT&T Stadium', city: 'Dallas', country: 'United States',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 87 — 03 jul 22:00 UTC
  {
    round: 87,
    homeCode: 'ARG', awayCode: 'CPV',
    matchDate: '2026-07-03T22:00:00Z',
    venue: 'Hard Rock Stadium', city: 'Miami', country: 'United States',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
  // Ronda 88 — 04 jul 01:30 UTC
  {
    round: 88,
    homeCode: 'COL', awayCode: 'GHA',
    matchDate: '2026-07-04T01:30:00Z',
    venue: 'Arrowhead Stadium', city: 'Kansas City', country: 'United States',
    status: 'SCHEDULED', homeScore: null, awayScore: null,
    homePenalties: null, awayPenalties: null,
  },
];

async function main() {
  console.log('🔄 Actualizando 16vos de final con equipos reales...');

  for (const m of R32_MATCHES) {
    // Buscar los equipos por código
    const homeTeam = await prisma.team.findUnique({ where: { code: m.homeCode } });
    const awayTeam = await prisma.team.findUnique({ where: { code: m.awayCode } });

    if (!homeTeam) { console.warn(`⚠ Equipo no encontrado: ${m.homeCode}`); continue; }
    if (!awayTeam) { console.warn(`⚠ Equipo no encontrado: ${m.awayCode}`); continue; }

    // Buscar el partido por round number
    const match = await prisma.match.findFirst({
      where: { stage: 'ROUND_OF_32', round: m.round },
    });

    if (!match) { console.warn(`⚠ Partido R32 round ${m.round} no encontrado en DB`); continue; }

    await prisma.match.update({
      where: { id: match.id },
      data: {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeLabel: homeTeam.code,
        awayLabel: awayTeam.code,
        matchDate: new Date(m.matchDate),
        venue: m.venue,
        city: m.city,
        country: m.country,
        status: m.status as any,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homePenalties: m.homePenalties ?? null,
        awayPenalties: m.awayPenalties ?? null,
      },
    });

    console.log(`✅ Round ${m.round}: ${homeTeam.name} vs ${awayTeam.name} (${m.matchDate.slice(0, 10)})`);
  }

  console.log('\n✅ 16vos de final actualizados correctamente.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
