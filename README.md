# ARM Ingeniería Web v2.0.2

Dominio: https://arm-ingenieria.com

## Estructura

- `/` Web corporativa
- `/software/` Biblioteca de software
- `/software/hvac-pro18/` Ficha de la primera aplicación
- `/software/hvac-pro18/app.html` Aplicación HVAC PRO18
- `/guias/` Biblioteca de guías
- `/blog/` Blog técnico

## Cómo publicar un artículo

1. Copia `blog/plantilla-articulo.html`.
2. Crea una carpeta, por ejemplo: `blog/gasolina-sintetica-aire-agua/`.
3. Guarda el archivo como `blog/gasolina-sintetica-aire-agua/index.html`.
4. Añade una tarjeta en `blog/index.html`.
5. Añade la URL al `sitemap.xml`.

## Cómo añadir una nueva app

1. Crea carpeta en `software/nombre-app/`.
2. Añade `index.html` como ficha.
3. Añade `app.html` como aplicación.
4. Añade su guía en `guias/nombre-app/`.
5. Actualiza `software/index.html`, `guias/index.html` y `sitemap.xml`.

## GitHub Pages

Subir todo el contenido del ZIP a la raíz del repositorio. El archivo `CNAME` debe permanecer en la raíz.
