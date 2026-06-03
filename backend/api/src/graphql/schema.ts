import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # ── Enums ──────────────────────────────────────────────
  enum MatchStatus {
    SCHEDULED
    LIVE
    HALF_TIME
    FINISHED
    POSTPONED
    CANCELLED
  }

  enum MatchStage {
    GROUP
    ROUND_OF_32
    ROUND_OF_16
    QUARTER_FINAL
    SEMI_FINAL
    THIRD_PLACE
    FINAL
  }

  enum PlayerPosition {
    GOALKEEPER
    DEFENDER
    MIDFIELDER
    FORWARD
  }

  enum UserRole {
    USER
    PREMIUM
    MODERATOR
    ADMIN
  }

  # ── Types ──────────────────────────────────────────────
  type Team {
    id: ID!
    name: String!
    shortName: String!
    code: String!
    flagUrl: String
    shieldUrl: String
    region: String!
    fifaRanking: Int
    group: String
    isEliminated: Boolean!
    players: [Player!]
    matches(limit: Int): [Match!]
    stats: TeamStats
  }

  type Player {
    id: ID!
    name: String!
    shortName: String
    position: PlayerPosition!
    number: Int
    photoUrl: String
    club: String
    birthDate: DateTime
    nationality: String
    height: Int
    weight: Int
    team: Team!
    stats: PlayerStats
  }

  type Match {
    id: ID!
    homeTeam: Team!
    awayTeam: Team!
    homeScore: Int
    awayScore: Int
    homePenalties: Int
    awayPenalties: Int
    stage: MatchStage!
    group: String
    round: Int
    matchDate: DateTime!
    venue: String
    city: String
    status: MatchStatus!
    minute: Int
    homeWinProb: Float
    drawProb: Float
    awayWinProb: Float
    aiAnalysis: String
    events: [MatchEvent!]
    stats: MatchStats
    userPrediction: Prediction
    tournament: Tournament!
    comments(page: Int, limit: Int): CommentPage!
  }

  type MatchEvent {
    id: ID!
    minute: Int!
    extraTime: Int
    type: String!
    teamId: String
    scorer: Player
    assist: Player
    cardReceiver: Player
    playerIn: Player
    playerOut: Player
    description: String
  }

  type MatchStats {
    homePossession: Float
    awayPossession: Float
    homeShots: Int
    awayShots: Int
    homeShotsOnTarget: Int
    awayShotsOnTarget: Int
    homePasses: Int
    awayPasses: Int
    homePassAccuracy: Float
    awayPassAccuracy: Float
    homeFouls: Int
    awayFouls: Int
    homeCorners: Int
    awayCorners: Int
    homeYellowCards: Int
    awayYellowCards: Int
    homeRedCards: Int
    awayRedCards: Int
    homeXG: Float
    awayXG: Float
  }

  type Tournament {
    id: ID!
    name: String!
    year: Int!
    type: String!
    startDate: DateTime!
    endDate: DateTime!
    hostCountries: [String!]!
    logo: String
    isActive: Boolean!
    matches(stage: MatchStage, group: String, status: MatchStatus): [Match!]
    standings: JSON
  }

  type GroupStanding {
    group: String!
    teams: [GroupTeamStanding!]!
  }

  type GroupTeamStanding {
    team: Team!
    played: Int!
    won: Int!
    drawn: Int!
    lost: Int!
    goalsFor: Int!
    goalsAgainst: Int!
    goalDifference: Int!
    points: Int!
    position: Int
    qualified: Boolean!
  }

  type TeamStats {
    matchesPlayed: Int!
    wins: Int!
    draws: Int!
    losses: Int!
    goalsScored: Int!
    goalsConceded: Int!
    cleanSheets: Int!
    yellowCards: Int!
    redCards: Int!
    avgPossession: Float
  }

  type PlayerStats {
    matchesPlayed: Int!
    goals: Int!
    assists: Int!
    yellowCards: Int!
    redCards: Int!
    avgRating: Float
  }

  type User {
    id: ID!
    username: String!
    displayName: String!
    avatar: String
    bio: String
    country: String
    role: UserRole!
    isPremium: Boolean!
    level: Int!
    xp: Int!
    predictionPoints: Int!
    totalPredictions: Int!
    correctPredictions: Int!
    favoriteTeams: [Team!]
    achievements: [Achievement!]
    predictions(page: Int, limit: Int): PredictionPage
  }

  type Prediction {
    id: ID!
    homeScore: Int!
    awayScore: Int!
    predictedWinner: String
    status: String!
    pointsEarned: Int!
    match: Match
    createdAt: DateTime!
  }

  type PredictionPage {
    items: [Prediction!]!
    pagination: Pagination!
  }

  type Comment {
    id: ID!
    content: String!
    user: User!
    likesCount: Int!
    replies: [Comment!]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CommentPage {
    items: [Comment!]!
    pagination: Pagination!
  }

  type Achievement {
    id: ID!
    name: String!
    description: String!
    icon: String
    xpReward: Int!
    unlockedAt: DateTime
  }

  type AIPrediction {
    homeWinProb: Float!
    drawProb: Float!
    awayWinProb: Float!
    predictedScore: String!
    keyFactors: [String!]!
    aiAnalysis: String!
    confidence: String!
  }

  type RankingEntry {
    rank: Int!
    user: User!
    points: Int!
    correctPredictions: Int!
    totalPredictions: Int!
  }

  type QuinielaGroup {
    id: ID!
    name: String!
    description: String
    inviteCode: String!
    maxMembers: Int!
    isPrivate: Boolean!
    members: [QuinielaGroupMember!]!
    createdAt: DateTime!
  }

  type QuinielaGroupMember {
    user: User!
    role: String!
    totalPoints: Int!
    rank: Int
    joinedAt: DateTime!
  }

  type News {
    id: ID!
    title: String!
    slug: String!
    excerpt: String
    content: String!
    imageUrl: String
    author: String
    category: String
    tags: [String!]!
    isPremium: Boolean!
    isFeatured: Boolean!
    viewsCount: Int!
    publishedAt: DateTime
  }

  type Pagination {
    page: Int!
    limit: Int!
    total: Int!
    pages: Int!
  }

  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
  }

  type TopScorer {
    player: Player!
    goals: Int!
    assists: Int!
    matches: Int!
    team: Team!
  }

  # ── Queries ────────────────────────────────────────────
  type Query {
    # Matches
    matches(tournamentId: ID, group: String, stage: MatchStage, status: MatchStatus, date: String, teamId: ID, page: Int, limit: Int): JSON!
    match(id: ID!): Match
    liveMatches: [Match!]!
    todayMatches: [Match!]!
    upcomingMatches(days: Int): [Match!]!

    # Teams
    teams(region: String, group: String, search: String): [Team!]!
    team(id: ID!): Team
    standings(tournamentId: ID!): JSON!

    # Players
    players(teamId: ID, position: PlayerPosition, search: String): [Player!]!
    player(id: ID!): Player
    topScorers(tournamentId: ID!): [TopScorer!]!

    # Tournaments
    tournaments: [Tournament!]!
    activeTournament: Tournament

    # Predictions
    myPredictions(page: Int, limit: Int): PredictionPage!
    globalRanking(tournamentId: ID!, page: Int, limit: Int): JSON!

    # AI
    aiPrediction(matchId: ID!): AIPrediction!
    topScorerPredictions(tournamentId: ID!): JSON!

    # Community
    news(page: Int, limit: Int, category: String, premium: Boolean): JSON!
    newsItem(slug: String!): News

    # User
    me: User
    user(id: ID!): User
    leaderboard(page: Int, limit: Int): JSON!

    # Quiniela
    myQuinielaGroups: [QuinielaGroup!]!
    quinielaGroup(id: ID!): QuinielaGroup
  }

  # ── Mutations ──────────────────────────────────────────
  type Mutation {
    # Auth
    register(email: String!, username: String!, displayName: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    loginWithGoogle(token: String!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!

    # Predictions
    savePrediction(matchId: ID!, homeScore: Int!, awayScore: Int!): Prediction!
    deletePrediction(matchId: ID!): Boolean!

    # Comments
    addComment(matchId: ID!, content: String!, parentId: ID): Comment!
    deleteComment(id: ID!): Boolean!
    reactToComment(commentId: ID!, type: String!): Boolean!

    # Profile
    updateProfile(displayName: String, bio: String, country: String, language: String): User!
    updateAvatar(avatarUrl: String!): User!
    addFavoriteTeam(teamId: ID!): Boolean!
    removeFavoriteTeam(teamId: ID!): Boolean!
    registerDevice(fcmToken: String!, deviceType: String!): Boolean!

    # Quiniela
    createQuinielaGroup(name: String!, description: String, maxMembers: Int): QuinielaGroup!
    joinQuinielaGroup(inviteCode: String!): QuinielaGroup!
    leaveQuinielaGroup(groupId: ID!): Boolean!
  }

  # ── Subscriptions ──────────────────────────────────────
  type Subscription {
    matchUpdated(matchId: ID!): Match!
    liveMatchEvent(matchId: ID!): MatchEvent!
    matchScoreUpdated(matchId: ID!): Match!
    globalLiveUpdates: Match!
  }
`;
