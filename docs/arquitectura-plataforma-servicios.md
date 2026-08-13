# Arquitectura y Planificación — Plataforma de Servicios (Directorio/Marketplace)

## 1. Resumen del producto
Directorio/marketplace local que conecta clientes con trabajadores independientes por categoría/subcategoría de servicio. Contacto vía WhatsApp/Instagram (sin chat, pago ni reservas internas). MVP mono-localidad, expandible.

## 2. Requisitos funcionales identificados
- Registro/login diferenciado cliente/trabajador (base común).
- Búsqueda y filtrado por categoría, subcategoría, localidad.
- Perfil público de trabajador con multi-subcategoría.
- Reseñas por subcategoría (no reputación global).
- Verificación de identidad y verificación profesional (independientes).
- Botones de contacto (WhatsApp/Instagram) con registro de interacción.
- Panel admin: usuarios, categorías, localidades, verificaciones, moderación, destacados.
- Baja de cuenta con soft delete/anonimización.

## 3. Requisitos no funcionales
- Seguridad y privacidad de datos (PII, documentos de verificación).
- Bajo costo inicial, escalable progresivamente.
- Disponibilidad razonable (no HA crítico en MVP).
- Mantenibilidad por un solo desarrollador.
- Auditable (acciones admin).

## 4. Actores y permisos
| Actor | Permisos clave |
|---|---|
| Cliente | buscar, ver perfiles, contactar, reseñar (propias reseñas), gestionar su cuenta |
| Trabajador | editar perfil, responder reseñas, cargar verificación, ver sus stats |
| Admin | CRUD categorías/localidades, moderar reseñas, aprobar/rechazar verificación, gestionar destacados, bloquear usuarios |
| (Futuro) Admin-moderador, Admin-soporte | permisos acotados vía RBAC |

## 5. Flujo general de usuarios
Cliente: registro → búsqueda → filtro → perfil trabajador → click contacto (WhatsApp/IG, se loguea interacción) → contacto externo → reseña opcional.
Trabajador: registro → completar perfil profesional → seleccionar subcategorías/localidad → subir documentación (opcional según rubro) → queda "pendiente" → admin aprueba → perfil visible con insignias.

## 6. Modelo conceptual de entidades
```
User (id, email, phone, password_hash, role, status, created_at, deleted_at)
 └─1:1─ ClientProfile (user_id, display_name)
 └─1:1─ WorkerProfile (user_id, bio, locality_id, whatsapp, instagram, dni_encrypted)

Category (id, name, active)
Subcategory (id, category_id, name, active, requires_credential)

WorkerSubcategory (worker_id, subcategory_id)  -- N:N

Locality (id, name, active)

Verification (id, worker_id, type[identity|professional], subcategory_id nullable,
              status[pending|approved|rejected|expired], document_ref, reviewed_by, reviewed_at)

Review (id, client_id, worker_id, subcategory_id, rating, comment, status[visible|hidden|reported],
        interaction_id nullable, created_at)
WorkerReply (review_id, reply_text, created_at)

ContactInteraction (id, client_id, worker_id, channel[whatsapp|instagram], created_at)

Promotion (id, worker_id, plan, starts_at, ends_at, active)

AuditLog (id, actor_id, action, target, metadata, created_at)
```
Relaciones clave: Worker N:N Subcategory; Review pertenece a Worker+Subcategory; Verification puede ser por Worker o por Worker+Subcategory (credencial específica).

## 7. Modelo de categorías y subcategorías
- Jerarquía simple 2 niveles (Category → Subcategory), gestionable 100% desde admin (sin tocar código).
- `requires_credential` en Subcategory define si exige verificación profesional.
- Categoría del trabajador se deriva de sus subcategorías (no se duplica).

## 8. Modelo de trabajadores y servicios
- `WorkerProfile` 1:1 con User.
- `WorkerSubcategory` N:N habilita multi-rubro (plomero+electricista+gasista).
- Localidad: FK simple a `Locality`, un valor por trabajador en MVP (migrable a N:N después).
- "Servicios ofrecidos" como texto libre corto o tags por subcategoría (evitar catálogo rígido en v1).

## 9. Modelo de reseñas y reputación
- Rating y reputación calculados por (worker_id, subcategory_id), no global.
- Reputación global del perfil = agregado informativo, pero cada bloque de rubro muestra su propio promedio.
- Un cliente puede reseñar una vez por (worker, subcategory) — evita spam de reseñas repetidas.
- Trabajador responde 1 vez por reseña.

