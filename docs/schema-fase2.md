# Schema Fase 2 — Prisma

Entidades agregadas: `Category`, `Subcategory`, `WorkerSubcategory`, `Verification`, `Review`, `WorkerReply`, `ContactInteraction`, `Promotion`, `AuditLog`.

```prisma
// prisma/schema.prisma
// FASE 2: Category, Subcategory, WorkerSubcategory, Verification,
// Review, WorkerReply, ContactInteraction, Promotion, AuditLog

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Fase 1 (sin cambios) ─────────────────────────────────────

enum Role {
  CLIENT
  WORKER
  ADMIN
}

enum UserStatus {
  ACTIVE
  BLOCKED
  DELETED
}

model User {
  id           String     @id @default(uuid())
  email        String     @unique
  phone        String?    @unique
  passwordHash String     @map("password_hash")
  role         Role
  status       UserStatus @default(ACTIVE)
  createdAt    DateTime   @default(now()) @map("created_at")
  deletedAt    DateTime?  @map("deleted_at")

  clientProfile ClientProfile?
  workerProfile WorkerProfile?
  sessions      Session[]

  // Fase 2
  clientReviews          Review[]             @relation("ClientReviews")
  clientInteractions     ContactInteraction[]  @relation("ClientInteractions")
  verificationsReviewed  Verification[]        @relation("VerificationReviewer")
  auditLogs              AuditLog[]            @relation("AuditActor")

  @@map("users")
}

model ClientProfile {
  userId      String @id @map("user_id")
  displayName String @map("display_name")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("client_profiles")
}

model WorkerProfile {
  userId       String  @id @map("user_id")
  bio          String?
  localityId   String? @map("locality_id")
  whatsapp     String?
  instagram    String?
  dniEncrypted String? @map("dni_encrypted")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  locality Locality? @relation(fields: [localityId], references: [id])

  // Fase 2
  subcategories       WorkerSubcategory[]
  verifications       Verification[]
  reviews             Review[]
  contactInteractions ContactInteraction[]
  promotions          Promotion[]

  @@map("worker_profiles")
}

model Locality {
  id     String  @id @default(uuid())
  name   String  @unique
  active Boolean @default(true)

  workers WorkerProfile[]

  @@map("localities")
}

model Session {
  id           String    @id @default(uuid())
  userId       String    @map("user_id")
  refreshToken String    @unique @map("refresh_token")
  userAgent    String?   @map("user_agent")
  ipAddress    String?   @map("ip_address")
  expiresAt    DateTime  @map("expires_at")
  revokedAt    DateTime? @map("revoked_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

// ── Fase 2 ────────────────────────────────────────────────────

enum VerificationType {
  IDENTITY
  PROFESSIONAL
}

enum VerificationStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}

enum ReviewStatus {
  VISIBLE
  HIDDEN
  REPORTED
}

enum ContactChannel {
  WHATSAPP
  INSTAGRAM
}

model Category {
  id     String  @id @default(uuid())
  name   String  @unique
  active Boolean @default(true)

  subcategories Subcategory[]

  @@map("categories")
}

model Subcategory {
  id                 String  @id @default(uuid())
  categoryId         String  @map("category_id")
  name               String
  active             Boolean @default(true)
  requiresCredential Boolean @default(false) @map("requires_credential")

  category      Category            @relation(fields: [categoryId], references: [id])
  workers       WorkerSubcategory[]
  verifications Verification[]
  reviews       Review[]

  @@unique([categoryId, name])
  @@index([categoryId])
  @@map("subcategories")
}

model WorkerSubcategory {
  workerId      String @map("worker_id")
  subcategoryId String @map("subcategory_id")

  worker      WorkerProfile @relation(fields: [workerId], references: [userId], onDelete: Cascade)
  subcategory Subcategory   @relation(fields: [subcategoryId], references: [id], onDelete: Cascade)

  @@id([workerId, subcategoryId])
  @@index([subcategoryId])
  @@map("worker_subcategories")
}

model Verification {
  id             String              @id @default(uuid())
  workerId       String              @map("worker_id")
  type           VerificationType
  subcategoryId  String?             @map("subcategory_id") // solo para PROFESSIONAL
  status         VerificationStatus  @default(PENDING)
  documentRef    String?             @map("document_ref") // ref a storage privado (R2/S3), nunca URL pública
  reviewedBy     String?             @map("reviewed_by")
  reviewedAt     DateTime?           @map("reviewed_at")
  createdAt      DateTime            @default(now()) @map("created_at")

  worker      WorkerProfile @relation(fields: [workerId], references: [userId], onDelete: Cascade)
  subcategory Subcategory?  @relation(fields: [subcategoryId], references: [id])
  reviewer    User?         @relation("VerificationReviewer", fields: [reviewedBy], references: [id])

  @@index([workerId])
  @@index([status])
  @@map("verifications")
}

model ContactInteraction {
  id        String         @id @default(uuid())
  clientId  String         @map("client_id")
  workerId  String         @map("worker_id")
  channel   ContactChannel
  createdAt DateTime       @default(now()) @map("created_at")

  client User          @relation("ClientInteractions", fields: [clientId], references: [id], onDelete: Cascade)
  worker WorkerProfile @relation(fields: [workerId], references: [userId], onDelete: Cascade)
  review Review?

  @@index([clientId])
  @@index([workerId])
  @@map("contact_interactions")
}

model Review {
  id            String       @id @default(uuid())
  clientId      String       @map("client_id")
  workerId      String       @map("worker_id")
  subcategoryId String       @map("subcategory_id")
  rating        Int
  comment       String?
  status        ReviewStatus @default(VISIBLE)
  interactionId String       @unique @map("interaction_id") // obligatoria: reseña requiere contacto previo
  createdAt     DateTime     @default(now()) @map("created_at")

  client       User               @relation("ClientReviews", fields: [clientId], references: [id], onDelete: Cascade)
  worker       WorkerProfile      @relation(fields: [workerId], references: [userId], onDelete: Cascade)
  subcategory  Subcategory        @relation(fields: [subcategoryId], references: [id])
  interaction  ContactInteraction @relation(fields: [interactionId], references: [id])
  reply        WorkerReply?

  @@unique([clientId, workerId, subcategoryId]) // 1 reseña por (cliente, worker, subcategoría)
  @@index([workerId, subcategoryId])
  @@map("reviews")
}

model WorkerReply {
  reviewId  String   @id @map("review_id")
  replyText String   @map("reply_text")
  createdAt DateTime @default(now()) @map("created_at")

  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@map("worker_replies")
}

model Promotion {
  id       String   @id @default(uuid())
  workerId String   @map("worker_id")
  plan     String
  startsAt DateTime @map("starts_at")
  endsAt   DateTime @map("ends_at")
  active   Boolean  @default(true)

  worker WorkerProfile @relation(fields: [workerId], references: [userId], onDelete: Cascade)

  @@index([workerId])
  @@index([active])
  @@map("promotions")
}

model AuditLog {
  id        String   @id @default(uuid())
  actorId   String   @map("actor_id")
  action    String
  target    String
  metadata  Json?
  createdAt DateTime @default(now()) @map("created_at")

  actor User @relation("AuditActor", fields: [actorId], references: [id])

  @@index([actorId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

## Notas
- `documentRef` guarda solo la key del bucket privado, no URL pública.
- `reviewedBy` sin `onDelete: Cascade` a propósito, para no perder historial si se borra el admin.
- `Review ↔ ContactInteraction` es 1:1 (`interactionId @unique`).
- `WorkerReply` usa `reviewId` como PK → fuerza 1 respuesta por reseña.
