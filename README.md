# ⚽ ShinraFixture 2026

**La plataforma definitiva para el FIFA World Cup 2026™**

![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-20+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)

---

## Características Principales

| Módulo | Descripción |
|--------|-------------|
| 📅 **Fixture** | 80 partidos del Mundial 2026, fases y grupos |
| ⚡ **Tiempo Real** | Goles, tarjetas, estadísticas via WebSocket |
| 🤖 **IA** | Predicciones y análisis con GPT-4 |
| 🎯 **Predicciones** | Sistema de puntos con ranking global |
| 🏆 **Quiniela** | Grupos privados para competir con amigos |
| 🔬 **Simulador** | Simula el torneo completo manualmente o con IA |
| 👥 **Comunidad** | Comentarios, reacciones, foros |
| 📊 **Estadísticas** | Goleadores, xG, posesión, pases |
| 📱 **Mobile** | React Native para iOS y Android |
| 🌐 **Web** | Next.js SSR/SSG |
| ⚙️ **Admin** | Panel de gestión completo |

---

## Inicio Rápido

### Requisitos
- Node.js 20+
- Docker & Docker Compose
- Yarn 1.22+

### Setup en 3 pasos

```bash
# 1. Clonar e instalar
git clone https://github.com/tu-usuario/shinra-fixture-2026.git
cd shinra-fixture-2026
yarn install

# 2. Configurar entorno
cp .env.example .env
# Edita .env con tus credenciales

# 3. Iniciar servicios
docker-compose up -d
yarn db:migrate
yarn db:seed   # Carga 48 equipos + fixture completo
yarn dev       # Inicia API + Web en paralelo
```

### URLs
| Servicio | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API REST | http://localhost:4000/api/v1 |
| GraphQL | http://localhost:4000/graphql |
| Admin Panel | http://localhost:3001 |
| PgAdmin | http://localhost:5050 |

### Credenciales Admin (desarrollo)
- Email: `admin@shinrafixture.com`
- Password: `Admin2026!`

---

## Estructura

```
ShinraFixture2026/
├── apps/
│   ├── mobile/     # React Native (Expo)
│   ├── web/        # Next.js 14
│   └── admin/      # React Admin Panel
├── backend/
│   └── api/        # Node.js + Express + GraphQL
│       └── prisma/ # Schema DB + Seed (48 equipos)
├── infrastructure/
│   ├── nginx/      # Configuración proxy
│   └── scripts/    # Deploy + DB init
├── docker-compose.yml
└── ARCHITECTURE.md  # Documentación técnica completa
```

---

## Tecnologías

**Frontend:** React Native, Next.js 14, Tailwind CSS, Framer Motion  
**Backend:** Node.js, Express, TypeScript, Prisma, Apollo GraphQL  
**DB:** PostgreSQL 16, Redis 7  
**Auth:** JWT, OAuth (Google, Apple, Facebook)  
**IA:** OpenAI GPT-4, modelo estadístico propio  
**Infra:** Docker, Nginx, AWS S3, Firebase FCM  
**Pagos:** Stripe

---

## Licencia

MIT © 2026 ShinraFixture. Datos FIFA World Cup 2026™. Todos los derechos reservados.

---

*Para documentación técnica completa, ver [ARCHITECTURE.md](./ARCHITECTURE.md)*
