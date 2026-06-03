# ShinraFixture 2026 — Arquitectura Técnica Completa

## Resumen Ejecutivo

ShinraFixture 2026 es una plataforma de nivel empresarial para el seguimiento del FIFA World Cup 2026™, diseñada para soportar **millones de usuarios concurrentes** con arquitectura de microservicios escalable, resultados en tiempo real y módulo de IA integrado.

---

## 1. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIOS                                │
│            Mobile (iOS/Android)  │  Web  │  Admin               │
└────────────────────┬────────────────────────────────────────────┘
                     │
              ┌──────▼──────┐
              │    Nginx    │  Load Balancer + SSL Termination
              │  Reverse    │  Rate Limiting + Caching
              │   Proxy     │
              └──────┬──────┘
                     │
         ┌───────────┼───────────────────┐
         │           │                   │
    ┌────▼────┐ ┌────▼────┐       ┌──────▼──────┐
    │  Next.js│ │  React  │       │   Node.js   │
    │   Web   │ │  Admin  │       │  Express API │
    │ (SSR)   │ │  Panel  │       │  + GraphQL  │
    └─────────┘ └─────────┘       └──────┬──────┘
                                         │
                    ┌────────────────────┼─────────────────┐
                    │                    │                  │
              ┌─────▼────┐        ┌──────▼─────┐   ┌──────▼──────┐
              │PostgreSQL│        │   Redis    │   │  Socket.IO  │
              │  (Main)  │        │   Cache    │   │  (WebSocket)│
              └──────────┘        └────────────┘   └─────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
   ┌─────▼──────┐       ┌──────▼──────┐
   │  AWS S3    │       │   OpenAI    │
   │  (Media)   │       │    API      │
   └────────────┘       └─────────────┘
