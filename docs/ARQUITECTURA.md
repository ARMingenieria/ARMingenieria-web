# Arquitectura ARM Platform Core v5.3

```text
Navegador
  ├─ Web pública y paneles (Cloudflare Pages)
  ├─ supabase-js con Publishable key
  └─ Sesión JWT del usuario
          │
          ▼
Supabase
  ├─ Auth: identidad, confirmación y recuperación
  ├─ PostgreSQL: perfiles, permisos, Partners y métricas
  ├─ RLS: autorización por usuario y administrador
  └─ RPC: operaciones controladas

Cloudflare Pages Functions
  └─ /api/public-config: configuración pública sin secretos
```

La Publishable key identifica al cliente web, pero no concede acceso ilimitado. Las políticas RLS y el JWT del usuario determinan qué filas y funciones puede utilizar cada cuenta.

La próxima capa separará la aplicación ARM CAD real y trasladará al servidor las operaciones o algoritmos que no deban entregarse íntegramente al navegador.
