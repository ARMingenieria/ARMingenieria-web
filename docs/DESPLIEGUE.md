# Despliegue previsto

## Repositorios

- `ARMingenieria-web`: web pública y ARM Platform Core.
- `ARM-CAD`: aplicación privada e independiente.
- Un repositorio privado por cada herramienta adicional.

## Cloudflare Pages

1. Conectar el repositorio de ARM Platform.
2. Directorio de salida: raíz del proyecto.
3. Configurar las variables públicas de Supabase.
4. Mantener cualquier secreto únicamente en variables de servidor.
5. Probar primero en un subdominio de desarrollo.

## Dominios recomendados

- `arm-ingenieria.com`: parte pública.
- `app.arm-ingenieria.com`: cuenta, herramientas y área privada cuando se separe el despliegue.
- `admin.arm-ingenieria.com`: administración en una fase posterior o ruta protegida independiente.

## Antes de producción

- Sustituir `localStorage` por Supabase Auth.
- Revisar políticas RLS en un proyecto de pruebas.
- Validar recuperación de contraseña y confirmación de correo.
- Añadir rate limiting y protección antiabuso.
- Revisar textos legales y domicilio profesional con asesoramiento adecuado.
- Verificar cabeceras de seguridad y CSP en Cloudflare.
