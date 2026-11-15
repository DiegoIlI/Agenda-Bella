# Agenda Bella · Sitio premium + reservaciones en una sola URL

**Esta entrega contiene el proyecto REAL de Agenda Bella v3.1 que subiste**, más un nuevo sitio público editorial premium. No se borraron la agenda, los SQL ni la carpeta de GitHub Actions.

## Resultado final

Cuando publiques en Cloudflare Pages, tendrás dos destinos bajo el **mismo dominio**:

- `https://NOMBRE-ELEGIDO.pages.dev/` — el sitio público elegante, galería, servicios, WhatsApp y preguntas frecuentes.
- `https://NOMBRE-ELEGIDO.pages.dev/reservar/` — la aplicación de citas REAL de Agenda Bella v3.1 (clientas y panel privado).

Todos los botones **Reservar cita** del sitio abren `/reservar/`. No hace falta que las clientas instalen IPA, SideStore ni LiveContainer. El panel de la estilista seguirá en `https://NOMBRE-ELEGIDO.pages.dev/reservar/#/admin`.

## MUY IMPORTANTE: GitHub NO publica automáticamente tu página

Subir el código a GitHub conserva el proyecto; **para obtener una URL compartible necesitas publicar con un hosting**, por ejemplo Cloudflare Pages. Este paquete no crea por sí solo una URL pública.

## Paso 1. Subir la actualización a tu MISMO repositorio

1. Descomprime el ZIP completo que descargaste.
2. Abre **GitHub Desktop**, selecciona `Agenda-Bella`, presiona `Repository > Show in Explorer`.
3. Copia el **contenido** de este ZIP dentro de la carpeta local `Agenda-Bella`, reemplazando archivos cuando pregunte Windows. NO copies toda la carpeta exterior como subcarpeta.
4. Conserva `.git` (es el historial), y comprueba que se vea `website/` junto con `src/`, `public/`, `supabase/`, `package.json` y `.github/`.
5. De vuelta en GitHub Desktop: `Changes` → `Commit to main` → `Push origin`.

**No borres el repositorio anterior.** La nueva carpeta principal `website/` contiene la web. El resto continúa siendo la aplicación.

## Paso 2. Publicar el sitio Y la app con UNA URL

1. Abre https://dash.cloudflare.com/ y crea una cuenta gratuita si no tienes.
2. Entra a **Workers & Pages** → **Create application** / **Create** → **Pages** → **Import an existing Git repository** (los nombres pueden variar según la interfaz).
3. Conecta GitHub y elige `Agenda-Bella`.
4. Configura el despliegue con estas opciones:

| Campo de Cloudflare Pages | Valor |
|---|---|
| Production branch | `main` |
| Framework | Vite o None (configuración manual) |
| Root directory | vacío / raíz del repositorio |
| Build command | `npm run build:site` |
| Build output directory | `dist` |
| Node version | 22 (`NODE_VERSION=22` si tu cuenta lo requiere) |

5. ANTES de desplegar, agrega estas **variables de entorno de compilación** del proyecto Pages:

   - `VITE_SUPABASE_URL` = la URL `https://...supabase.co` de tu proyecto.
   - `VITE_SUPABASE_ANON_KEY` = tu clave **pública** `sb_publishable_...`.

   **CLAVE:** Los secretos que antes pusiste en *GitHub Actions* para generar la IPA **NO se copian automáticamente a Cloudflare**. Es necesario configurar estas dos variables también en Pages. **No uses `service_role`, `sb_secret_`, contraseñas ni tokens privados** aquí.

6. Haz clic en **Save and Deploy**. Cuando termine, Cloudflare te dará tu URL `https://<nombre>.pages.dev/`.
7. Verifica tanto `/` como `/reservar/`. Haz una reserva de prueba y confirma que se vea en la agenda de tu mamá desde otro teléfono.

