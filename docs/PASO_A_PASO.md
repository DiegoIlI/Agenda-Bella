# Paso a paso: dejar Agenda Bella lista para clientas reales

Orden recomendado. Las partes 1–4 bastan para recibir reservaciones reales; 5–7 son opcionales y se pueden hacer después.

> Todo lo de este documento se probó en lo posible con herramientas locales, pero **nada se ha probado contra un proyecto real de Supabase, Meta, GitHub Actions ni un iPhone** (ver `QA_RESULTADOS.md`). Haz la prueba de la sección 8 antes de dar el enlace a clientas.

---

## 1. Supabase (base de datos y acceso de la dueña) · gratis

1. Crea un proyecto en <https://supabase.com> (plan Free). Elige una región cercana (p. ej. EE. UU. Este/Dallas) y guarda la contraseña de la base.
2. **SQL Editor → New query**:
   - **Proyecto nuevo** → pega todo `supabase/setup_completo.sql` y *Run* (una sola vez).
   - **Ya tenías la versión anterior instalada** → ejecuta **solo** `supabase/migrations/003_agenda_bella_v3.sql` (conserva citas, clientas y precios). No vuelvas a correr `001` después de `003`.
3. **Authentication → Users → Add user → Create new user**: correo y contraseña de la dueña (marca *Auto Confirm User*). Usa una contraseña larga y única.
4. Autoriza a esa cuenta como dueña (SQL Editor):
   ```sql
   insert into public.staff_users(user_id)
   select id from auth.users where email = 'CORREO_DE_LA_DUEÑA@ejemplo.com';
   ```
   Sin este paso la cuenta puede iniciar sesión pero **el panel la rechaza** (probado).
