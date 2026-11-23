# Bella Design System

Sistema visual de Agenda Bella. Fuente única: [`src/styles/tokens.css`](../src/styles/tokens.css).
Se construyó con las skills instaladas en `.claude/skills/`: **ui-ux-pro-max** (estilo, tipografía, reglas de UX y accesibilidad), **design-system** (tokens en tres capas), **brand** (identidad y paleta como fuente única) y **ui-styling** (variables CSS por rol, estados y accesibilidad de componentes; sin adoptar Tailwind/shadcn).

## Dirección visual

- **Estilo:** *Soft UI Evolution* (recomendado por ui-ux-pro-max para belleza y bienestar): sombras suaves, contraste medido, foco visible, transiciones de 160–240 ms.
- **Tipografía:** *Classic Elegant*. **Playfair Display** solo para marca y títulos emotivos (hero, comprobante); **Inter** para todo lo demás, con cifras tabulares en horas y precios. Ambas servidas desde el propio sitio (`@fontsource`), sin Google Fonts.
- **Paleta:** burdeos de marca, neutros con tinte rosado, dorado como acento puntual. Se descartó la paleta rosa `#EC4899` que sugirió la skill: con texto blanco da 3.5:1 y no cumple AA.

## Tres capas

| Capa | Ejemplos | Quién la cambia |
|---|---|---|
| **1 · Primitivos** | `--brand-600`, `--neutral-50`, `--gold-700` | Cada salón (su marca) |
| **2 · Semánticos** | `--color-primary`, `--text-muted`, `--space-4`, `--radius-lg`, `--dur-base` | Nadie por salón; solo al evolucionar el sistema |
| **3 · Componente** | `--slot-selected`, `--appt-rail`, `--btn-primary-bg` | Ajustes finos de una pieza |

Los componentes (`app.css`) **solo leen semánticos y de componente**. `npm run check` falla si alguien escribe a mano un color, tamaño de letra, radio o sombra fuera de `tokens.css`.

## Escalas

- **Texto (7 pasos, base 16 px):** 12 · 14 · 16 · 18 · 24 · 36 · 44. Ningún texto de lectura por debajo de 12 px. Única excepción: el subtítulo del logotipo (10 px), que cuenta como logotipo (WCAG 1.4.3).
- **Espaciado (base 4):** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64.
- **Radios:** 8 · 12 · 16 · 24 · píldora (antes había 15 valores distintos).
- **Elevación:** `xs` (control activo), `sm` (tarjeta), `md` (barras fijas), `lg` (hojas y menú); más `brand` para el botón principal (antes, 14 sombras distintas).
- **Movimiento:** `instant` 100 ms (respuesta al tocar), `fast` 160 ms (selección, salida), `base` 240 ms (entrada de hojas y menú), `slow` 360 ms (confirmaciones). Entrada con `ease-out`, salida con `ease-in` y más corta. Solo `transform` y `opacity`. Con *reducir movimiento* todo llega a su estado final al instante.
- **Área táctil:** mínimo 44 × 44 px (`--target-min`). La prueba automática lo exige en botones, horarios, servicios, pestañas y botones redondos.

## Contraste verificado (WCAG 2.1)

| Par | Contraste |
|---|---|
| Texto fuerte sobre fondo | 15.8 : 1 |
| Texto de cuerpo sobre fondo | 10.1 : 1 |
| Texto atenuado sobre fondo / sobre selección | 6.2 : 1 / 5.1 : 1 |
| Blanco sobre botón principal | 6.7 : 1 (5.0 : 1 en el punto más claro del degradado) |
| Burdeos fuerte sobre píldora rosa | 7.0 : 1 |
| Éxito / aviso / error / información sobre su fondo | 5.2 / 7.0 / 5.5 / 8.7 : 1 |
| Borde de campos sobre blanco (componente, 3 : 1) | 3.3 : 1 |

Los estados nunca se comunican solo con color: llevan texto («Confirmada», «Cancelada») o ícono.

## Cómo crece hacia varios salones

**Hoy (despliegue por salón):** cada salón tendrá su propio archivo de marca. En la Fase 2 se redefinirán solo los primitivos `--brand-*` y `--neutral-*`, además del nombre, el logo, la foto, la zona horaria y la moneda. El resto del sistema no cambia.

**Mañana (plataforma con cuentas):** los primitivos son variables CSS, así que una cuenta puede cargar su marca en tiempo de ejecución:

```js
// Ejemplo de lo que hará la plataforma al cargar la configuración de un salón
for (const [k, v] of Object.entries(salon.theme)) document.documentElement.style.setProperty(`--${k}`, v);
```

Esto no requiere recompilar ni tocar componentes. Antes de aplicarse, la plataforma deberá validar que el color de marca mantenga 4.5:1 con texto blanco.

**Modo oscuro del panel (fase posterior):** bastará con redefinir la capa semántica bajo `.admin[data-theme="dark"]`. La vista de clientas se queda en claro, como recomienda la skill para productos de belleza.

## Pruebas

- `npm run check`: archivos completos, sin secretos y sin valores visuales sueltos.
- `npm run test:e2e`: recorrido completo en móvil (390 px) y escritorio (1440 px) sobre el modo demostración. Cubre la reserva con validación, el comprobante, la cancelación, Mi cuenta y la privacidad; y en el panel, las vistas Día/Semana/Mes, la cita manual, la edición y cancelación, el bloqueo y las pestañas. También revisa que no haya desplazamiento horizontal, errores de consola ni objetivos táctiles menores a 44 px (`E2E_STRICT_TARGETS=1`). Las capturas quedan en `tests/e2e/capturas/`, y en la CI como artefacto.
