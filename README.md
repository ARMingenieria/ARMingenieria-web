# ARM Platform Core v5.4

Base pública de ARM Ingeniería con autenticación real Supabase, área privada, protección de herramientas y administración operativa.

## Novedades v5.4

- Área privada de usuario conectada a su perfil real.
- Catálogo de herramientas disponible calculado según permisos de Supabase.
- Enlace de administración visible únicamente para administradores.
- Protección de ARM CAD por sesión + permiso de aplicación.
- Panel administrativo con usuarios, estados, roles, actividad y solicitudes Partner.
- Gestión individual de acceso a ARM CAD.
- Auditoría de acciones administrativas.
- Migración incremental: `supabase/migration-v5.4-admin.sql`.

## Despliegue

1. Sustituir en el repositorio web el contenido por esta versión conservando `.git` y `CNAME`.
2. Ejecutar una sola vez `supabase/migration-v5.4-admin.sql` en Supabase.
3. Promover la primera cuenta con `supabase/promote-first-admin.sql`.
4. Commit + Push a GitHub.

La Publishable Key incluida en `assets/js/config.js` es pública por diseño. No hay Secret Key ni `service_role` en el frontend.