5. **Authentication → Sign In / Providers → Email**: desactiva *Allow new users to sign up* (nadie más debe crear cuentas).
6. **Project Settings → API**: copia *Project URL* y la clave **anon / publishable**. Son las únicas dos que usa el frontend. **Nunca** uses ni copies la `service_role`/*secret* en la app.
7. (Recomendado) **Database → Replication**: confirma que `bookings` está en `supabase_realtime` (la migración lo hace; sin esto la agenda se actualiza igual por consulta cada 45 s).

## 2. Hosting de la app web · gratis y apto para negocio

Recomendado: **Cloudflare Pages** (plan gratuito, permite uso comercial; verifica los términos vigentes). Evita GitHub Pages y el plan "Hobby" de Vercel para esto: sus términos limitan o excluyen uso comercial/transaccional.

1. Sube el proyecto a GitHub (sección 3).
2. Cloudflare → *Workers & Pages → Create → Pages → Connect to Git* → elige el repositorio.
3. Build command: `npm run build` · Output directory: `dist` · Node 22.
4. Variables de entorno (*Settings → Variables*):
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (paso 1.6)
   - `VITE_PUBLIC_BOOKING_URL` = la URL final (p. ej. `https://agenda-bella.pages.dev/`)
   - (opcional, solo PWA con push) `VITE_VAPID_PUBLIC_KEY`
5. Deploy. `public/_headers` aplica cabeceras de seguridad (CSP, HSTS, etc.). El enlace para las clientas es la URL raíz; el panel de la dueña es `URL/#/admin`.

Sin `VITE_SUPABASE_*` la app **no** se pone en modo demostración: muestra "Reservaciones no disponibles" con botón de WhatsApp, para no engañar a clientas con citas falsas.

## 3. Actualizar tu repositorio de GitHub

Desde la carpeta del proyecto descomprimido:
```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git   # si aún no lo tienes local
# copia el contenido del ZIP encima (conserva la carpeta .git) y luego:
git add -A
git commit -m "Agenda Bella v3"
git push
```
- No subas `.env`, `node_modules` ni secretos (`.gitignore` ya los excluye). `npm run check` revisa que no haya secretos en el código del navegador.
- Si no existe `package-lock.json`, el workflow *Pruebas y compilación* lo genera y lo deja como artefacto: descárgalo y súbelo al repositorio para builds reproducibles.

## 4. Datos del salón (dentro de la app)

Entra a `URL/#/admin` → **Ajustes**: WhatsApp (ya viene 999 766 6778), días y horas de trabajo, descansos, anticipación mínima, ventana de reservas, horas límite de cancelación, intervalo de horarios. **Servicios**: nombres, precios y duraciones reales (los de ejemplo son referencia). Los bloqueos de vacaciones/ausencias se hacen desde **Agenda → Bloquear**.

## 5. Recordatorios automáticos por WhatsApp (API oficial) · requiere cuenta Meta

Qué hace el código ya listo: cada 30 min revisa citas confirmadas del día siguiente (hora de Mérida), a partir de la hora configurada y antes de las 21:00; solo a clientas que marcaron el consentimiento; usa una plantilla aprobada; nunca duplica; reintenta hasta 3 veces; y registra el estado sin fingir envíos.

**Lo que tú debes conseguir (no se puede automatizar ni simular):**
1. Cuenta en **Meta Business** y una app con producto *WhatsApp* (Cloud API) en <https://developers.facebook.com>.
2. Un **número de teléfono para la API**. Importante: un número que ya usa la app WhatsApp/WhatsApp Business normalmente **no** puede usarse a la vez en la Cloud API (revisa en la documentación vigente de Meta si aplica "coexistencia" a tu caso). Lo más simple es un número nuevo solo para recordatorios; las clientas pueden seguir escribiendo al 999 766 6778 por el botón.
3. Crear y aprobar una **plantilla** categoría *Utility*, idioma `es_MX`, por ejemplo:
   `Hola {{1}}, te recordamos tu cita de {{2}} el {{3}} a las {{4}}. ¡Te esperamos!`
   (variables: nombre de pila, servicio, fecha, hora).
4. Un **token permanente** (usuario del sistema) y el **Phone Number ID**.
5. **Costo**: Meta cobra por mensaje de plantilla según país y categoría; las tarifas cambian, consúltalas en la documentación de precios de WhatsApp Business Platform. Para un salón son pocos mensajes al mes, pero no es "cero garantizado". El proyecto no activa nada de pago por sí solo.

**Instalación (cuando tengas lo anterior):**
```bash
npm i -g supabase                      # o: npx supabase ...
supabase login && supabase link --project-ref TU_PROJECT_REF
supabase secrets set CRON_SECRET="$(openssl rand -hex 32)" \
  WA_ACCESS_TOKEN="..." WA_PHONE_NUMBER_ID="..." WA_TEMPLATE_NAME="nombre_de_tu_plantilla" \
  WA_TEMPLATE_LANGUAGE="es_MX" APP_PUBLIC_URL="https://TU-DOMINIO/"
supabase functions deploy appointment-reminders
```
Luego programa la ejecución con **una** de estas opciones (usa el mismo `CRON_SECRET`):
- **pg_cron** (recomendada): activa las extensiones `pg_cron` y `pg_net` en *Database → Extensions*, edita los dos marcadores en `supabase/cron_recordatorios.sql` y ejecútalo (sin subirlo a GitHub con el secreto).
- **GitHub Actions**: secrets `REMINDERS_URL` y `CRON_SECRET`, variable `USAR_CRON_GITHUB=true` (workflow `recordatorios-cron.yml`; GitHub puede retrasar tareas programadas).

Mientras falten credenciales: las citas con consentimiento quedan en estado *pendiente de configuración*, el comprobante de la clienta dice "el envío automático aún no está activo" y en **Ajustes** aparece "WhatsApp automático pendiente de configuración". Cuando la función corre con credenciales, ese estado cambia solo.

Aviso de privacidad: `src/client/Privacy.jsx` es un texto base honesto sobre los datos que se guardan. **No es asesoría legal**; revísalo (y pon datos del responsable) conforme a la LFPDPPP.

## 6. IPA para iPhone con SideStore · gratis

1. GitHub → *Settings → Secrets and variables → Actions*: secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; variable `VITE_PUBLIC_BOOKING_URL`.
2. *Actions → Generar IPA de Agenda Bella para SideStore → Run workflow*. Usa un runner macOS: en repositorios **públicos** es gratis; en privados consume minutos con multiplicador (verifica tu cuota). Descarga el artefacto `AgendaBella-IPA-SideStore` (`AgendaBella-unsigned.ipa`, sin firmar a propósito).
3. Instala con **SideStore** (o AltStore) abriendo el `.ipa`: se firma con tu Apple ID gratuito.

**Límites reales con cuenta gratuita de Apple (no es un fallo del proyecto):**
- La firma caduca a los **7 días**; SideStore debe renovarla (necesita abrirse/estar conectado a su VPN local). Si caduca, la app deja de abrir hasta renovarla.
- Máximo 3 apps activas por Apple ID y 10 identificadores nuevos por semana.
- **No hay notificaciones push (APNs)**: requieren el programa de pago de Apple ($99 USD/año), certificado/clave APNs y firma con ese equipo. Por eso la IPA usa **notificaciones locales** (en el teléfono, sin servidor): se programan al reservar/abrir la app (el día anterior a la hora configurada y 2 h antes). Limitación: si la clienta borra la app, o si cambias o cancelas desde el panel mientras ella no abre la app, el aviso local no se actualiza hasta que abra la app. El recordatorio por **WhatsApp** (sección 5) cubre ese caso.
- Distribución a muchas clientas por TestFlight/App Store requiere la cuenta de pago. Para ellas lo práctico es el **enlace web / PWA** (Compartir → Añadir a pantalla de inicio en Safari).

## 7. Avisos web push (PWA instalada) · opcional

Genera llaves una vez: `npx web-push generate-vapid-keys`. Pública → `VITE_VAPID_PUBLIC_KEY` (hosting) y secret `VAPID_PUBLIC_KEY`; privada → solo `supabase secrets set VAPID_PRIVATE_KEY=... VAPID_SUBJECT="mailto:tu@correo"`. En iPhone el push web solo funciona con la PWA **añadida a la pantalla de inicio** (iOS 16.4+) y con permiso de la clienta; en Safari normal la app explica por qué no está disponible.

## 8. Prueba de humo antes de abrir al público (15 min)

1. Abre el enlace en tu teléfono y reserva un servicio. Debe llegar el comprobante.
2. Abre `#/admin`, inicia sesión: la cita aparece sola.
3. Desde otro navegador intenta reservar **el mismo horario**: debe rechazarlo; reserva otro horario dentro de las 3 h del Balayage: también.
4. Cancela desde el enlace del comprobante y verifica que la dueña ve "Cancelada" y que el horario vuelve a estar libre.
5. Con una cuenta de Auth que **no** esté en `staff_users`, comprueba que el panel la rechaza.
6. En Ajustes cambia el WhatsApp y confirma que el botón de clientas cambia; restáuralo a 999 766 6778.
7. Borra las citas de prueba (Agenda → editar → cancelar) o desde SQL: `delete from public.bookings where client_name like 'Prueba%';`.
