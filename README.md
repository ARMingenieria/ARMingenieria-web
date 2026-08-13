# ARM Platform Core v5.3 — Supabase

Base modular con autenticación real preparada para Cloudflare Pages y Supabase.

## Incluye

- Supabase Auth: registro, confirmación, acceso, cierre de sesión y recuperación.
- Perfil profesional creado automáticamente desde `auth.users`.
- Solicitud Partner pendiente de validación.
- Roles `user` y `admin`, estados de cuenta y permisos por aplicación.
- RLS en todas las tablas expuestas.
- ARM CAD publicado para usuarios registrados mediante `can_access_application`.
- Registro de uso y panel administrador con métricas.
- Configuración pública por Cloudflare Function `/api/public-config`.
- SQL de instalación, promoción del primer administrador y comprobación.

## Activación

Lee `docs/SUPABASE_SETUP.md`. La aplicación no puede conectarse hasta introducir la Project URL y la Publishable key de un proyecto Supabase.

## Estado validado

Se ha realizado validación estática de estructura, JavaScript y SQL. No se ha podido completar una prueba funcional contra Supabase porque este ZIP no contiene credenciales de ningún proyecto real.

## Seguridad

- La Publishable key es pública y solo funciona correctamente con RLS.
- No se incluye ni se necesita ninguna Secret key en el navegador.
- El rol administrador no puede asignarse desde el registro.
- El acceso de datos se controla en PostgreSQL, no solo ocultando botones.
- ARM CAD real todavía no está incluido: su protección de código se desarrolla en la fase siguiente.
