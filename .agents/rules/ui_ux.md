---
description: Guía de estilos y diseño visual (UI/UX)
globs: *.css, *.tsx, *.jsx
alwaysApply: true
---

# Reglas de Diseño (UI/UX) - Ctrl + Fit

El diseño de **Ctrl + Fit** sigue un sistema importado desde Stitch, anclado en un estilo **"High-Contrast Tech-Athleticism"**.

## Principios Fundamentales
- **Dark Mode First**: El fondo es oscuro y abisal (`#111508`) para que los datos y botones llamen la atención inmediatamente.
- **Atletismo Técnico**: Dirigido a atletas serios. Debe verse como un laboratorio de alta gama o gimnasio premium.
- **Minimalismo y Alto Contraste**: Sin decoraciones innecesarias, claridad funcional y estilo de "coaching digital".

## Paleta de Colores
- **Primary (Electric Lime - `#c3f400`)**: Para acciones primarias, estados de éxito y progreso activo. Representa la señal de "Go".
- **Secondary (Vibrant Blue - `#adc6ff` / `#4b8eff`)**: Para características relacionadas con la IA o gráficos.
- **Neutral (Deep Charcoal/Black)**: Fondos (`#111508`, `#1e2113`, `#333627`).
- **Data Visualization**: Grises pizarra y azules desaturados para alta densidad de datos.

## Tipografía
- **Titulares**: `Montserrat`. Estructura geométrica y atlética. Pesos gruesos (`700+`).
- **Cuerpo**: `Inter`. Legibilidad para descripciones densas.
- **Datos Numéricos**: `Montserrat Bold` con interletraje ajustado para cronómetros, repeticiones o pesos.
- **Etiquetas (Labels)**: Mayúsculas, pequeñas, con tracking amplio.

## Formas (Shapes) y Bordes
- **Redondeo "Soft" (0.25rem - 4px)**: Precisión y tecnicidad, casi rectangular. Para inputs y botones.
- **Tarjetas (Cards)**: 8px (0.5rem) de redondeo.
- **Bordes (Rim Lighting)**: Usar bordes sutiles `1px solid #262626` en lugar de sombras profundas. Sin traditional "drop shadows" a menos que se quiera destacar activamente (usar un borde *Electric Lime* si está "activo").

## Layout y Espaciado
- Espaciado en una cuadrícula fluida basada en incrementos de 4px.
- En móvil, márgenes de 16px. En escritorio de 48px.
- Alta Densidad: Todo compacto pero claramente separado por bordes finos, disminuyendo la necesidad de scroll.

## Componentes Básicos
- **Buttons**:
  - *Primario*: Fondo *Electric Lime* con texto Negro.
  - *Secundario*: Fondo transparente con borde Blanco.
- **Tarjetas (Cards)**: Superficie limpia, borde sutil. Para mostrar estadísticas o ejercicios.
- **Anillos de Progreso (Progress Rings)**: Completamente circulares. *Electric Lime* para progreso activo, fondo oscuro para track. Texto grande y centrado.
- **Campos de Entrada (Inputs)**: Fondo `#161616` con borde de `1px` gris que brilla en *Electric Lime* al estar enfocado (focus).
- **Chips**: Pequeños, para indicar grupo muscular. En `Inter` a 12px, mayúsculas.