```

---

## 2. Stack Tecnológico

### Frontend Mobile
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React Native + Expo | 51.x | Framework multi-plataforma |
| TypeScript | 5.4 | Type safety |
| Redux Toolkit | 2.x | Estado global |
| React Query | 5.x | Server state |
| Apollo Client | 3.x | GraphQL |
| Socket.IO Client | 4.x | WebSocket tiempo real |
| React Navigation | 6.x | Navegación |
| Lottie | 6.x | Animaciones |
| MMKV | 2.x | Storage veloz |

### Frontend Web
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Next.js | 14.x (App Router) | Framework SSR/SSG |
| React | 18.x | UI Framework |
| Tailwind CSS | 3.x | Estilos utilitarios |
| Framer Motion | 11.x | Animaciones |
| Recharts | 2.x | Gráficas y estadísticas |
| next-themes | 0.3 | Modo claro/oscuro |
| Radix UI | 1.x | Componentes accesibles |
| Zustand | 4.x | Estado global ligero |

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 20 LTS | Runtime |
| Express | 4.x | Framework HTTP |
| TypeScript | 5.4 | Type safety |
| Prisma | 5.x | ORM + migrations |
| Apollo Server | 3.x | GraphQL server |
| Socket.IO | 4.x | WebSockets |
| JWT + Passport | Latest | Autenticación |
| Bull | 4.x | Cola de trabajos |
| Winston | 3.x | Logging |

### Base de Datos
| Tecnología | Propósito |
|------------|-----------|
| PostgreSQL 16 | Base de datos principal |
| Redis 7 | Cache + Pub/Sub + Sessions |

### Infraestructura
| Tecnología | Propósito |
|------------|-----------|
| Docker + Compose | Containerización |
| Nginx | Reverse proxy + Load balancer |
| AWS S3 + CloudFront | CDN para media |
| Firebase FCM | Push notifications |
| Sentry | Error monitoring |
| OpenAI GPT-4 | Análisis e IA |
| Stripe | Pagos (Premium) |
| SendGrid | Emails transaccionales |

---

## 3. Estructura de Carpetas

```
ShinraFixture2026/
├── apps/
│   ├── mobile/                    # React Native (Expo)
│   │   ├── App.tsx
│   │   ├── app.json
│   │   └── src/
│   │       ├── navigation/        # Navegación
│   │       ├── screens/           # 20+ pantallas
│   │       │   ├── Home/
│   │       │   ├── Fixture/
│   │       │   ├── Match/
│   │       │   ├── Teams/
│   │       │   ├── Predictions/
│   │       │   ├── Simulator/
│   │       │   ├── Community/
│   │       │   ├── Profile/
│   │       │   └── Auth/
│   │       ├── components/        # Componentes reutilizables
│   │       │   ├── match/
│   │       │   ├── predictions/
│   │       │   ├── community/
│   │       │   ├── ai/
│   │       │   └── common/
│   │       ├── store/             # Redux store
│   │       │   └── slices/
│   │       ├── services/          # API + WebSocket
│   │       ├── hooks/             # Custom hooks
│   │       └── theme/             # Diseño y colores
│   │
│   ├── web/                       # Next.js 14
│   │   ├── app/                   # App Router
│   │   │   ├── page.tsx           # Home
│   │   │   ├── fixture/
│   │   │   ├── teams/
│   │   │   ├── match/[id]/
│   │   │   ├── predictions/
│   │   │   ├── stats/
│   │   │   ├── community/
│   │   │   └── simulator/
│   │   └── components/
│   │
│   └── admin/                     # React Admin
│       └── src/
│           ├── pages/
│           │   ├── Dashboard.tsx
│           │   ├── Users.tsx
│           │   ├── Matches.tsx
│           │   ├── Notifications.tsx
│           │   ├── News.tsx
│           │   └── Ads.tsx
│           └── components/
│
├── backend/
│   └── api/                       # Node.js + Express
│       ├── src/
│       │   ├── index.ts           # Servidor principal
│       │   ├── config/            # Config + DB + Redis
│       │   ├── middleware/        # Auth, errors, rate limit
│       │   ├── routes/            # 14 módulos de rutas
│       │   ├── controllers/       # Controladores REST
│       │   ├── services/          # Lógica de negocio
│       │   │   ├── auth.service.ts
│       │   │   ├── matches.service.ts
│       │   │   ├── teams.service.ts
│       │   │   ├── predictions.service.ts
│       │   │   ├── ai.service.ts
│       │   │   └── notifications.service.ts
│       │   ├── graphql/           # Schema + Resolvers
│       │   ├── socket/            # WebSocket handlers
│       │   ├── jobs/              # Cron jobs
│       │   └── utils/             # Utilidades
│       └── prisma/
│           ├── schema.prisma      # Modelo de datos completo
│           └── seed.ts            # 48 equipos + fixture
│
├── infrastructure/
│   ├── nginx/nginx.conf           # Proxy + SSL + Rate limiting
│   └── scripts/
│       ├── deploy.sh              # Script de despliegue
│       └── init-db.sql            # Init PostgreSQL
│
├── docker-compose.yml             # Todos los servicios
├── .env.example                   # Variables de entorno
└── package.json                   # Monorepo (yarn workspaces)
```

---

## 4. Modelo de Datos (Entidades principales)

```
User ──── UserFavoriteTeam ──── Team ──── Player
  │                               │
  ├── Prediction ──────────── Match ──── MatchEvent
  │                               │
  ├── QuinielaGroupMember         ├── MatchStats
  │                               │
  ├── Comment ──────── Reaction   └── PlayerMatchStats
  │
  ├── Notification
  ├── UserAchievement ──── Achievement
  ├── UserDevice (FCM tokens)
  └── Subscription (Stripe)
