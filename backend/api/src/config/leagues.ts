import { Region } from '@prisma/client';

/**
 * Ligas y copas que la app sigue (datos de la web pública de ESPN, sin clave).
 * Para sumar una liga: agregar su `type` al enum TournamentType de
 * prisma/schema.prisma y una entrada acá con su slug de ESPN.
 * La temporada (año y nombre) la informa ESPN, así no queda atada a 2026.
 */
export interface LeagueConfig {
  type: string;
  slug: string;
  name: string;
  shortName: string;
  region: Region;
  country: string;
  /** Destacada en la pantalla de inicio */
  featured?: boolean;
}

export const LEAGUES: LeagueConfig[] = [
  // Argentina
  { type: 'LIGA_ARG', slug: 'arg.1', name: 'Liga Profesional Argentina', shortName: 'Liga Argentina', region: Region.CONMEBOL, country: 'Argentina', featured: true },
  { type: 'PRIMERA_NACIONAL', slug: 'arg.2', name: 'Primera Nacional', shortName: 'Primera Nacional', region: Region.CONMEBOL, country: 'Argentina' },
  { type: 'COPA_ARGENTINA', slug: 'arg.copa', name: 'Copa Argentina', shortName: 'Copa Argentina', region: Region.CONMEBOL, country: 'Argentina' },
  // Sudamérica
  { type: 'LIBERTADORES', slug: 'conmebol.libertadores', name: 'Copa Libertadores', shortName: 'Libertadores', region: Region.CONMEBOL, country: 'Sudamérica', featured: true },
  { type: 'SUDAMERICANA', slug: 'conmebol.sudamericana', name: 'Copa Sudamericana', shortName: 'Sudamericana', region: Region.CONMEBOL, country: 'Sudamérica' },
  { type: 'BRASILEIRAO', slug: 'bra.1', name: 'Brasileirão Série A', shortName: 'Brasileirão', region: Region.CONMEBOL, country: 'Brasil' },
  // Europa
  { type: 'PREMIER_LEAGUE', slug: 'eng.1', name: 'Premier League', shortName: 'Premier', region: Region.UEFA, country: 'Inglaterra', featured: true },
  { type: 'LA_LIGA', slug: 'esp.1', name: 'LaLiga', shortName: 'LaLiga', region: Region.UEFA, country: 'España', featured: true },
  { type: 'SERIE_A', slug: 'ita.1', name: 'Serie A', shortName: 'Serie A', region: Region.UEFA, country: 'Italia' },
  { type: 'BUNDESLIGA', slug: 'ger.1', name: 'Bundesliga', shortName: 'Bundesliga', region: Region.UEFA, country: 'Alemania' },
  { type: 'LIGUE_1', slug: 'fra.1', name: 'Ligue 1', shortName: 'Ligue 1', region: Region.UEFA, country: 'Francia' },
  { type: 'EREDIVISIE', slug: 'ned.1', name: 'Eredivisie', shortName: 'Eredivisie', region: Region.UEFA, country: 'Países Bajos' },
  { type: 'PRIMEIRA_LIGA', slug: 'por.1', name: 'Liga Portugal', shortName: 'Liga Portugal', region: Region.UEFA, country: 'Portugal' },
  { type: 'CHAMPIONS_LEAGUE', slug: 'uefa.champions', name: 'UEFA Champions League', shortName: 'Champions', region: Region.UEFA, country: 'Europa', featured: true },
  { type: 'EUROPA_LEAGUE', slug: 'uefa.europa', name: 'UEFA Europa League', shortName: 'Europa League', region: Region.UEFA, country: 'Europa' },
  // Norte y Centroamérica
  { type: 'LIGA_MX', slug: 'mex.1', name: 'Liga MX', shortName: 'Liga MX', region: Region.CONCACAF, country: 'México' },
  { type: 'MLS', slug: 'usa.1', name: 'MLS', shortName: 'MLS', region: Region.CONCACAF, country: 'Estados Unidos' },
];

export const LEAGUE_TYPES = LEAGUES.map((l) => l.type);

export function leagueByType(type: string): LeagueConfig | undefined {
  return LEAGUES.find((l) => l.type === type);
}
