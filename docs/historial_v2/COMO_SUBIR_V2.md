# SUBIR A GITHUB Y GENERAR IPA — Agenda Bella v2 Premium

## Ya tienes el repo `Agenda-Bella` de la versión anterior

**La forma más fácil es actualizar los archivos de `src`:**

1. Descarga el ZIP llamado `Agenda_Bella_v2_SOLO_ACTUALIZACION.zip`.
2. Descomprímelo en tu PC. Dentro está la carpeta `src`.
3. Abre tu repositorio de GitHub desde la computadora.
4. Ve a **Add file → Upload files**.
5. Arrastra la carpeta `src` (o su contenido conservando las rutas). GitHub debería proponer reemplazar `src/main.jsx` y agregar `src/PremiumApp.jsx`, `src/premium.css` y `src/assets/salon-ambiente.jpg`.
6. Verifica que **NO** termine en `AgendaBella_v2/src/...` sino directamente en `src/...`.
7. Presiona **Commit changes**.
8. Abre **Actions → Generar IPA de Agenda Bella para SideStore → Run workflow**.
9. Si sale verde, abre la ejecución y descarga el ZIP de `Artifacts` llamado `AgendaBella-IPA-SideStore`; dentro estará la IPA sin firmar para importar a SideStore.

Si GitHub no acepta arrastrar la carpeta, crea cada archivo por **Add file → Create new file** con estos nombres: `src/PremiumApp.jsx`, `src/premium.css`, `src/main.jsx`. El JPG `src/assets/salon-ambiente.jpg` debe subirse con **Upload files**; no es texto.

## Todavía no has creado el repositorio

Usa `Agenda_Bella_v2_Premium_COMPLETO.zip`. Súbelo descomprimido, con `package.json` en la raíz. La carpeta oculta `.github` se puede crear desde GitHub escribiendo el nombre `.github/workflows/ios-ipa.yml` en **Add file → Create new file** y pegando el contenido del archivo incluido en este proyecto.

## Diferencia entre GitHub, Cloudflare, Supabase y SideStore

- **GitHub:** guarda el código y ejecuta el proceso de compilación de la IPA.
- **Cloudflare Pages:** publica la web donde reservan las clientas.
- **Supabase:** guarda las citas compartidas entre teléfonos, protegiendo el panel de administración.
- **SideStore:** firma/instala la IPA en tu iPhone.

**Sin Supabase y sin el backend de recordatorios, lo instalado seguirá en modo demo.** Instalar la IPA no configura automáticamente WhatsApp ni las notificaciones nativas. Para configurar estas funciones, continúa con `README.md`.

Si deseas compartir desde la IPA el enlace de la web, configura la variable de Actions `VITE_PUBLIC_BOOKING_URL` con el enlace HTTPS de Cloudflare Pages.