```

---

## 5. API REST — Endpoints

### Autenticación `/api/v1/auth`
```
POST   /register         Registro con email/password
POST   /login            Login
POST   /logout           Logout (invalida tokens)
POST   /refresh          Renovar access token
POST   /forgot-password  Enviar email de reset
POST   /reset-password   Resetear contraseña
GET    /google           OAuth Google
GET    /google/callback  Callback Google
GET    /facebook         OAuth Facebook
POST   /apple            Apple Sign-In
GET    /me               Perfil del usuario autenticado
```

### Partidos `/api/v1/matches`
```
GET    /              Lista con filtros (group, stage, status, date, team)
GET    /live          Partidos en vivo
GET    /today         Partidos de hoy
GET    /upcoming      Próximos partidos
GET    /stage/:stage  Por fase
GET    /group/:group  Por grupo
GET    /:id           Detalle completo
GET    /:id/events    Eventos del partido
GET    /:id/stats     Estadísticas detalladas
GET    /:id/lineups   Alineaciones
GET    /:id/h2h       Historial enfrentamientos
GET    /:id/comments  Comentarios paginados
POST   /:id/comments  Agregar comentario
```

### Equipos `/api/v1/teams`
```
GET    /                    Lista con filtros
GET    /standings/:tourId   Tabla de posiciones completa
GET    /group/:group        Equipos por grupo
GET    /:id                 Detalle (incluye plantel)
GET    /:id/players         Jugadores
GET    /:id/matches         Partidos
GET    /:id/stats           Estadísticas
```

### Predicciones `/api/v1/predictions` 🔐
```
GET    /              Mis predicciones
GET    /ranking       Ranking global
GET    /my-ranking    Mi posición
POST   /              Crear/actualizar predicción
POST   /batch         Múltiples predicciones
GET    /:matchId      Mi predicción para un partido
DELETE /:matchId      Eliminar predicción
```

### IA `/api/v1/ai` (vía GraphQL también)
```
GET    /predict/:matchId     Probabilidades + predicción
GET    /analysis/:matchId    Análisis post-partido
GET    /top-scorer           Predicción goleador
POST   /simulate             Simular torneo
```

---

## 6. GraphQL Schema (Queries principales)

```graphql
# Tiempo real de partidos
query LiveMatches {
  liveMatches {
    id homeTeam { name flagUrl } awayTeam { name flagUrl }
    homeScore awayScore minute status
    events(last: 5) { type minute scorer { name } }
  }
}

# Predicciones del usuario
query MyPredictions {
  myPredictions(page: 1, limit: 20) {
    items { homeScore awayScore status pointsEarned match { matchDate } }
    pagination { total pages }
  }
}

# Predicción IA
query AIPrediction($matchId: ID!) {
  aiPrediction(matchId: $matchId) {
    homeWinProb drawProb awayWinProb
    predictedScore keyFactors aiAnalysis confidence
  }
}
```

---

## 7. WebSocket Events (Socket.IO)

```
Client → Server:
  join-match(matchId)     # Subscribe to match room
  leave-match(matchId)    # Unsubscribe
  join-global             # Subscribe to all live matches

Server → Client:
  match:update(match)         # Full match update
  match:event(event)          # New event (goal, card, etc.)
  match:score(score)          # Score update
  match:status(status)        # Status change (live, HT, FT)
  match:stats(stats)          # Statistics update
  global:live-count(count)    # Live match count
```

---

## 8. Sistema de Puntos (Predicciones)

| Resultado | Puntos |
|-----------|--------|
| Marcador exacto | **5 pts** |
| Ganador + diferencia de goles | **4 pts** |
| Ganador correcto | **3 pts** |
| Empate correcto | **3 pts** |
| Resultado incorrecto | **0 pts** |
| Predecir al Campeón (bonus) | **+50 pts** |

**Sistema de niveles XP:**
```
Nivel 1: 0 XP        Nivel 6:  2,500 XP
Nivel 2: 100 XP      Nivel 7:  5,000 XP
Nivel 3: 250 XP      Nivel 8:  10,000 XP
Nivel 4: 500 XP      Nivel 9:  20,000 XP
Nivel 5: 1,000 XP    Nivel 10: 50,000 XP
```

---

## 9. Sistema de IA

### Predicción Estadística (siempre disponible)
1. Diferencia de ranking FIFA (factor ±15%)
2. Forma reciente de últimos 5 partidos
3. Promedio de goles marcados/recibidos
4. Factor local/visitante

### Análisis con GPT-4 (con API key)
- Prompt estructurado con datos del partido
- Análisis narrativo en español
- Probabilidades calibradas con datos históricos
- Caché de 1 hora para eficiencia
- Fallback a modelo estadístico si falla

### Simulador de Torneo
- Simulación Monte Carlo para fase de grupos
- Propagación automática de resultados
- Sharable via código único
- Guardar múltiples escenarios

---

## 10. Arquitectura de Escalabilidad

### Para 1M+ usuarios concurrentes:

```
Usuarios → CloudFlare CDN → Load Balancer
                                │
                    ┌───────────┼───────────┐
                    │           │           │
               API Replica  API Replica  API Replica
                    │           │           │
                    └───────────┼───────────┘
                                │
                    ┌───────────┼───────────┐
                    │                       │
             PostgreSQL Primary      PostgreSQL Read Replica
             (writes)                (reads, reports)
                    │
             Redis Cluster
             (cache, sessions, pub/sub)
