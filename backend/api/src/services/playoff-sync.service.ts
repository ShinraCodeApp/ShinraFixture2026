import axios from 'axios';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// Maps placeholder codes to their slot descriptions
const PLAYOFF_SLOTS: Record<string, string> = {
  WPA: 'Play-off A', WPB: 'Play-off B', WPC: 'Play-off C',
  WPD: 'Play-off D', WP1: 'Play-off 1', WP2: 'Play-off 2',
};

// Maps known WC 2026 playoff team names (football-data.org) → ISO 2-letter code
const FLAG_ISO: Record<string, string> = {
  'Venezuela': 've', 'Chile': 'cl', 'Peru': 'pe', 'Bolivia': 'bo',
  'Honduras': 'hn', 'Costa Rica': 'cr', 'Trinidad and Tobago': 'tt',
  'Fiji': 'fj', 'Papua New Guinea': 'pg', 'New Caledonia': 'nc',
  'Kenya': 'ke', 'Congo': 'cg', 'Zimbabwe': 'zw',
  'Indonesia': 'id', 'Malaysia': 'my', 'Thailand': 'th',
  'Bahrain': 'bh', 'Iraq': 'iq',
};

// Maps football-data.org team name → our placeholder code
// Populated once we know which team won each playoff
const PLAYOFF_RESOLUTION: Record<string, string> = {
  // These are updated when results are known.
  // football-data.org uses the resolved team name once playoffs are played.
  // WPD (CONCACAF Play-off D) — Group A with Mexico
  // WPA (AFC Play-off A) — Group B with Canada
  // WPC (OFC/inter-conf Play-off C) — Group D with USA
  // WPB (CAF Play-off B) — Group F with Netherlands
  // WP2 (CONMEBOL Play-off 2) — Group I with France
  // WP1 (CONMEBOL Play-off 1) — Group K with Portugal
};

export class PlayoffSyncService {
  // Called by app on startup and optionally by cron
  static async syncWC2026Playoffs(): Promise<{ updated: string[]; pending: string[] }> {
    const updated: string[] = [];
    const pending: string[] = [];

    // Get current placeholder teams (only those still showing "Play-off X")
    const playoffTeams = await prisma.team.findMany({
      where: { code: { in: Object.keys(PLAYOFF_SLOTS) } },
    });

    const stillPending = playoffTeams.filter((t) => t.name.includes('Play-off'));

    if (stillPending.length === 0) {
      logger.info('All playoff slots already resolved');
      return { updated: [], pending: [] };
    }

    // 1️⃣ First: try manual config in DB (highest priority — admin can set these)
    const manualConfig = await prisma.appConfig.findMany({
      where: { key: { startsWith: 'playoff_' } },
    });

    const resolvedByManual = new Set<string>();
    for (const cfg of manualConfig) {
      const code = cfg.key.replace('playoff_', '').toUpperCase();
      const data = cfg.value as any;
      if (data?.name && PLAYOFF_SLOTS[code] && stillPending.some((t) => t.code === code)) {
        await PlayoffSyncService.resolvePlayoff(code, data);
        updated.push(code);
        resolvedByManual.add(code);
        logger.info(`Playoff resolved from manual config: ${code} → ${data.name}`);
      }
    }

    const remainingPending = stillPending.filter((t) => !resolvedByManual.has(t.code));
    if (remainingPending.length === 0) {
      return { updated, pending };
    }

    // 2️⃣ Second: try football-data.org API
    try {
      const response = await axios.get(
        'https://api.football-data.org/v4/competitions/WC/teams',
        {
          headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY ?? '' },
          timeout: 10000,
        }
      );

      const apiTeams: any[] = response.data?.teams ?? [];

      // Build a set of real team names from the API (non-placeholder)
      const realTeamNames = apiTeams
        .map((t: any) => t.name as string)
        .filter((name) => !name.includes('Play-off') && !name.includes('TBD') && !name.includes('Qualifier'));

      for (const placeholder of remainingPending) {
        // Check our resolution map (updated as playoffs are played)
        const resolvedName = PLAYOFF_RESOLUTION[placeholder.code];
        if (resolvedName && realTeamNames.includes(resolvedName)) {
          const apiTeam = apiTeams.find((t: any) => t.name === resolvedName);
          await PlayoffSyncService.resolvePlayoff(placeholder.code, {
            name: resolvedName,
            shortName: apiTeam?.shortName ?? resolvedName,
            isoCode: FLAG_ISO[resolvedName],
          });
          updated.push(placeholder.code);
        } else {
          pending.push(placeholder.code);
        }
      }

      logger.info(`PlayoffSync via API: ${updated.length} updated, ${pending.length} still pending`);
    } catch (err: any) {
      logger.warn(`PlayoffSync: football-data.org unavailable (${err.message})`);
      // All remaining are still pending
      for (const t of remainingPending) pending.push(t.code);
    }

    return { updated, pending };
  }

  // Resolve a specific play-off slot with the winning team
  static async resolvePlayoff(
    code: string,
    teamData: { name: string; shortName?: string; isoCode?: string }
  ): Promise<void> {
    const isoCode = teamData.isoCode ?? FLAG_ISO[teamData.name] ?? '';
    const flagUrl = isoCode
      ? `https://flagcdn.com/w80/${isoCode}.png`
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(teamData.shortName ?? teamData.name)}&background=6B7280&color=fff&size=128&bold=true`;

    await prisma.team.update({
      where: { code },
      data: {
        name: teamData.name,
        shortName: teamData.shortName ?? teamData.name,
        flagUrl,
        shieldUrl: flagUrl,
      },
    });

    // Also save to app config for persistence
    await prisma.appConfig.upsert({
      where: { key: `playoff_${code.toLowerCase()}` },
      update: { value: { name: teamData.name, shortName: teamData.shortName, isoCode } },
      create: {
        key: `playoff_${code.toLowerCase()}`,
        value: { name: teamData.name, shortName: teamData.shortName, isoCode },
        description: `Resolved playoff slot ${code}`,
      },
    });

    logger.info(`Playoff resolved: ${code} → ${teamData.name}`);
  }

  // Get current status of all playoff slots
  static async getPlayoffStatus(): Promise<Array<{
    code: string; slot: string; resolved: boolean; team: string; flagUrl: string;
  }>> {
    const teams = await prisma.team.findMany({
      where: { code: { in: Object.keys(PLAYOFF_SLOTS) } },
      select: { code: true, name: true, flagUrl: true },
    });

    return Object.entries(PLAYOFF_SLOTS).map(([code, slot]) => {
      const team = teams.find((t) => t.code === code);
      const resolved = team ? !team.name.includes('Play-off') : false;
      return {
        code,
        slot,
        resolved,
        team: team?.name ?? slot,
        flagUrl: team?.flagUrl ?? '',
      };
    });
  }
}
