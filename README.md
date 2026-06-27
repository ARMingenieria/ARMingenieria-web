# ARM Ingeniería · Web v1.1

Proyecto web estático preparado para GitHub Pages.

## Archivos principales

- `index.html`: página principal optimizada para SEO.
- `styles.css`: estilos visuales y responsive.
- `app.js`: menú móvil, animaciones suaves y comportamiento básico.
- `robots.txt`: reglas para rastreadores.
- `sitemap.xml`: mapa del sitio para Google Search Console.
- `manifest.webmanifest`: configuración PWA básica.
- `assets/`: logotipo, favicons e imagen para compartir.

## Publicación en GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube todos los archivos y carpetas de este proyecto.
3. En `Settings > Pages`, selecciona la rama `main` y carpeta `/root`.
4. Espera a que GitHub genere la URL pública.

## Ajuste importante de URL

La web está preparada inicialmente para:

`https://armingenieria.github.io/ARMingenieria-web/`

Si GitHub te da otra dirección, sustituye esa URL en:

- `index.html` dentro de `canonical`, `og:url`, `og:image`, `twitter:image` y JSON-LD.
- `robots.txt`.
- `sitemap.xml`.

## Google

Cuando esté publicada:

1. Añade la URL en Google Search Console.
2. Envía `sitemap.xml`.
3. Solicita indexación de la página principal.
4. Añade la URL en Google Business Profile.

## Google Analytics 4

Cuando tengas tu ID `G-XXXXXXXXXX`, se puede integrar el script en `index.html` antes de `</head>`.