```

**Estrategias de cache:**
- Redis para datos de partidos (30s TTL para live, 5min para scheduled)
- CloudFront CDN para imágenes y assets estáticos
- Next.js ISR (Incremental Static Regeneration) para páginas
- Service Workers en mobile para offline support

**Optimizaciones de base de datos:**
- Connection pooling con PgBouncer
- Índices en columnas de búsqueda frecuente
- Particionado por tournament_id
- Read replicas para queries de estadísticas

---

## 11. Seguridad

- **HTTPS** obligatorio en producción (TLS 1.2+)
- **JWT** con refresh tokens rotativos (15min/7días)
- **Rate limiting** multi-nivel (global, por IP, por endpoint)
- **Helmet.js** para headers de seguridad
- **CORS** configurado estrictamente
- **Bcrypt** para hashing de contraseñas (12 rounds)
- **Input validation** con Zod en todos los endpoints
- **SQL injection** protegido por Prisma ORM
- **XSS** protegido con sanitización de inputs
- **CSRF** protección en formularios web
- **Auth** roles granulares: USER, PREMIUM, MODERATOR, ADMIN, SUPER_ADMIN

---

## 12. Monetización

### Gratis
- Fixture completo y resultados
- 1 quiniela grupal (hasta 10 miembros)
- Predicciones básicas
- Comentarios y comunidad
- Estadísticas básicas

### Premium ($4.99/mes | $39.99/año)
- Sin publicidad
- Estadísticas avanzadas (xG, heatmaps)
- IA análisis profundo
- Quinielas ilimitadas (hasta 100 miembros)
- Predicciones históricas completas
- Notificaciones personalizadas
- Insignias exclusivas
- Acceso anticipado a features

### Publicidad (usuarios gratuitos)
- Banner ads (non-intrusive)
- Intersticiales entre partidos
- Native ads en el feed
- Video ads recompensados (+XP)

---

## 13. Notificaciones Push (Firebase FCM)

```
Eventos que generan notificaciones:
┌─────────────────────────────────────────┐
│ ⚽ Inicio de partido         (5 min antes) │
│ 🥅 Gol                       (inmediato) │
│ 🔴 Tarjeta roja               (inmediato) │
│ ⏸️  Medio tiempo               (inmediato) │
│ 🏁 Fin del partido            (inmediato) │
│ 🎯 Resultado de predicción    (al terminar)│
│ 🏆 Actualización de quiniela  (al terminar)│
│ 📰 Noticia importante         (manual)    │
│ 🔔 Recordatorio personalizado (configurado)│
└─────────────────────────────────────────┘
```

---

## 14. Plan de Desarrollo

### Versión 1.0 (Mundial 2026)
- [x] Fixture completo FIFA World Cup 2026
- [x] Resultados en tiempo real
- [x] Sistema de predicciones
- [x] Quiniela grupal
- [x] Simulador con IA
- [x] Comunidad y comentarios
- [x] Perfil y logros
- [x] Panel admin

### Versión 2.0 (Post-Mundial)
- [ ] Copa América 2027
- [ ] Eurocopa 2028
- [ ] Champions League
- [ ] Ligas nacionales (MLS, Liga MX, Premier League, etc.)
- [ ] Fantasy Football
- [ ] Marketplace de predicciones
- [ ] Modo TV/Tablet optimizado
- [ ] Integración con Apple TV / Google TV

### Versión 3.0 (Futuro)
- [ ] IA personalizada por usuario (historial de predicciones)
- [ ] NFT de momentos históricos
- [ ] Apuestas sociales (si regulado)
- [ ] Streaming integrado (asociaciones)
- [ ] AR/VR estadísticas en vivo

---

## 15. Comandos Rápidos

```bash
# Desarrollo
yarn dev                    # Inicia API + Web
yarn dev:mobile            # Inicia app móvil
docker-compose up -d       # Inicia todos los servicios

# Base de datos
yarn db:migrate            # Aplica migraciones
yarn db:seed               # Carga datos iniciales (48 equipos)
yarn db:studio             # Abre Prisma Studio

# Producción
bash infrastructure/scripts/deploy.sh 1.0.0 production

# Testing
yarn test                  # Tests en todos los workspaces
yarn workspace @shinra/api test:coverage
```
