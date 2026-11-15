# Inicio rápido · Agenda Bella v2 Premium

Esta versión **sí implementa la interfaz rosa de la imagen elegida** usando React. Contiene la pantalla de reservación y el panel de tu mamá. El ZIP es código fuente, no una IPA ya firmada.

## Subir la nueva versión a GitHub

Sigue `COMO_SUBIR_V2.md`. Si ya tenías el repositorio anterior, solo necesitas los archivos nuevos de `src/` (también ofrecemos ZIP de actualización). Si aún no existe un workflow, sigue `GITHUB_Y_IPHONE.md` para crear `.github/workflows/ios-ipa.yml` desde GitHub.

## Probarla en la PC

Instala Node.js 22, descomprime el ZIP y ejecuta en esa carpeta:

```sh
npm install
npm run check
npm run dev
```

Abre la dirección localhost que indique Vite. Para preparar la publicación: `npm run build`.

## Aviso de funcionamiento

- Sin Supabase: solo modo demo, con citas guardadas en el mismo dispositivo.
- Con Supabase: agenda compartida y horarios en tiempo real (sigue `README.md`).
- WhatsApp automático: requiere configurar Meta Cloud API y la función programada en Supabase.
- Notificaciones web: requieren claves Web Push, HTTPS, permisos y configuración; en la IPA las notificaciones nativas aún requieren APNs.

Los servicios y precios incluidos son de ejemplo. No compartas la app con clientas reales sin conectar la base de datos, personalizar el salón y completar el aviso de privacidad.