## 10. Modelo de verificación
Dos tipos independientes, badges distintos y explícitos en el perfil:
- **Identidad verificada**: DNI/selfie revisado por admin.
- **Verificación profesional (subcategoría X)**: credencial/matrícula validada para esa subcategoría puntual.
Estados: pendiente / aprobada / rechazada / vencida. Admin decide manualmente en MVP (sin validación automática con terceros).

## 11. Sistema de búsqueda y ranking
Filtro obligatorio: subcategoría + localidad. Ranking v1 (score ponderado, no solo estrellas):
```
score = w1*bayesian_avg_rating + w2*log(1+n_reviews) + w3*verificado + w4*actividad_reciente + boost_destacado
```
- `bayesian_avg` evita que 5★ con 1 reseña gane a 4.3★ con 40 reseñas.
- Destacados: boost aditivo limitado (tope), nunca reemplaza el orden por completo; se marcan visualmente como "Patrocinado".

## 11.1 Preparación para pagos futuros (destacados/promociones)
No se implementa pasarela en el MVP, pero la arquitectura queda preparada:
- Tabla `Promotion` ya desacoplada del cobro (plan, fechas, activo) — el campo de pago se agrega después sin romper el modelo.
- Cuando se implemente: **Mercado Pago** (recomendado si el mercado es LATAM, por adopción y facilidad de checkout) o **Stripe** (mejor DX y documentación, pero menor adopción local para pagos con tarjeta/efectivo regional). Se decide en el momento según tu país objetivo.
- No se debe guardar información de tarjetas propia: usar checkout hospedado del proveedor (cumple PCI-DSS sin esfuerzo nuestro).

## 12. Sistema de prevención de fraude
Niveles (no depender de uno solo):
1. Teléfono verificado por SMS en registro (reduce cuentas múltiples).
2. `ContactInteraction` se registra al click en WhatsApp/IG — **no implica contratación confirmada**, solo evidencia de intención de contacto.
3. Reseña puede o no requerir `interaction_id` previo (recomendado: permitir reseña sin interacción pero marcarla "sin contacto verificado en plataforma" vs "contacto verificado en plataforma" — nunca "servicio confirmado").
4. Rate limiting en registro, reseñas y contacto. Un review por (cliente, worker, subcategoría).
5. Reportes de usuarios + cola de moderación admin.
6. Captcha en registro/reseña, detección de patrones (mismo IP/dispositivo, ráfagas).

**Límite honesto**: la plataforma nunca puede afirmar "servicio realizado", solo "contacto registrado en plataforma". Esto debe comunicarse claramente en el badge de la reseña.

## 13. Sistema de administración y moderación
- CRUD categorías/subcategorías/localidades.
- Cola de verificaciones (aprobar/rechazar con motivo).
- Cola de reseñas reportadas (ocultar/eliminar/advertir).
- Gestión de destacados/promociones (aunque sin cobro automatizado en v1, se puede marcar manualmente).
- Bloqueo/activación de usuarios.
- RBAC preparado para roles admin adicionales a futuro.
- Todas las acciones administrativas quedan en `AuditLog`.

## 14. Seguridad
- Contraseñas: bcrypt/argon2.
- Auth: JWT de corta duración + refresh token, o sesiones server-side (recomendado sesiones si el stack es monolítico simple).
- RBAC por rol en cada endpoint.
- Validación de entrada (schema validation, ej. Zod/Pydantic).
- ORM con queries parametrizadas (evita SQL injection).
- CSP + sanitización de output (XSS), CSRF tokens en formularios con cookies de sesión.
- CORS restringido al dominio del frontend.
- Rate limiting (login, registro, reseñas, contacto) — ej. Redis + middleware.
- Secretos solo en variables de entorno / secret manager del hosting, nunca en repo.
- HTTPS obligatorio (forzado por el hosting/CDN).
- Logs sin PII/contraseñas/tokens/documentos.
- Documentos de verificación en storage privado con URLs firmadas de corta duración, acceso solo admin.
- Auditoría de acciones sensibles (aprobar verificación, banear usuario, borrar reseña).

## 15. Privacidad y protección de datos
- Minimización: DNI y documentos solo del trabajador, nunca públicos, cifrados en reposo o en bucket privado.
- Separación estricta perfil público (nombre, bio, rubro, localidad, rating) vs datos privados (email, teléfono, DNI, documentos).
- Retención: documentos de verificación se conservan mientras la cuenta esté activa + período legal razonable tras baja (ej. 90 días) y luego se eliminan.
- Baja de cuenta → anonimización (ver sección 18), no borrado físico inmediato de reseñas.

