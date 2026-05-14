# Reglas del Stack Tecnológico

1. **Gestión de Paquetes Exclusiva con pnpm**
   - Toda instalación, actualización o ejecución de scripts se realizará a través de `pnpm` (ej. `pnpm add`, `pnpm dev`, `pnpm dlx`).
2. **TypeScript Estricto (Strict Mode)**
   - Todo el código debe ser fuertemente tipado.
   - Evitar el uso de `any`. Las respuestas de las bases de datos, APIs y las `props` de componentes deben tener sus respectivas interfaces/tipos.
3. **Astro + Arquitectura de Islas**
   - Priorizar el renderizado en el servidor (HTML estático/SSR).
   - Los componentes que contengan estado o interactividad en el cliente (ej. componentes React de Shadcn UI) deben hidratarse usando directivas (`client:load`, `client:visible`, `client:idle`) solo cuando sea estrictamente necesario.
4. **Seguridad y Manejo de Datos (Supabase)**
   - NUNCA exponer la `SERVICE_ROLE_KEY` del backend en el frontend. Usar siempre la `ANON_KEY` de Supabase.
   - Asegurar todas las tablas con Políticas de Seguridad por Filas (**RLS**).
   - Utilizar el tipado de TypeScript generado desde el CLI de Supabase para tener autocompletado en consultas.
5. **Estilos Premium (Tailwind + Shadcn)**
   - Usar la utilidad `cn` (que combina `clsx` y `tailwind-merge`) para todas las clases condicionales.
   - Evitar CSS tradicional, apoyándose puramente en utilidades de Tailwind para mantener un diseño cohesivo y un sistema de diseño estructurado.
6. **Coreografía de Animaciones (Motion & Anime.js)**
   - **Motion:** Usado para micro-interacciones directas (hover, focus, tap, fade in/out simple).
   - **Anime.js:** Usado para animaciones coreografiadas complejas, timelines secuenciales del DOM, manipulación de SVG y animaciones en base a cálculos matemáticos.
