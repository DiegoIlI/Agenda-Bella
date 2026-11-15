# Resultados de pruebas (QA) · Agenda Bella v3

Fecha de las corridas: 14-nov-2026. Entorno: contenedor Linux **sin acceso a npm/Internet**, PostgreSQL 16 local, Node 22, Chromium (Playwright).
Las categorías son estrictas: **Aprobado** = se ejecutó y pasó · **Fallido** = se ejecutó y falló (y qué se hizo) · **No ejecutado** = no se corrió · **Bloqueado** = no se pudo correr aquí y por qué.

## Aprobado (ejecutado y pasó)

| Prueba | Cómo | Resultado |
|---|---|---|
| **Base de datos** (`npm run test:sql`) | PostgreSQL 16 real con *stubs* de los roles y `auth` de Supabase | **119 de 119** |
| Instalación nueva `001+002+003` y `setup_completo.sql` | base vacía | OK |
| Idempotencia (re-ejecutar 003; 001×2 + 002 + 003×2) | bases nuevas | OK |
| Actualización desde la v2 con citas existentes | fixture de la v2 original | 3 citas antes = 3 después; precios y consentimientos conservados |
| **Concurrencia**: 2 teléfonos con transacción abierta; 12 simultáneos al mismo horario; inserción directa que se cruza | procesos `psql` en paralelo | 3/3: exactamente 1 gana, 11 rechazos amables, la restricción de exclusión impide el cruce |
| Reglas de horario | `behavior.sql` | citas adyacentes sí; cruces no; servicio de 3 h bloquea 3 h; descansos, días de descanso, bloqueos (`time_off`), anticipación mínima, ventana de reservas, cancelación con anticipación mínima |
| Seguridad en la base | roles `anon`/`authenticated`/`service_role` | anon no lee citas, clientas ni consentimientos; solo `staff_users` ejecuta funciones de la dueña; el token de la cita solo da acceso a esa cita; funciones de recordatorio solo `service_role`; límite anti-spam de 3 citas activas por teléfono |
| **Recordatorios (lógica)** `npm run test:unit` | Node, con servidor WhatsApp **simulado local** por HTTP | **12 de 12**: sin credenciales no se envía y queda `pending_config`; sin consentimiento no se envía; no duplica; no reenvía lo enviado; payload de plantilla correcto (4 variables, +52); error de Meta se registra y no filtra el token; push con VAPID y limpieza de suscripciones 410 |
| **Flujo completo en navegador (E2E)** | Chromium emulando iPhone (zona segura 59/34 px) contra la app compilada en modo *live* y un servidor que imita PostgREST/Auth **sobre PostgreSQL real** | **29 de 29**: reserva → comprobante → WhatsApp; segunda clienta rechazada en horario ocupado y ve el horario bloqueado; el bloque de 3 h oculta horarios que se cruzan, también con otro servicio; login, contraseña incorrecta y cuenta no autorizada expulsada; la cita aparece en la agenda y las clientas; reprogramar libera/ocupa; cambiar precio y WhatsApp se refleja; bloqueo de día; cancelación por la clienta y vista de la dueña; notificaciones locales de la IPA (llamadas a Capacitor simuladas) |
| Interfaz en modo demostración | capturas + comprobaciones | 4 comprobaciones automáticas aprobadas (logo y menú debajo de la zona segura, validación del formulario, comprobante) y revisión visual de 16 pantallas |
| `npm run check` | secretos y archivos | OK: ningún `service_role`, token de Meta ni llave privada en `src/`, `public/` o `index.html` |

## Fallido y corregido durante el trabajo

- Pantalla de carga infinita al tocar de nuevo el servicio ya elegido → corregido.
- Aviso de "modo demostración" y botones tapaban la hora/estado del iPhone → rediseñado debajo de la zona segura.
- Prueba SQL de cancelación dependía de la fecha del día → hecha independiente de la fecha (la regla máxima de 168 h es del producto).
- Pruebas E2E con fallos por estado sobrante y por una expectativa incorrecta (una cita cancelada no muestra recordatorios) → corregidas **en la prueba**; la app no cambió en esos puntos.

## Bloqueado (no se pudo ejecutar aquí) · debes verificarlo tú

- **`npm install` / `vite build` reales**: sin red. La compilación de prueba usó esbuild con *shims*; los resultados de interfaz son de **ese** build, con React 19 (el proyecto declara React 18). Corre `npm install && npm run build` y revisa que no haya errores (el workflow `ci.yml` lo hace en GitHub).
- **Supabase real**: `supabase-js` real, Auth, Realtime, políticas RLS vía PostgREST y el panel de Supabase. Se probó SQL real y un servidor de imitación, no el servicio.
- **Edge Function en Deno**, `web-push` real, `pg_cron`/`pg_net`. Solo se probó la lógica (`lib.js`) en Node.
- **WhatsApp Cloud API real**: no hay credenciales de Meta. Ningún mensaje real se envió ni se simuló como enviado.
- **GitHub Actions** (`ci.yml`, `ios-ipa.yml`, cron) y la compilación **iOS/Xcode/Capacitor**, la IPA, SideStore, el plugin de notificaciones locales en un iPhone real y el comportamiento real de la zona segura (se emuló con 59/34 px en Chromium).
- **Safari/WebKit** y otros navegadores: solo Chromium.
- Fuentes de Google (DM Sans, Playfair): sin red se usó la alternativa del sistema; el aspecto final de la tipografía debe confirmarse con Internet.

## No ejecutado

Límite global anti-spam de 20 reservas de clientas en 10 minutos (está implementado en `book_appointment`, sin prueba automática); pruebas de carga con muchas clientas reales, auditoría de accesibilidad con lector de pantalla, revisión legal del aviso de privacidad, pruebas en Android.

## Decisiones y limitaciones conocidas

- La barra inferior dice **Clientas** (como la imagen de referencia); el texto del encargo decía "Clientes". Cambiarlo es una palabra en `src/admin/AdminApp.jsx`.
- El cliente asume la hora de Mérida como UTC−6 fija (México eliminó el horario de verano en 2022). Si cambiara la ley, hay que actualizar `BUSINESS_UTC_OFFSET` en `src/config.js` y la zona en SQL.
- Fidelidad al diseño: se comparó visualmente contra la imagen de referencia (colores, tipografía, tarjetas, calendario, barra inferior); no es una comparación píxel a píxel.
- Notificaciones locales de la IPA: ver límites en `PASO_A_PASO.md` §6.