## 16. Arquitectura propuesta
Monolito modular (v1), API REST + frontend SPA/SSR separados o full-stack framework único. Sin microservicios ni Kubernetes. Componentes:
- API backend (auth, categorías, búsqueda, reseñas, verificación, admin).
- Base de datos relacional (PostgreSQL).
- Storage de objetos (documentos/imágenes) — bucket privado.
- Frontend web (público + panel admin como sección protegida).
- Servicio de SMS (verificación teléfono) — proveedor externo.
- Cola/worker simple para tareas async (ej. envío SMS, expiración de verificaciones) — opcional al inicio, puede ser cron jobs.

## 17. Alternativas tecnológicas consideradas
**Backend**: Node.js/NestJS o Express, vs Django/FastAPI (Python), vs Laravel (PHP). Todos válidos; se recomienda el que el desarrollador domine mejor — indicá tu experiencia previa para afinar esto.
**Frontend**: Next.js (React) vs Nuxt (Vue) vs SPA + backend separado. Next.js recomendado por SEO (importante en un directorio buscable) y ecosistema.
**Base de datos**: PostgreSQL (relacional, ideal para este modelo con relaciones N:N y agregaciones por subcategoría) vs MySQL (similar, menos rico en tipos) vs NoSQL (Mongo) — descartado por la naturaleza altamente relacional (reseñas×subcategoría, verificaciones, RBAC).
**ORM**: Prisma (Node) o SQLAlchemy/Django ORM (Python) — según backend elegido.
**Hosting**: Render/Railway/Fly.io (bajo costo, simple) vs AWS/GCP desde el día 1 (sobreingeniería para MVP personal).
**Storage**: S3 (o compatible, ej. Cloudflare R2/Backblaze B2 — más barato) para documentos e imágenes.
**Auth**: solución propia (JWT/sesiones + bcrypt) vs Auth0/Clerk (rapidez pero costo y lock-in). Para MVP con presupuesto ajustado, auth propia es razonable si el desarrollador tiene experiencia; si no, Clerk/Auth0 free tier acelera.

## 18. Stack tecnológico recomendado — CONFIRMADO
Stack definitivo:
- Backend: **Node.js + NestJS** + TypeScript.
- Frontend: **Next.js** (React + TS) + **Tailwind**.
- DB: **PostgreSQL**.
- ORM: **Prisma**.
- Auth: sesiones/JWT propios + bcrypt.
- Storage: **Cloudflare R2** o S3.
- Verificación telefónica: **WhatsApp Business API** (fallback SMS).

## 19. Base de datos recomendada
PostgreSQL gestionado (ej. Supabase, Neon, Railway Postgres) — free tier suficiente para MVP, backups automáticos, fácil de migrar a instancia propia después.

## 20. Infraestructura y Cloud
MVP: hosting PaaS único (Render/Railway/Fly.io) para API+frontend, DB gestionada separada, storage de objetos separado (R2/S3). Sin contenedores orquestados; un Dockerfile simple si el PaaS lo requiere.

## 21. Estrategia de deploy
CI simple (GitHub Actions): test → build → deploy automático a staging/producción por rama. Migraciones de DB versionadas (Prisma Migrate).

## 22. Escalabilidad
Orden de escalado esperado: 1) DB (índices, connection pooling) → 2) cache de búsquedas/listados (Redis) → 3) CDN para assets/imágenes → 4) separar workers async → 5) recién ahí considerar servicios separados si el tráfico lo justifica. No anticipar microservicios.

## 23. Backups y recuperación
Backups automáticos diarios de DB (los proveedores gestionados lo incluyen), retención 7-30 días. Exportación periódica adicional a storage frío. Runbook simple de restauración documentado.

## 24. Testing
Unit tests en lógica de ranking/fraude/permisos (crítica). Tests de integración en endpoints de auth, reseñas, verificación. E2E básico en flujos principales (registro, búsqueda, contacto, reseña).

## 25. Observabilidad y logging
Logging estructurado (sin PII), niveles por severidad. Error tracking (Sentry free tier). Métricas básicas de uso (búsquedas, contactos, conversión a reseña) para calibrar el ranking.

## 26. Estructura inicial del repositorio
```
/apps
  /api        -> backend NestJS
  /web        -> frontend Next.js
/packages
  /shared     -> tipos/DTOs compartidos
/prisma       -> schema y migraciones
/docs         -> este documento y decisiones
```

## 27. Riesgos técnicos
- Confusión entre "contacto registrado" y "servicio confirmado" → mitigar con copy claro en UI.
- Abuso de reseñas falsas si no hay fricción suficiente → mitigar con límites + moderación.
- Exposición accidental de DNI/documentos si el storage no queda bien aislado → revisar permisos de bucket antes de producción.
- Ranking manipulable si el boost de destacados no tiene tope → definir tope fijo.

