# AGENDA BELLA — ENTREGA PARA CLAUDE

**Archivo principal:** `PROMPT_PARA_CLAUDE.md` (cópialo y pégalo a Claude junto con este ZIP).

**Fuente del proyecto que debe editar Claude:** la RAÍZ de esta carpeta, donde están `package.json`, `src/`, `supabase/`, `public/` y `.github/`. Es la v2.1 derivada del proyecto v2 que ya se está viendo en iPhone.

**Referencia visual obligatoria:** `REFERENCIAS_VISUALES/01_DISENO_OBJETIVO_DOS_IPHONE.jpeg`; otras tres capturas muestran la versión actual que ya está instalada y los problemas observados.

**WhatsApp del salón:** 999 766 6778 (México) → https://wa.me/529997666778. Ya está configurado por defecto en la DEMO (`src/api.js`) y en el seed de la migración original. Para una base de Supabase que ya exista, ejecutar `supabase/migrations/002_telefono_salon.sql` o ajustar el número manualmente desde el panel (si el acceso admin ya funciona).

**Estado honesto:** la interfaz clienta y módulos administrativos tienen código implementado, pero todavía requieren validación funcional en producción. Las citas sincronizadas necesitan Supabase configurado. Los recordatorios reales requieren Meta/plantillas + credenciales VAPID/Push + CRON; el acceso de admin debe configurarse. No se entrega una IPA precompilada, solo el workflow para producirla. `npm run check` verifica presencia de archivos pero no equivale a compilar.

**NO** utilizar `HISTORIAL_NO_UTILIZAR_PARA_COMPILAR` como fuente de compilación. No incluir secretos privados en el chat/ZIP/repositorio.