Si el despliegue ya existía, edita el **Build command** y las **Environment variables** en Settings y lanza un nuevo despliegue.

## Paso 3. Compartir

- Comparte la dirección principal `https://<nombre>.pages.dev/` en WhatsApp, Instagram, Facebook, tarjetas y QR.
- Comparte `https://<nombre>.pages.dev/reservar/` si quieres enviar directamente a la clienta a reservar.
- Cuando ya tengas la URL pública, configura en **GitHub → Settings → Secrets and variables → Actions → Variables** la variable `VITE_PUBLIC_BOOKING_URL` con `https://<nombre>.pages.dev/reservar/` para que el botón “Copiar enlace” de la IPA comparta la web correcta; vuelve a generar la IPA después.
- La app se puede añadir a la pantalla de inicio desde Safari/Chrome. Las clientas **NO** necesitan LiveContainer.
- Un dominio personalizado (`agendabella.mx`, por ejemplo) es opcional, puede costar y **no se ha comprobado que esté disponible**.

## Personalizar las fotos y datos reales

Archivos que puedes reemplazar cuando tomes fotos originales:

- `website/public/images/salon-interior.webp`
- `website/public/images/color-balayage.webp`
- `website/public/images/unas-manicura.webp`
- `website/public/images/peinado-profesional.webp`

Actualmente son **imágenes ilustrativas generadas** y el sitio muestra un aviso explícito. Sustituye las imágenes por tus fotos y entonces retira el aviso de galería y revisa los textos `alt` en `website/src/content.js`.

En `website/src/content.js` también puedes editar el nombre, teléfono `999 766 6778`, dirección cuando la tengas, Instagram/Facebook, textos y categorías de servicio. **No se inventaron reseñas ni dirección ni precios.**

## Qué cambia y qué sigue pendiente

**Incluido:** sitio comercial responsive, animaciones con GSAP/ScrollTrigger + Lenis en escritorio, navegación móvil, fotografías provisionales, galería ampliable, WhatsApp, FAQ, SEO básico, botones a la app real `/reservar/`, icono original de Agenda Bella en el sitio y en la PWA, la v3.1 original intacta, compilación web conjunta.

**Pendiente:** probar publicación real en tu cuenta Cloudflare, revisar operación en varios teléfonos, configurar fotos reales, domicilio y redes, revisar aviso de privacidad y políticas con el negocio, configurar WhatsApp Business API para recordatorios (los enlaces normales de WhatsApp sí funcionan, los recordatorios automáticos no se activan por publicar la web) y Web Push según el proyecto original.

## Para desarrollar en computadora

```bash
npm install
npm run build:site
npm run preview -- --host 0.0.0.0
```

Visita `http://localhost:4173/` para la web, y `http://localhost:4173/reservar/` para la app. Necesitarás variables VITE de Supabase durante el **build** para que la app se conecte (puedes colocarlas en `.env.local` de la raíz, sin subir ese archivo a GitHub).

`npm run dev:site` sirve para trabajar solo en el diseño comercial. Para probar el enlace `/reservar/` localmente, usa el build conjunto `npm run build:site` + `npm run preview`.

## Diagnóstico rápido

- **Sitio web bien pero app dice “Reservaciones no disponibles”**: faltan las dos variables `VITE_SUPABASE_*` en Cloudflare Pages o debes volver a desplegar tras agregarlas.
- **404 al entrar a `/reservar/`**: revisa que Build command sea `npm run build:site` y que exista la carpeta `dist/reservar` tras compilar.
- **Página en blanco**: revisa los logs de build y la consola del navegador; no cambies el build command a `npm run build` porque ese compila únicamente la app vieja en la raíz.
- **Enlace abre el sitio pero no la app**: el enlace debe llevar a `/reservar/` con barra final.
- **Falla el inicio de sesión admin**: verifica que `staff_users`, RLS y la activación ya estén configurados en la base (como venías haciendo); NO publiques ninguna clave privada.

