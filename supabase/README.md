# SQL de LCL Control Center

Todos los scripts SQL del proyecto. Se corren en **Supabase → SQL Editor**
(proyecto ref `licxcyadmdxpywrigexb`). Son idempotentes salvo los seeds.

## Orden de ejecución (proyecto nuevo)

1. `supabase-schema.sql` — esquema base (profiles, companies, projects, tasks…)
2. `phase1_migration.sql` · `phase2_migration.sql` · `workspace_docs_migration.sql` — migraciones viejas del flujo de documentos (ya no se usa, se dejan por historia)
3. `task_recurrence_migration.sql` — recurrencia/frecuencia de tareas
4. `vault_migration.sql` — tabla del Vault de contraseñas (RLS solo admins)
5. `agenda_migration.sql` — Agenda: `audits` (sin uso) + `indicators`
6. `roles_events_migration.sql` — visibilidad de tareas (`oculta_tareas`) + `events`/`event_attendees`
7. `notifications_migration.sql` — campana de notificaciones in-app

## Seeds / utilidades (no idempotentes)

- `seed-data.sql` — datos de ejemplo.
- `check_usuarios_isabel.sql` — consulta de usuarios / fix nombre Isabel.
- `vault_seed.local.sql` — **NO versionado** (contiene contraseñas reales; el repo es público). Carga las credenciales del PDF al Vault. Correr después de `vault_migration.sql`.

## Pendientes de correr (Jul 16 2026)

- `roles_events_migration.sql`
- `notifications_migration.sql`
