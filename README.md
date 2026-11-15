# Agenda Bella · Beauty Studio (v3)

Sistema de reservaciones para el salón (cabello y uñas, Mérida, Yucatán). Mantiene la base React + Vite + Supabase + Capacitor de la versión anterior.

- **Clientas**: abren el enlace, eligen servicio, fecha y hora libre, escriben nombre y teléfono, confirman y reciben un comprobante (con botón de WhatsApp, "guardar en calendario" y cancelación por enlace privado).
- **Dueña**: panel privado (`#/admin`) con agenda de día/semana/mes, citas próximas, clientas con historial, servicios (precio y duración), horarios, descansos, bloqueos y ajustes. Cada reserva aparece sola (tiempo real + respaldo cada 45 s).
- **Sin empalmes**: la base de datos bloquea cualquier cita que se cruce, aun con muchas clientas a la vez (restricción de exclusión en PostgreSQL). Un servicio de 3 h bloquea 3 h.
- **WhatsApp**: botón al 999 766 6778 (editable en Ajustes). Recordatorios automáticos el día anterior con la API oficial de WhatsApp Business, solo con consentimiento y plantilla aprobada. **Hasta que se configuren las credenciales de Meta no se envía nada, y la app lo dice con honestidad.**
- **Avisos en el teléfono**: en la IPA se programan notificaciones locales (no requieren APNs ni cuenta de pago de Apple); en la PWA instalada, Web Push.

## Empezar

| Quieres… | Lee |
|---|---|
| Ponerlo en marcha con clientas reales (Supabase, hosting, GitHub, IPA) | **[docs/PASO_A_PASO.md](docs/PASO_A_PASO.md)** |
| Saber qué se probó, qué no y qué falta | **[docs/QA_RESULTADOS.md](docs/QA_RESULTADOS.md)** |
| Ver la app sin Supabase | `cp .env.demo .env && npm install && npm run dev` (modo demostración, datos solo en el navegador) |

## Comandos

```bash
npm install
npm run dev            # desarrollo (necesita .env con Supabase) · npm run dev:demo = datos de ejemplo
npm run build          # producción · npm run build:demo
npm run check          # valida archivos y que no haya secretos en el código del navegador
npm run test:unit      # recordatorios (Node, sin red)
npm run test:sql       # pruebas contra PostgreSQL (requiere psql/createdb; ver tests/sql)
npm run sync:ios       # compila y sincroniza Capacitor
```

## Estructura

```
src/client      Reservas y comprobante          src/admin    Panel de la dueña
src/api         live.js (Supabase) · demo.js     src/notifications.js  Avisos
supabase/setup_completo.sql   Instalación nueva (001+002+003)
supabase/migrations           001, 002 y 003 (003 actualiza una base v2 sin perder citas)
supabase/functions/appointment-reminders   Edge Function (lib.js = lógica probada)
supabase/cron_recordatorios.sql            Programación (pg_cron)
.github/workflows             ci.yml · ios-ipa.yml · recordatorios-cron.yml (alternativa)
tests/{sql,unit,ui}           Pruebas · docs/historial_v2  Documentos y archivos de la versión anterior (conservados)
```

## Seguridad (resumen)

El navegador solo recibe la URL y la clave pública (anon) de Supabase. Las tablas sensibles no se pueden leer sin sesión: la clienta solo accede a su cita con un enlace secreto (va en el `#`, no se envía al servidor); la dueña entra con correo y contraseña y su usuario debe estar en `staff_users`. Tokens de Meta, `service_role` y llaves VAPID privadas viven únicamente en los *secrets* de la Edge Function.