## 28. Decisiones pendientes
Todas las decisiones fueron resueltas. Ver detalle:
- **Verificación telefónica**: WhatsApp Business API (Twilio o Meta Cloud API) como canal principal de OTP, con **SMS como fallback** si el usuario no tiene WhatsApp o el envío falla. Requiere aprobación previa de plantilla de mensaje ante Meta.
- **Retención de documentos**: 90 días tras baja de cuenta, luego borrado definitivo — confirmado.
- **Stack**: NestJS + TypeScript (backend) / Next.js + Tailwind (frontend) / PostgreSQL / Prisma — confirmado.

## 29. Roadmap de implementación
1. Modelo de datos + auth + roles.
2. CRUD categorías/localidades (admin).
3. Registro/perfil trabajador + verificación (flujo básico).
4. Búsqueda/filtro + ranking v1.
5. Reseñas + respuestas + moderación.
6. Contacto (WhatsApp/IG) + tracking de interacción.
7. Panel admin completo.
8. Destacados (manual) → luego monetización real.

## 30.1 Visión a futuro: Chat interno y Feed tipo "grupo de Facebook"
Mencionaste dos features de largo plazo. No se implementan en el MVP, pero afectan el diseño de datos y conviene dejarlas contempladas desde ahora para no tener que rediseñar después:

**Chat interno (mensajería 1:1 cliente↔trabajador)**
- Reemplazaría/complementaría el link a WhatsApp. Requiere: tabla `Conversation`, `Message` (sender_id, receiver_id, conversation_id, body, read_at), y probablemente WebSockets (ej. Socket.io o el gateway de NestJS) para tiempo real.
- Impacto en seguridad: cifrado en tránsito (ya cubierto por HTTPS/WSS), moderación de contenido, rate limiting de mensajes, posibilidad de reportar conversaciones.
- Impacto en el modelo de fraude: si existe chat propio, `ContactInteraction` puede reemplazarse/complementarse con mensajes reales dentro del chat, lo cual mejora mucho la confiabilidad de las reseñas ("contacto verificado" pasa a tener más peso real).
- No lo incluyas en v1: agrega complejidad de infraestructura (conexiones persistentes) que no es necesaria mientras el contacto sea externo.

**Feed tipo grupo de Facebook (clientes publican búsquedas / trabajadores se promocionan)**
- Nueva entidad `Post` (author_id, type[busco_servicio|me_ofrezco], subcategory_id, locality_id, body, images[], created_at, status).
- Interacciones: `PostComment`, `PostReport`, posiblemente `PostReaction`.
- Impacto en moderación: mismo motor de moderación de reseñas se extiende a posts (cola admin, reportes, ocultar contenido).
- Impacto en ranking/visibilidad: el feed necesita su propio orden (cronológico + boost de destacados), separado del ranking de búsqueda de perfiles.
- Relación con verificación: conviene que los posts de trabajadores muestren las mismas insignias de verificación que el perfil, para mantener coherencia y evitar confusión.
- No lo incluyas en v1: es una feature con superficie de moderación y abuso mucho mayor (spam, contenido inapropiado, multiplicación de fraude) — conviene lanzarla recién cuando el directorio base ya tenga tracción y reglas de moderación probadas.

**Por qué esto no rompe la arquitectura actual**: el modelo relacional (PostgreSQL) y el enfoque monolítico modular soportan agregar estas tablas/módulos sin migrar de stack ni de infraestructura. Es agregar módulos nuevos, no rediseñar los existentes.

## 30. Recomendación final
Arquitectura monolítica modular, PostgreSQL, hosting PaaS gestionado, storage separado para documentos sensibles, verificación manual por admin en v1, ranking bayesiano simple, y separación estricta entre "contacto" y "contratación confirmada" en todo el copy del producto.

---

### APROBACIÓN NECESARIA
Todas las decisiones fueron aprobadas:
1. ✅ Reseña requiere `ContactInteraction` previa.
2. ✅ Pagos/destacados: manual en MVP, arquitectura preparada para pasarela futura (Mercado Pago o Stripe, a decidir según país).
3. ✅ Chat interno y feed: no en MVP, contemplados en el modelo de datos para futuras versiones.
4. ✅ Verificación telefónica: WhatsApp Business API con fallback a SMS.
5. ✅ Retención de documentos: 90 días tras baja de cuenta.
6. ✅ Stack: NestJS+TS / Next.js+Tailwind / PostgreSQL / Prisma.

Con todo aprobado, ya se puede pasar a la etapa de diseño detallado de schema (Prisma) y armado del repo inicial.
