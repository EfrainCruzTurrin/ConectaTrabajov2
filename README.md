# Servicios Platform

Directorio/marketplace local de servicios (contacto externo vía WhatsApp/Instagram).
Ver `/docs/arquitectura-plataforma-servicios.md` para la arquitectura completa y `/docs/decisiones.md` para el historial de decisiones por fase.

## Stack
- Backend: NestJS + TypeScript
- Frontend: Next.js + Tailwind
- DB: PostgreSQL
- ORM: Prisma
- Storage: Cloudflare R2

## Estructura
```
/apps
  /api        -> backend NestJS
  /web        -> frontend Next.js
/packages
  /shared     -> enums/tipos compartidos entre api y web
/prisma       -> schema.prisma y migraciones
/docs         -> arquitectura y decisiones por fase
```

## Setup inicial

1. Instalar [pnpm](https://pnpm.io/installation) (v9+) y tener Node.js 20+.

2. Instalar dependencias del monorepo:
   ```bash
   pnpm install
   ```

3. Copiar variables de entorno:
   ```bash
   cp .env.example .env
   ```
   Completar `DATABASE_URL` con una instancia PostgreSQL (local o gestionada, ej. Neon/Supabase/Railway).

4. Generar el cliente de Prisma y correr la migración inicial:
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

5. Levantar el backend:
   ```bash
   pnpm dev:api
   ```
   Corre en `http://localhost:3001`.

6. Levantar el frontend (en otra terminal):
   ```bash
   pnpm dev:web
   ```
   Corre en `http://localhost:3000`.

## Estado actual

- ✅ Fase 1: schema base (`User`, `ClientProfile`, `WorkerProfile`, `Locality`, `Session`).
- ✅ Fase 2: schema completo (`Category`, `Subcategory`, `WorkerSubcategory`, `Verification`, `Review`, `WorkerReply`, `ContactInteraction`, `Promotion`, `AuditLog`).
- ✅ Estructura de repo (monorepo pnpm workspaces, esqueleto NestJS + Next.js, `PrismaModule` conectado).
- ⏳ Fase 3: implementación del `AuthModule` (registro, login, refresh, guards RBAC).

## Notas de seguridad
- Nunca commitear `.env`.
- Documentos de verificación: solo `documentRef` (key de bucket privado) en DB, nunca URL pública.
- Todas las acciones admin sensibles deben quedar en `AuditLog`.
