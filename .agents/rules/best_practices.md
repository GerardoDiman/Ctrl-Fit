# Mejores Prácticas y Patrones de Arquitectura

Estas reglas definen los procesos base y convenciones que DEBEN seguirse durante todo el ciclo de vida del desarrollo.

## 1. Verificación y Reusabilidad de Componentes (DRY)
- **Regla de Oro:** Antes de crear un nuevo componente, SE DEBE buscar e inspeccionar el directorio `src/components/` para verificar si ya existe un componente (o una variante del mismo) que resuelva la necesidad.
- Si el componente ya existe, se debe **reutilizar**. Si le falta alguna funcionalidad menor, se debe extender añadiéndole nuevas `props` de manera retro-compatible para no romper otras vistas donde ya se utiliza.
- Si no existe, se creará uno nuevo. Al crearlo, debe diseñarse de forma modular y agnóstica para que otros desarrollos futuros puedan aprovecharlo.
- **Estructura:** Los componentes puramente visuales y base (Shadcn) se almacenan en `src/components/ui/`. Los componentes específicos de reglas de negocio se agrupan por dominio funcional.

## 2. Gestión de Estado entre Islas (Astro)
- Dado que Astro utiliza una Arquitectura de Islas, los componentes de framework (como los de React de Shadcn) renderizan de forma aislada.
- **Regla:** Para compartir estado global y reactividad *entre diferentes islas* (por ejemplo: sincronizar el carrito de compras, el usuario autenticado, o el tema claro/oscuro de la UI), **se debe utilizar Nanostores** (`@nanostores/react`). 
- Prohibido intentar usar `React Context` para compartir estado a nivel global entre distintas islas de Astro, ya que los contextos no cruzan los límites de las islas.

## 3. Feedback Visual y Manejo de Errores
- Ningún error de backend (Supabase) o proceso asíncrono debe fallar silenciosamente.
- Toda operación de mutación de datos debe manejar errores explícitamente (`try/catch`).
- Se debe retroalimentar invariablemente al usuario el resultado de su acción (sea éxito o error) utilizando el componente estándar de notificaciones (ej. el `Toaster` de Shadcn UI / Sonner).

## 4. Convenciones de Nomenclatura (Naming Conventions)
- **Componentes (Astro y React):** `PascalCase` (ej. `ProjectCard.tsx`, `Navigation.astro`).
- **Funciones y utilidades:** `camelCase` (ej. `formatDate.ts`, `useAuth()`).
- **Tipos / Interfaces:** `PascalCase` y altamente descriptivos (ej. `UserProfile`, `BillingDetails`).

## 5. Refactorización y Límites de Complejidad (Archivos Extensos)
- **Principio de Responsabilidad Única:** Todo componente, vista o función debe tener un único propósito claro.
- **Límite Visual de Longitud:** Si un archivo (componente o vista) se acerca o supera las **250-300 líneas de código**, es un indicador estricto de que debe ser refactorizado.
- **Estrategia de Refactorización Activa:**
  - **Lógica Compleja:** Extraer consultas a Supabase, manipulación de datos o estados complejos hacia **Hooks personalizados** (React) o funciones en directorios como `src/lib/` o `src/services/`.
  - **Estructura UI:** Extraer bloques lógicos de interfaz en **sub-componentes** más pequeños. (Ejemplo: Un `Dashboard.astro` no debe contener toda la maqueta, sino importar `<Sidebar />`, `<MetricsWidget />`, `<RecentActivity />`).
