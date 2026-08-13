# Fase 1 — Decisiones (Auth + modelo base)

1. Entidades definidas: `User`, `ClientProfile`, `WorkerProfile`, `Locality` (stub), `Session`.
2. Roles vía enum `Role` (CLIENT/WORKER/ADMIN) en `User`, sin tablas RBAC separadas todavía.
3. `Locality` queda como stub mínimo (id, name, active) solo para satisfacer la FK de `WorkerProfile`; CRUD completo se hace en fase 2.
4. Auth con sesiones persistidas: se descartó JWT stateless puro porque no permite revocar acceso al bloquear un usuario (requisito del admin, sección 4/13 del doc de arquitectura).
5. Tabla `Session` guarda el refresh token **hasheado** (nunca en claro), con `userAgent`, `ipAddress`, `expiresAt`, `revokedAt`.
6. Access token = JWT corto (~15 min) sin persistencia; solo el refresh vive en `Session`.
7. Bloqueo de usuario por admin debe revocar todas sus sesiones activas en la misma transacción.
8. Job cron pendiente (no en schema) para limpiar sesiones expiradas.
9. Password con bcrypt/argon2; DNI cifrado en aplicación antes de persistir (`dniEncrypted`).
10. Pendiente fase 2: Category, Subcategory, WorkerSubcategory, Verification, Review, WorkerReply, ContactInteraction, Promotion, AuditLog.

Resumen — Decisiones Fase 2:

Review.interactionId es obligatorio y único (1:1 con ContactInteraction) — reseña requiere contacto previo, según aprobación final del doc.
WorkerSubcategory como PK compuesta (workerId, subcategoryId), sin tabla intermedia extra.
Verification.subcategoryId nullable: null para IDENTITY, seteado para PROFESSIONAL.
documentRef guarda solo la key del storage privado (R2/S3), nunca URL pública.
WorkerReply.reviewId como PK propia → garantiza 1 respuesta por reseña sin constraint extra.
Review tiene unique compuesto (clientId, workerId, subcategoryId) → evita reseñas repetidas.
Verification.reviewedBy sin cascade delete, para preservar historial de auditoría aunque se borre el admin.
AuditLog indexado por actorId y createdAt para consultas de auditoría rápidas.
