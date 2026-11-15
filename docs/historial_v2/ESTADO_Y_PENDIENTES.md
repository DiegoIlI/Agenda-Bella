# Auditoría breve del proyecto v2.1 entregado a Claude

## Ya presente en el código fuente
- React/Vite + responsive CSS; entrada `src/main.jsx` importa `src/PremiumApp.jsx`.
- Vista pública de servicios, calendario, franjas horarias, formulario de citas, comprobante, WhatsApp de contacto.
- Panel de la dueña con secciones para agenda, clientas, servicios y ajustes; intento de autenticación Supabase.
- Modo demostración local con `localStorage`, datos de prueba, servicios configurables y lógica para impedir cruces.
- SQL de Supabase con tablas, RLS, RPC de citas/horarios, exclusión de franjas traslapadas.
- Edge Function de recordatorios WhatsApp / push (NO configurada, NO probada end-to-end).
- PWA (`public/manifest.webmanifest`, `public/sw.js`) y Capacitor para iOS, workflow GitHub Actions para generar IPA sin firmar.
- La referencia visual solicitada y tres capturas reales del estado actual.

## Pendientes importantes para Claude
1. Terminar fidelidad visual de las dos pantallas al mockup, compactar escala iPhone y corregir safe area del header/menú.
2. Activar y ensayar base de datos real; desactivar reservas en modo demo de producción; validar acceso admin en dos dispositivos.
3. Revisar y probar SQL/RLS y concurrencia en condiciones reales, además de idempotencia de migraciones.
4. Implementar/ensayar recordatorios reales por Meta y push según limitaciones de iOS/SideStore; consentimientos, cron, retry, logs.
5. QA real de build, pruebas manuales y pipeline IPA; actualmente el código solo pasó validación de presencia/sintaxis limitada.
6. Verificar contenidos legales y privacidad para uso con clientes reales.
7. Confirmar precios, horarios y marca con la dueña: los de ejemplo son DEMO, no cotizaciones finales.

## Número del salón (dato provisto)
`9997666778` (formato local 10 dígitos); `529997666778` en wa.me.
No confundir teléfono comercial con remitente habilitado en Meta Cloud API: el sender real debe aprobarse/configurarse en Meta.
