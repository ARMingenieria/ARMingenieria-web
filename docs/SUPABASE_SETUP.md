# Integración de ARM Platform con Supabase

## Resultado de esta versión

La versión 5.3 sustituye la sesión ficticia de `localStorage` por Supabase Auth y deja preparados:

- registro con correo y contraseña;
- confirmación del correo;
- inicio y cierre de sesión;
- recuperación y cambio de contraseña;
- creación automática del perfil profesional;
- solicitud Partner pendiente de revisión;
- políticas RLS;
- acceso a aplicaciones mediante permisos;
- registro de aperturas de herramientas;
- cuenta de administrador y métricas reales.

## 1. Crear el proyecto

1. Crea un proyecto nuevo en Supabase para DESARROLLO.
2. Guarda la contraseña de la base de datos en un gestor seguro.
3. En `SQL Editor`, abre y ejecuta `supabase/schema.sql`.
4. Ejecuta `supabase/check-installation.sql` y comprueba que aparece `arm-cad` como `published`.

## 2. Configurar Authentication

En `Authentication > URL Configuration`:

- Site URL: `https://arm-ingenieria.com`
- Redirect URLs:
  - `https://arm-ingenieria.com/**`
  - `http://localhost:8788/**`

Mantén activada la confirmación de correo. En desarrollo, el proveedor de correo integrado tiene límites reducidos; antes de una apertura pública se configurará SMTP propio y Cloudflare Turnstile.

## 3. Obtener las claves correctas

En `Project Settings > API Keys` copia:

- Project URL.
- Publishable key con formato `sb_publishable_...`.

No copies ni compartas la Secret key. No se necesita para registro, perfiles, RLS ni acceso normal.

## 4. Conectar en local

Opción rápida: sustituye los marcadores de `assets/js/config.js`.

Opción recomendada con Cloudflare Pages local:

1. Copia `.dev.vars.example` como `.dev.vars`.
2. Introduce Project URL y Publishable key.
3. Ejecuta `npx wrangler pages dev .`.
4. Abre la dirección local que muestre Wrangler.

No abras las páginas mediante `file://`: los enlaces de confirmación y recuperación necesitan un origen HTTP/HTTPS.

## 5. Crear el administrador

1. Registra `alejandro@armingenieria.com` desde la web.
2. Confirma el correo.
3. Ejecuta `supabase/promote-first-admin.sql`.
4. Entra en `/admin/`.

El registro público nunca puede asignar el rol administrador.

## 6. Configurar Cloudflare Pages

En el proyecto de Cloudflare Pages añade estas variables para Production y Preview:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `PUBLIC_SITE_URL`

La Function `/api/public-config` entrega únicamente valores públicos. No almacenes claves secretas en el repositorio.

## 7. Prueba funcional obligatoria

1. Registro de usuario normal.
2. Recepción y confirmación del correo.
3. Inicio de sesión.
4. Edición del perfil.
5. Acceso a ARM CAD.
6. Cierre de sesión y bloqueo de la ruta.
7. Recuperación de contraseña.
8. Registro con interés Partner y comprobación en administración.
9. Comprobación de que un usuario normal no accede a `/admin/`.
10. Comprobación de métricas tras abrir ARM CAD.

## Límite de esta fase

La autenticación y los datos ya están protegidos por Supabase y RLS. El contenedor de ARM CAD continúa siendo un marcador. Antes de publicar el código real de la aplicación se añadirá la capa específica de entrega y validación en servidor. Ningún sistema puede impedir que el navegador inspeccione el código que recibe; por eso la lógica de mayor valor se separará hacia Workers/Functions.
