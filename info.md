Inicialización de Proyecto SvelteKit + Cloudflare
Seguiré los pasos solicitados para configurar el proyecto en la carpeta raíz, utilizando las opciones seleccionadas (TypeScript + ESLint).
Pasos de Implementación
1.  Crear Proyecto SvelteKit
    *   Ejecutar npx sv create . --template minimal --types ts --add eslint --no-install --no-dir-check en la raíz.
    *   Esto inicializará el proyecto "Skeleton" con TypeScript y ESLint sin crear una subcarpeta.
2.  Instalar Dependencias
    *   Ejecutar npm install para instalar las dependencias base.
3.  Instalar Adaptador Cloudflare
    *   Ejecutar npm install -D @sveltejs/adapter-cloudflare 
4.  Configurar svelte.config.js
    *   Modificar svelte.config.js para reemplazar adapter-auto con adapter-cloudflare.
    *   Asegurar que la configuración coincida con el ejemplo proporcionado (incluyendo vitePreprocess).
5.  Verificación
    *   (Opcional) Ejecutar una prueba rápida de construcción para asegurar que la configuración es válida.
