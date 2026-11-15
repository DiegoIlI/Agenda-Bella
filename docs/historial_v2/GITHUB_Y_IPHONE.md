# INSTALAR EN iPHONE CON SIDESTORE — Agenda Bella v2.0 Premium

Esta versión incluye `capacitor.config.json` y `.github/workflows/ios-ipa.yml`.
GitHub Actions intentará generar **un IPA sin firmar** desde React + Capacitor. Este empaquetado requiere un runner macOS con Xcode y acceso a npm. **No se ha compilado un IPA real en este entorno**; la ejecución en GitHub es la prueba definitiva.

## Subir a GitHub (desde computadora)
1. Descomprime este ZIP.
2. En GitHub crea repositorio `Agenda-Bella` (puede ser privado).
3. En el repo pulsa **Add file > Upload files** y arrastra **todo el contenido de esta carpeta**, no la carpeta en sí, para que `package.json` quede en la raíz.
4. Asegúrate de que la carpeta oculta `.github/workflows/` también se subió. En Windows debes activar **Elementos ocultos** para verla.
5. Pulsa **Commit changes**.
6. Revisa **Settings > Actions > General** para permitir workflows, si aparecen deshabilitados.

## Crear e instalar IPA
1. Abre el repo en GitHub, pestaña **Actions**.
2. Busca **Generar IPA de Agenda Bella para SideStore**.
3. Pulsa **Run workflow**, rama `main`, y después **Run workflow**.
4. Si el resultado es verde, abre esa ejecución y descarga el artifact **AgendaBella-IPA-SideStore**: GitHub entrega un archivo ZIP con `AgendaBella-unsigned.ipa` dentro.
5. En tu iPhone, descarga ese ZIP y descomprímelo desde **Archivos**. Conserva el archivo `.ipa`.
6. En **SideStore > My Apps > +** importa `AgendaBella-unsigned.ipa` y sigue las indicaciones de firma e instalación.

**IMPORTANTE**
- No subas `node_modules`, `.env` ni claves secretas a GitHub.
- IPA unsigned != IPA instalable sin firma. SideStore debe firmar la app con tu cuenta Apple para tu dispositivo.
- Con Apple ID gratuito, la firma normalmente expira a los 7 días y hay un límite de apps; necesitarás refrescar.
- El IPA de prueba muestra la app y las reservas que existan en Supabase (si configuraste las variables). Sin Supabase funciona en modo demo **solo en ese teléfono**.
- **Web Push PWA no funciona igual dentro de la IPA**: las notificaciones push nativas requieren programación adicional con APNs y aprovisionamiento válido de Apple. Por ahora prueba notificaciones en la PWA instalada desde Safari. WhatsApp automático requiere Meta Cloud API, plantilla y el backend de recordatorios configurados.
- La creación de la IPA en GitHub Actions no publica el sitio web para clientas: para ellas configura Cloudflare Pages + Supabase siguiendo `README.md`.

## Dónde agregar variables de Supabase para que la IPA sea real
En GitHub: **Settings > Secrets and variables > Actions > New repository secret**:
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (son valores públicos de proyecto, no `service_role`).
Vuelve a ejecutar el workflow. **Nunca** pongas secretos de Meta, claves VAPID privadas o contraseñas de servidor en variables `VITE_`.

## Si el workflow falla
Abre la ejecución fallida > tarea **Compilar IPA iOS sin firmar** y copia el error. Las causas pueden ser incompatibilidad de Xcode/CocoaPods, dependencias de npm, o un fallo del código. Como no se ha validado el build en un runner Mac, no se garantiza que salga verde la primera vez.

## Compartir reservas desde la IPA

Si ya publicaste el sitio para las clientas, ve a GitHub **Settings > Secrets and variables > Actions > Variables > New repository variable**.
Agrega **VITE_PUBLIC_BOOKING_URL** con la URL HTTPS pública del salón (por ejemplo, `https://mi-salon.pages.dev/`).
De lo contrario, el botón «Copiar enlace de reservas» de la IPA te indicará que falta la URL pública. Compartir `capacitor://localhost` no sirve para las clientas.

Recuerda: una IPA **no publica** la página web; la web para clientas se publica aparte (por ejemplo, Cloudflare Pages).
