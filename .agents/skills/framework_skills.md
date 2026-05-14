# Habilidades y Flujos de Trabajo

Aplica estos flujos de trabajo en tus razonamientos y planes de ejecución de código.

## 1. Flujo de UI y Componentes
1. Identificar necesidad de UI: ¿Necesita estado interactivo complejo?
   - **No:** Crear componente `.astro`.
   - **Sí:** Traer de Shadcn UI (`pnpm dlx shadcn-ui@latest add [nombre]`).
2. Estilizar usando utilidades de Tailwind.
3. Añadir animaciones (Motion para interacción rápida, Anime.js para experiencias inmersivas).

## 2. Flujo Backend (Supabase)
1. Estructurar la base de datos (tablas y RLS en Supabase).
2. Generar y actualizar los tipos mediante el CLI de Supabase (ej. `database.types.ts`).
3. Crear hooks o funciones de servicio tipadas (`getUsers()`, `createPost()`).
4. Si es información inicial, invocar desde el frontmatter del lado del servidor de Astro (`---`).
5. Si requiere interacción de usuario, realizar el fetch hacia endpoints API de Astro o mutaciones desde el cliente.

## 3. Flujo de Testing (Vitest)
1. Para cada lógica crítica de negocio, helpers o utilidades, crear un archivo `*.test.ts` hermano.
2. Escribir tests modulares enfocados en cubrir la funcionalidad pura.
3. Validar con `pnpm test`.

## 4. Flujo de Despliegue (Vercel)
1. Asegurar la compilación sin errores ejecutando localmente `pnpm build`.
2. Las variables de entorno (Supabase URLs, keys) deben inyectarse de forma segura sin hardcoding.

---

## ⚡ Skills Core Activadas
- **Astro Server Mastery:** SSR/SSG avanzado, Endpoints, y optimización extrema de carga de página.
- **BaaS Architect:** Configuración robusta en Supabase, uso avanzado de RLS y autenticación SSR fluida.
- **UI/UX Polishing:** Diseños de alta calidad, atención al detalle visual (Glassmorphism, sombras sutiles, paletas consistentes, animaciones asombrosas).
- **Animador Lógico:** Coordinación asombrosa de elementos interactivos con librerías de animación complejas sin sacrificar performance.
